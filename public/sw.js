// MedAPS Pro — Service Worker
// Cache name versionado: bumpar a versão sempre que mudar a estratégia.

const CACHE_NAME = 'medaps-pro-v1'
const OFFLINE_URL = '/offline.html'

// Recursos pré-cacheados no install: precisamos do offline.html disponível
// imediatamente para que o fallback funcione já no primeiro carregamento.
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => undefined),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  )
  self.clients.claim()
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|webp|gif|ico)$/.test(url.pathname)
  )
}

function isApiCall(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.endsWith('.supabase.co')
  )
}

// Cache-first: tenta o cache, e busca da rede como fallback (e atualiza cache).
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      cache.put(request, fresh.clone()).catch(() => undefined)
    }
    return fresh
  } catch (err) {
    if (cached) return cached
    throw err
  }
}

// Network-first: tenta rede; se falhar, retorna do cache. Para APIs, NÃO
// armazenamos respostas (preserva comportamento dinâmico/auth).
async function networkFirst(request) {
  try {
    return await fetch(request)
  } catch (err) {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

// Navegações (HTML): network-first com fallback para offline.html.
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, fresh.clone()).catch(() => undefined)
    return fresh
  } catch (err) {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  // Apenas mesma origem para cache; cross-origin segue o caminho padrão.
  if (url.origin !== self.location.origin && !isApiCall(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  if (isApiCall(url)) {
    event.respondWith(networkFirst(request))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }
})
