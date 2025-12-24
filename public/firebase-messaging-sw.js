// Service Worker for Firebase Cloud Messaging (FCM) Push Notifications
// This allows notifications to work even when the browser is closed

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase configuration (must match firebaseConfig.js)
const firebaseConfig = {
  apiKey: "AIzaSyDcsC8bc2YhHZTYf6KfLAQkPCpCO-p_-7E",
  authDomain: "mybubiiapp.firebaseapp.com",
  projectId: "mybubiiapp",
  storageBucket: "mybubiiapp.firebasestorage.app",
  messagingSenderId: "252209352860",
  appId: "1:252209352860:web:9aaaecbc5e12e331b49d59",
  measurementId: "G-LYWGPS09HC"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'MyBubiAPP';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.data?.type || 'default',
    data: payload.data || {},
    requireInteraction: true, // Keep notification visible until user interacts
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

