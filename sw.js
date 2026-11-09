// Guarda la app para que abra sin conexión. Sube VERSION cuando cambies archivos.
const VERSION = "macros-v6";
const SHELL = ["./", "index.html", "styles.css", "app.js", "manifest.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // La API de Claude nunca se cachea.
  if (url.hostname === "api.anthropic.com") return;
  // Red primero para la app (así recibes actualizaciones), caché si no hay señal.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname === "cdn.jsdelivr.net")) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
