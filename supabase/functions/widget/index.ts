// Forma · résumé pour le widget iPhone (Scriptable). Lecture seule, protégé par la clé du widget (en-tête x-widget-key).
// La clé est créée dans Forma (Réglages → Widget iPhone) et rangée dans les données du compte ; « Changer la clé » rend l'ancienne inutile.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { summarize } from './summary.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

function localNow(zone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

Deno.serve(async req => {
  const key = req.headers.get('x-widget-key') ?? ''
  if (!/^[a-f0-9]{40}$/.test(key)) return json({ error: 'Clé manquante ou invalide' }, 401)
  const { data: rows, error } = await admin.from('user_data').select('user_id, data').eq('data->>widgetKey', key).limit(1)
  if (error) return json({ error: 'Indisponible' }, 500)
  const data = rows?.[0]?.data
  if (!data) return json({ error: 'Clé inconnue : copie à nouveau le script depuis Forma' }, 401)
  const { data: sub } = await admin.from('push_subscriptions').select('time_zone').eq('user_id', rows[0].user_id).limit(1)
  const zone = data.timeZone || sub?.[0]?.time_zone || 'Asia/Kuala_Lumpur'
  const { day, time } = localNow(zone)
  return json(summarize(data, day, time))
})
