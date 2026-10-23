const CACHE = 'doom-like-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/engine.js',
  './js/player.js',
  './js/enemies.js',
  './js/input.js',
  './js/map.js',
  './js/db.js',
  './js/audio.js',
  './js/levels.js',
  './maps/e1m1.json',
  './maps/e1m2.json',
  './maps/e1m3.json',
  './maps/e1m4.json',
  './maps/e1m5.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      if (e.request.url.includes('/maps/')) {
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
