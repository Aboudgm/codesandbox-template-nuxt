const CACHE_NAME = 'nexus-ai-v2'
const STATIC_ASSETS = ['/', '/index.html']

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // API calls: network only, don't cache
    return
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => caches.match('/index.html'))
    })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'NEXUS AI', {
      body: data.body || 'Task update',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'nexus-update',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data?.url || '/'
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'task-poll') {
    // The main app will handle actual polling; this just keeps the SW alive
    event.waitUntil(Promise.resolve())
  }
})
