// ==================== MyScore Service Worker ====================
var CACHE_NAME = 'myscore-v560b';

var APP_SHELL = [
    '/',
    '/index.html',
    '/style.css?v=560b',
    '/logo2.svg',
    '/manifest.json',
    '/js/main.js?v=560b',
    '/js/config.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/dashboard.js',
    '/js/entry.js',
    '/js/custom.js',
    '/js/pet.js',
    '/js/info.js',
    '/js/tutuer.js',
    '/js/report.js',
    '/js/auth.js',
    '/js/ai.js',
    '/js/gamification.js'
];

// ==================== Install ====================
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// ==================== Activate ====================
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (name) {
                    return name !== CACHE_NAME;
                }).map(function (name) {
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

// ==================== Fetch ====================
self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    // 只处理 GET 请求
    if (event.request.method !== 'GET') return;

    // API 请求不缓存
    if (url.pathname.startsWith('/api/')) return;

    // CDN 资源：Network First
    if (url.hostname === 'cdn.jsdelivr.net' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            fetch(event.request).then(function (response) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(function () {
                return caches.match(event.request).then(function (cached) {
                    return cached || new Response('', { status: 503, statusText: 'Service Unavailable' });
                });
            })
        );
        return;
    }

    // index.html：Network First（确保拿到最新版本）
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(event.request).then(function (response) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(function () {
                return caches.match(event.request).then(function (cached) {
                    return cached || new Response('', { status: 503, statusText: 'Service Unavailable' });
                });
            })
        );
        return;
    }

    // 其他同源资源：Cache First
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then(function (cached) {
                if (cached) return cached;
                return fetch(event.request).then(function (response) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, clone);
                    });
                    return response;
                }).catch(function () {
                    return new Response('', { status: 404, statusText: 'Not Found' });
                });
            })
        );
    }
});
