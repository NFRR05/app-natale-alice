// Service Worker per gestire le notifiche push con FCM
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// Configurazione Firebase (verrà inizializzata dal client)
let messaging = null

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...')
  event.waitUntil(self.clients.claim())
})

// Gestisce le notifiche quando vengono cliccate
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  event.notification.close()
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se c'è già una finestra aperta, focus su quella
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus()
        }
      }
      // Altrimenti apri una nuova finestra
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Messaggio dal client per mostrare una notifica locale
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title, options)
  } else if (event.data && event.data.type === 'INIT_FIREBASE') {
    // Inizializza Firebase con la configurazione passata dal client
    try {
      if (typeof firebase !== 'undefined') {
        firebase.initializeApp(event.data.config)
        messaging = firebase.messaging()
        
        // Gestisce i messaggi in background
        messaging.onBackgroundMessage((payload) => {
          console.log('[SW] Received background message:', payload)
          const notificationTitle = payload.notification?.title || 'Nuova notifica'
          const notificationOptions = {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/favicon.svg',
            badge: '/favicon.svg',
            tag: payload.data?.tag || 'notification',
            data: payload.data
          }
          
          return self.registration.showNotification(notificationTitle, notificationOptions)
        })
        
        console.log('[SW] Firebase initialized in Service Worker')
      }
    } catch (error) {
      console.error('[SW] Error initializing Firebase:', error)
    }
  }
})

// Gestisce i messaggi push FCM
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event)
  
  let notificationData = {
    title: 'Nuova notifica',
    body: 'Hai ricevuto una nuova notifica',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'push-notification'
  }
  
  if (event.data) {
    try {
      const payload = event.data.json()
      notificationData = {
        title: payload.notification?.title || notificationData.title,
        body: payload.notification?.body || notificationData.body,
        icon: payload.notification?.icon || notificationData.icon,
        badge: '/favicon.svg',
        tag: payload.data?.tag || notificationData.tag,
        data: payload.data
      }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e)
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

