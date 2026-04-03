importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBweuQ__EmDQy9YlIICiA383jwa_WXOjTg',
  authDomain: 'revolta-36759.firebaseapp.com',
  projectId: 'revolta-36759',
  storageBucket: 'revolta-36759.firebasestorage.app',
  messagingSenderId: '115123454522',
  appId: '1:115123454522:web:8b68cc0d7d9b6bf708eb03',
});

const messaging = firebase.messaging();

// إشعارات الخلفية (لما التطبيق مغلق أو مخفي)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'TEAM REVOLTA', {
    body: body || '',
    icon: icon || '/assets/apple-touch-icon.png',
    badge: '/assets/apple-touch-icon.png',
    dir: 'rtl',
    lang: 'ar',
    data: payload.data,
  });
});

// فتح التطبيق عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
