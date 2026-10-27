const VER = 'krf-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER).then(c => {
      return Promise.allSettled(
        SHELL.map(url => c.add(url).catch(err => console.warn('Cache failed for', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App pages: network first, fall back to cache when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const c = r.clone();
        caches.open(VER).then(x => x.put('./index.html', c));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fonts and same-origin assets
  if (url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) {
            const c = r.clone();
            caches.open(VER).then(x => x.put(req, c));
          }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
