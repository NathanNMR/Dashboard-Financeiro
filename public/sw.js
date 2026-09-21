// Cache apenas do app-shell público. Requisições da API e respostas
// autenticadas/financeiras nunca são armazenadas no Cache Storage.
const CACHE_NAME = "smartfinance-shell-v2";
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isApi = url.pathname.startsWith("/api/") || url.pathname.includes("/backend/api/");
  const hasAuth = request.headers.has("Authorization");

  if (!isSameOrigin || isApi || hasAuth) return;

  // Navegação: network-first com fallback para o shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Somente assets públicos do próprio site entram no cache.
  if (url.pathname.startsWith("/_next/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
  }
});
