// Cabo Block: offline cache. Bei jeder Änderung an den Dateien VERSION hochzählen.
const VERSION = "cabo-block-4";
const FONTS = VERSION + "-fonts";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App-Seite: sofort aus dem Cache, im Hintergrund aktualisieren
  if (req.mode === "navigate") {
    e.respondWith(caches.open(VERSION).then((c) => c.match("./index.html").then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok) c.put("./index.html", res.clone()); return res; })
        .catch(() => hit);
      e.waitUntil(net.catch(() => {}));
      return hit || net;
    })));
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  // Schriften von Google Fonts beim ersten Online-Start merken
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit ||
      fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
  }
});
