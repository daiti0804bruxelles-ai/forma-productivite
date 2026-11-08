import { supabase } from './lib/supabase'
import { currentDayKey, deviceTimeZone } from './timeZone'

/** Notifications push de cet appareil (abonnement stocké dans Supabase, envoi par la fonction « notifications »). */
export type NotificationPrefs = { beforeEvent?: boolean; evening?: boolean; morning?: boolean }
export const isNotificationPrefs = (value: unknown): value is NotificationPrefs =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.entries(value).every(([key, v]) => ['beforeEvent', 'evening', 'morning'].includes(key) && typeof v === 'boolean')

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const deviceLabel = () => isIOS() ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android' : 'Ordinateur'

const toKey = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

export async function enablePush(userId: string) {
  if (await Notification.requestPermission() !== 'granted') throw new Error('permission')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const { data, error } = await supabase.functions.invoke('notifications', { body: { action: 'public-key' } })
  if (error || !data?.publicKey) throw error ?? new Error('Clé indisponible')
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(data.publicKey) })
  const json = subscription.toJSON()
  const { error: saveError } = await supabase.from('push_subscriptions').upsert({
    user_id: userId, endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth,
    device: deviceLabel(), time_zone: deviceTimeZone(),
  }, { onConflict: 'endpoint' })
  if (saveError) throw saveError
  return subscription
}

export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

export async function sendTestNotification(endpoint: string) {
  const { data, error } = await supabase.functions.invoke('notifications', { body: { action: 'test', endpoint, day: currentDayKey() } })
  if (error) throw error
  return data as { devices: number; sent: number }
}
