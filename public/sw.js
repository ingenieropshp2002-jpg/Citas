// Service worker de Registro Citas: permite instalar la app y muestra una página sin conexión.
const CACHE = 'rc-v2';
const OFFLINE = '/sin-conexion';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll([OFFLINE, '/icons/icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match(OFFLINE))); return; }
  const u = new URL(r.url);
  if (u.origin === location.origin && (u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/icons/'))) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })));
  }
});

// Avisos push del panel (reservas, cancelaciones y abonos), con el sonido de notificación del teléfono.
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Registro Citas', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Registro Citas', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: d.tag, renotify: !!d.tag,
    silent: false, vibrate: [200, 100, 200], requireInteraction: false, data: { url: d.url || '/panel/agenda' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/panel', self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.startsWith(self.location.origin + '/panel') && 'focus' in w) { w.navigate(url); return w.focus(); }
    return clients.openWindow(url);
  }));
});
