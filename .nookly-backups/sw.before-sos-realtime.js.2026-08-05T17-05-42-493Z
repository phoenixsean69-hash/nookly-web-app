// public/sw.js
self.addEventListener('install', (event) => {
  console.log('🔔 Service Worker installed');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('🔔 Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('📨 Push notification received:', event.data?.text());
  
  let notificationData = {
    title: '🏠 New Property Request',
    body: 'Someone is requesting information about a property',
    icon: '/logo-192.png',
    badge: '/badge-icon.png',
    data: {
      url: '/dashboard/messages'
    }
  };

  try {
    if (event.data) {
      notificationData = { ...notificationData, ...JSON.parse(event.data.text()) };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      {
        action: 'view',
        title: 'View Request 📋'
      },
      {
        action: 'close',
        title: 'Dismiss ❌'
      }
    ],
    tag: 'property-request',
    renotify: true,
    requireInteraction: true,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/dashboard/messages';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});