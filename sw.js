const CACHE_NAME = 'bellyhaven-v20';
const TTS_CACHE_NAME = 'bellyhaven-tts-assets-v1';
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
  './js/piper-worker.js',
  './js/weight-tracker.js',
  './js/birth-plan.js',
  './js/blossom-paywall.js',
  './js/app.js'
];

const TTS_ASSET_EXTENSIONS = ['.wasm', '.onnx', '.onnx.json', '.json', '.data', '.js', '.mjs'];

function isNeuralTtsUrl(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    const trustedHost =
      host === 'cdn.jsdelivr.net' ||
      host === 'cdnjs.cloudflare.com' ||
      host === 'huggingface.co' ||
      host.endsWith('.hf.co') ||
      parsed.origin === self.location.origin;

    if (!trustedHost) return false;
    if (path.endsWith('/+esm')) return true;
    return TTS_ASSET_EXTENSIONS.some((ext) => path.endsWith(ext)) && parsed.origin !== self.location.origin;
  } catch (_) {
    return false;
  }
}

function getNormalizedTtsMime(requestUrl, currentType) {
  try {
    const path = new URL(requestUrl).pathname.toLowerCase();
    if (path.endsWith('.wasm')) return 'application/wasm';
    if (path.endsWith('.onnx') || path.endsWith('.data')) return 'application/octet-stream';
    if (path.endsWith('.json')) return 'application/json';
    if (path.endsWith('.mjs') || path.endsWith('.js') || path.endsWith('/+esm')) {
      return 'application/javascript; charset=utf-8';
    }
  } catch (_) {
    // Ignore URL parse error
  }
  return currentType || 'application/octet-stream';
}

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
          .filter((key) => key !== CACHE_NAME && key !== TTS_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isNeuralTtsUrl(event.request.url)) {
    event.respondWith(
      caches.open(TTS_CACHE_NAME).then((ttsCache) =>
        ttsCache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            const expectedMime = getNormalizedTtsMime(event.request.url, response.headers.get('Content-Type'));
            const currentMime = (response.headers.get('Content-Type') || '').toLowerCase();
            if (currentMime.startsWith(expectedMime.split(';')[0])) {
              event.waitUntil(ttsCache.put(event.request, response.clone()).catch(() => {}));
            } else {
              const headers = new Headers(response.headers);
              headers.set('Content-Type', expectedMime);
              event.waitUntil(
                response.clone().arrayBuffer().then((buf) =>
                  ttsCache.put(
                    event.request,
                    new Response(buf, {
                      status: response.status,
                      statusText: response.statusText,
                      headers
                    })
                  )
                ).catch(() => {})
              );
            }
            return response;
          });
        })
      )
    );
    return;
  }

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
