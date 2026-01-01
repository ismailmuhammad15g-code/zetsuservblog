// Service Worker for Push Notifications
const CACHE_NAME = 'zersu-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  let data = {
    title: 'Zersu Challenge',
    body: 'حان وقت التحدي! 🎮',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'zersu-notification',
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'فتح التحدي 🎯' },
      { action: 'dismiss', title: 'لاحقاً' }
    ],
    data: {
      url: '/zetsuchallenge/active-tasks'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/zetsuchallenge/active-tasks';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window
      for (const client of clientList) {
        if (client.url.includes('/zetsuchallenge') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for scheduled notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-scheduled-tasks') {
    event.waitUntil(checkScheduledTasks());
  }
});

async function checkScheduledTasks() {
  // This would ideally check with the server for any due tasks
  console.log('Checking scheduled tasks...');
}
