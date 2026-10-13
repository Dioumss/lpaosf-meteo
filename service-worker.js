// ============================================
// service-worker.js — Mode hors ligne
// - Coquille de l'application : réseau d'abord (les mises à jour arrivent
//   tout de suite), cache en secours hors ligne.
// - Fonds de carte et Leaflet : cache d'abord, rafraîchi en arrière-plan.
// - API Open-Meteo : jamais mise en cache ici (app.js gère son propre cache
//   horodaté, pour pouvoir afficher l'âge des données).
// ============================================

const VERSION = 'v2.0.0';
const SHELL_CACHE = `lpaosf-shell-${VERSION}`;
const RUNTIME_CACHE = `lpaosf-runtime-${VERSION}`;
const MAX_RUNTIME_ENTRIES = 300;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/api.js',
  './js/map.js',
  './js/config.js',
  './assets/regions.geojson',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('./index.html');
    throw new Error('Hors ligne');
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then(res => {
    if (res.ok || res.type === 'opaque') {
      cache.put(event.request, res.clone()).then(() => trim(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    }
    return res;
  });
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname.endsWith('open-meteo.com')) return; // réseau direct

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.hostname === 'unpkg.com') {
    event.respondWith(staleWhileRevalidate(event));
  }
});
