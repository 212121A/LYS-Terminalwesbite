/* LYS Terminal Service Worker — Bild-Cache für den Kiosk.
 *
 * Strategie: Stale-While-Revalidate nur für /menu-images/*.
 *   - Erster Aufruf: aus dem Netz, landet im Cache.
 *   - Danach: sofort aus dem Cache (instant + offline-fähig), parallel wird
 *     im Hintergrund eine frische Kopie geholt und der Cache aktualisiert.
 *   - Bild ausgetauscht (gleicher Dateiname)? Spätestens beim übernächsten
 *     Laden aktuell. Komplett-Invalidierung: CACHE-Version unten hochzählen.
 *
 * Alles außer /menu-images/ wird NICHT angefasst (kein Risiko fürs App-Shell;
 * HTML/JS regelt Vercel via Cache-Control selbst).
 */
const CACHE = "lys-menu-img-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("lys-menu-img-") && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/menu-images/")) {
    return; // Standardverhalten des Browsers
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      // Cache zuerst (schnell/offline); sonst aufs Netz warten.
      return cached || (await network) || Response.error();
    })(),
  );
});
