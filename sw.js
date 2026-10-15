// sw.js - MisMonedas v4.2.0
const CACHE_NAME = 'mismonedas-cache-v1'; // ️ Nuevo nombre para empezar limpio

const STATIC_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './styles.css',
    './manifest.json',
    './js/app.js',
    './js/config.js',
    './js/modules/api.js',
    './js/modules/converter.js',
    './js/modules/ui.js',
    './js/modules/storage.js',
    './js/modules/utils.js',
    './js/modules/clock.js',
    './js/modules/weather.js',
    './js/modules/greeting.js',
    './js/modules/theme.js',
    './js/modules/stats.js',
    './js/modules/gold.js',
    './js/modules/news.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Instalar (Solución robusta: tolera fallos individuales en los recursos)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const asset of STATIC_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (error) {
                    console.warn(`⚠️ No se pudo cachear el recurso: ${asset}`, error);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

// 2. Activar y limpiar cachés viejas
self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

// 3. Interceptar peticiones
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    // Identificar si es una petición a una API de datos o al Worker de noticias
    const isApiRequest = request.url.includes('dolarapi.com') || 
                         request.url.includes('open-meteo.com') || 
                         request.url.includes('gold-api.com') ||
                         request.url.includes('exchangerate-api.com') ||
                         request.url.includes('jairo-news-api');

    if (isApiRequest || request.mode === 'navigate') {
        // ESTRATEGIA: Network First (Red primero) para datos dinámicos
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    // ✅ DEFENSA: Solo clonar si la respuesta es válida (200) y el cuerpo NO ha sido usado
                    if (networkResponse && networkResponse.status === 200 && !networkResponse.bodyUsed) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Si NO hay internet, caemos al caché guardado
                    return caches.match(request);
                })
        );
    } else {
        // ESTRATEGIA: Stale-While-Revalidate para archivos estáticos (CSS, JS, Imágenes)
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    // ✅ DEFENSA: Mismo chequeo de seguridad antes de clonar
                    if (networkResponse && networkResponse.status === 200 && !networkResponse.bodyUsed) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);
                
                // Devolvemos el caché inmediatamente (velocidad), y actualizamos en segundo plano
                return cachedResponse || fetchPromise;
            })
        );
    }
});