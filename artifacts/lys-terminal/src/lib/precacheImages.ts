import { menuData } from "@/data/menu";

/** Muss zur CACHE-Konstante in public/sw.js passen. */
const CACHE = "lys-menu-img-v1";

/** Alle im Menü referenzierten Bild-URLs (Karten, Box-Karten, Kategorie-Header). */
function collectMenuImageUrls(): string[] {
  const urls = new Set<string>();
  const add = (img?: string) => {
    if (img) urls.add("/" + img.replace(/^\/+/, ""));
  };

  for (const category of menuData) {
    category.images?.forEach(add);
    category.items?.forEach((item) => add(item.image));
    category.boxItems?.forEach((box) => add(box.image));
  }

  return [...urls];
}

/**
 * Lädt im Hintergrund alle Menübilder in den Service-Worker-Cache, damit der
 * Kiosk nach dem ersten Laden offline-fähig ist und Bilder sofort erscheinen.
 * Best-effort: Fehler (offline, nicht unterstützt) werden bewusst geschluckt.
 */
export async function precacheMenuImages(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      collectMenuImageUrls().map(async (url) => {
        if (await cache.match(url)) return;
        const res = await fetch(url, { cache: "reload" });
        if (res.ok) await cache.put(url, res);
      }),
    );
  } catch {
    // Cache Storage nicht verfügbar – App funktioniert normal weiter.
  }
}
