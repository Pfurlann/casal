/** Shell estático para abrir offline. Nunca guarda extrato, sessão nem resposta de API. */
const CACHE = "casal-v51-shell";
const SHELL = ["/", "/manifest.json", "/entrar"];

function ePedidoSensivel(url) {
  const u = new URL(url);
  if (u.origin !== self.location.origin) return true;
  if (u.pathname.startsWith("/api")) return true;
  if (u.hostname.includes("supabase")) return true;
  return false;
}

function eAssetEstatico(url) {
  const u = new URL(url);
  return (
    u.origin === self.location.origin &&
    (u.pathname.startsWith("/_next/static/") ||
      u.pathname.endsWith(".js") ||
      u.pathname.endsWith(".css") ||
      u.pathname.endsWith(".woff2") ||
      u.pathname.endsWith(".png") ||
      u.pathname.endsWith(".svg") ||
      u.pathname.endsWith(".ico") ||
      u.pathname === "/manifest.json")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;
  if (ePedidoSensivel(url)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copia = res.clone();
          if (res.ok) {
            void caches.open(CACHE).then((c) => c.put("/", copia).catch(() => undefined));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  if (eAssetEstatico(url)) {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const copia = res.clone();
            void caches.open(CACHE).then((c) => c.put(event.request, copia).catch(() => undefined));
          }
          return res;
        });
      }),
    );
  }
});
