// Forma · Envoi des notifications (Supabase Edge Function).
// - Appelée toutes les 5 minutes par pg_cron (en-tête x-cron-secret) : calcule et envoie les rappels dus.
// - Appelée par l'app avec la session de l'utilisateur : { action: 'public-key' } ou { action: 'test' }.
// Les clés VAPID sont générées au premier appel et gardées dans public.push_config (lisible seulement côté serveur).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { dueReminders, localNow, type FormaData, type Reminder } from './reminders.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function config(key: string) {
  const { data } = await admin.from('push_config').select('value').eq('key', key).maybeSingle()
  return data?.value as string | undefined
}
async function vapid() {
  let publicKey = await config('vapid_public'), privateKey = await config('vapid_private')
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys()
    // ignoreDuplicates : si deux appels simultanés, on garde la première paire.
    await admin.from('push_config').upsert([{ key: 'vapid_public', value: keys.publicKey }, { key: 'vapid_private', value: keys.privateKey }], { onConflict: 'key', ignoreDuplicates: true })
    publicKey = await config('vapid_public'); privateKey = await config('vapid_private')
  }
  webpush.setVapidDetails('mailto:notifications@forma.app', publicKey!, privateKey!)
  return publicKey!
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; time_zone: string | null }
async function send(sub: Sub, r: Pick<Reminder, 'title' | 'body' | 'url' | 'tag'>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(r), { TTL: 3600, urgency: 'high' })
    return true
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id) // appareil désabonné
    console.error('Envoi impossible', status, (error as Error).message)
    return false
  }
}

async function tick() {
  await vapid()
  const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth, time_zone')
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  if (!byUser.size) return { users: 0, sent: 0 }
  const { data: rows } = await admin.from('user_data').select('user_id, data').in('user_id', [...byUser.keys()])
  let sent = 0
  for (const row of rows ?? []) {
    const data = row.data as FormaData
    const devices = byUser.get(row.user_id) ?? []
    const zone = data.timeZone || devices[0]?.time_zone || 'Asia/Kuala_Lumpur'
    const { day, time } = localNow(new Date(), zone)
    for (const reminder of dueReminders(data, day, time)) {
      // Réserve la clé d'abord : si elle existe déjà, ce rappel est déjà parti.
      const { error } = await admin.from('push_sent').insert({ user_id: row.user_id, key: reminder.dedupeKey })
      if (error) continue
      for (const device of devices) if (await send(device, reminder)) sent++
    }
  }
  // Ménage : on oublie les rappels envoyés il y a plus de 3 jours.
  await admin.from('push_sent').delete().lt('sent_at', new Date(Date.now() - 3 * 86400000).toISOString())
  return { users: byUser.size, sent }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const body = await req.json().catch(() => ({})) as { action?: string; endpoint?: string }
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret) {
    if (cronSecret !== await config('cron_secret')) return json({ error: 'forbidden' }, 403)
    return json(await tick())
  }
  // Appels de l'app : session obligatoire.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  if (!auth.user) return json({ error: 'Connexion requise' }, 401)
  if (body.action === 'public-key') return json({ publicKey: await vapid() })
  if (body.action === 'test') {
    await vapid()
    let query = admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth, time_zone').eq('user_id', auth.user.id)
    if (body.endpoint) query = query.eq('endpoint', body.endpoint)
    const { data: devices } = await query
    let ok = 0
    for (const d of (devices ?? []) as Sub[]) if (await send(d, { title: 'Forma', body: 'Les notifications fonctionnent sur cet appareil ✓', url: '/', tag: 'test' })) ok++
    return json({ devices: devices?.length ?? 0, sent: ok })
  }
  return json({ error: 'Action inconnue' }, 400)
})
