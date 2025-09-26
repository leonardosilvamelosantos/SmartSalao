/**
 * Service Worker para Cache Inteligente
 * Implementa estratégias de cache para melhorar performance
 */

const CACHE_NAME = 'barbeiros-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Recursos críticos para cache imediato
const CRITICAL_RESOURCES = [
    '/',
    '/frontend/index.html',
    '/frontend/css/main.css',
    '/frontend/css/dark-mode.css',
    '/frontend/css/notifications.css',
    '/frontend/js/main.js',
    '/frontend/js/core/api.js',
    '/frontend/js/notification-manager.js',
    '/frontend/assets/logo.png'
];

// Recursos para cache sob demanda
const CACHE_PATTERNS = [
    /\.css$/,
    /\.js$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.webp$/,
    /\.svg$/
];

// Instalar Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Cacheando recursos críticos');
                return cache.addAll(CRITICAL_RESOURCES);
            })
            .then(() => {
                console.log('Service Worker: Instalado com sucesso');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Erro na instalação:', error);
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Ativado com sucesso');
                return self.clients.claim();
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não-GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorar requisições de API (deixar para o servidor)
    if (url.pathname.startsWith('/api/')) {
        return;
    }
    
    // Estratégia de cache baseada no tipo de recurso
    if (isStaticResource(request.url)) {
        event.respondWith(cacheFirst(request));
    } else if (isHTMLRequest(request)) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Estratégia: Cache First (para recursos estáticos)
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Cache First falhou:', error);
        return new Response('Recurso não disponível', { status: 404 });
    }
}

// Estratégia: Network First (para HTML)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Página não disponível offline', { status: 404 });
    }
}

// Estratégia: Stale While Revalidate (para outros recursos)
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// Verificar se é recurso estático
function isStaticResource(url) {
    return CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// Verificar se é requisição HTML
function isHTMLRequest(request) {
    return request.headers.get('accept')?.includes('text/html');
}

// Limpar cache antigo periodicamente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Background sync para requisições offline
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Implementar sincronização em background
    console.log('Service Worker: Executando sincronização em background');
}
