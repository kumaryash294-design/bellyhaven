const CACHE_NAME = 'bellyhaven-v18';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/milestones/poppy-seed.svg',
  './icons/milestones/sesame-seed.svg',
  './icons/milestones/lentil.svg',
  './icons/milestones/blueberry.svg',
  './icons/milestones/raspberry.svg',
  './icons/milestones/cherry.svg',
  './icons/milestones/strawberry.svg',
  './icons/milestones/fig.svg',
  './icons/milestones/plum.svg',
  './icons/milestones/peach.svg',
  './icons/milestones/lemon.svg',
  './icons/milestones/apple.svg',
  './icons/milestones/avocado.svg',
  './icons/milestones/pear.svg',
  './icons/milestones/bell-pepper.svg',
  './icons/milestones/mango.svg',
  './icons/milestones/banana.svg',
  './icons/milestones/carrot.svg',
  './icons/milestones/sweet-potato.svg',
  './icons/milestones/grapefruit.svg',
  './icons/milestones/ear-of-corn.svg',
  './icons/milestones/cantaloupe.svg',
  './icons/milestones/lettuce-head.svg',
  './icons/milestones/rutabaga.svg',
  './icons/milestones/eggplant.svg',
  './icons/milestones/acorn-squash.svg',
  './icons/milestones/cabbage.svg',
  './icons/milestones/coconut.svg',
  './icons/milestones/pineapple.svg',
  './icons/milestones/celery-bunch.svg',
  './icons/milestones/honeydew.svg',
  './icons/milestones/butternut-squash.svg',
  './icons/milestones/papaya.svg',
  './icons/milestones/winter-melon.svg',
  './icons/milestones/small-pumpkin.svg',
  './icons/milestones/mini-watermelon.svg',
  './icons/milestones/watermelon.svg',
  './icons/milestones/large-watermelon.svg',
  './icons/milestones/jackfruit.svg',
  './css/styles.css',
  './js/calculations.js',
  './js/storage.js',
  './js/ai-doula.js',
  './js/care-plan.js',
  './js/sound-machine.js',
  './js/baby-notes.js',
  './js/weight-tracker.js',
  './js/birth-plan.js',
  './js/blossom-paywall.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });
    })
  );
});
