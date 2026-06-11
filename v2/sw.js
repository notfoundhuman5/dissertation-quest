/* Dissertation Quest V2 — Service Worker
   Bei jedem Update von index.html die VERSION hochzählen,
   damit installierte Apps die neue Version laden. */
const VERSION = 'gow-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API-Calls (Apps Script) nie cachen
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) return;

  // App-Start: Netz zuerst (Updates), Cache als Fallback (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Alles andere (Icons, Fonts): Cache zuerst, dann Netz + nachcachen
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok && (url.origin === location.origin || url.hostname.includes('fonts.'))) {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return r;
    }))
  );
});
