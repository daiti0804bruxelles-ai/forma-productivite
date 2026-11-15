// Forma · service worker : reçoit les notifications et ouvre l'app au toucher.
// Aucun cache : l'app reste toujours à jour.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  const important = Boolean(data.important)
  event.waitUntil(self.registration.showNotification(data.title || 'Forma', {
    body: data.body || '',
    tag: data.tag || undefined,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/', memoId: data.memoId },
    // « À ne pas oublier » : reste affichée jusqu'à une action (ordinateur, Android), vibre, et propose Fait / Plus tard.
    ...(important ? {
      requireInteraction: true, renotify: true, vibrate: [300, 120, 300, 120, 600],
      actions: data.memoId ? [{ action: 'done', title: '✓ Fait' }, { action: 'snooze', title: 'Dans 1 h' }] : [],
    } : {}),
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const info = event.notification.data || {}
  let url = info.url || '/'
  if (info.memoId) url = `/?memo=${encodeURIComponent(info.memoId)}${event.action ? `&do=${event.action}` : ''}`
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if ('focus' in client) { client.navigate(url).catch(() => {}); return client.focus() }
    return self.clients.openWindow(url)
  }))
})
