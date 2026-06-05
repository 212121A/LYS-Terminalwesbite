/**
 * Wandelt Warenkorb-Zeilen in den kanonisch-deutschen Küchen-Posten um, der ans
 * Bestell-Backend (n8n → `orders.items`) geht. Der Anzeige-Name im Warenkorb
 * bleibt in der vom Kunden gewählten Sprache — die Küche bekommt aber IMMER
 * Deutsch, unabhängig von der Terminal-Sprache.
 *
 * Quelle der deutschen Namen/Codes: zentrale `menuData` (Speisen/Getränke) und
 * `boxMenuItems` (Nudel-/Reisboxen). Soße/Optionen sind bereits deutsche
 * Konstanten und stecken sprachneutral im `sizeLabel`; die Carb-Wahl (Nudel/Reis)
 * schreibt `MenuItemCard` ebenfalls deutsch ins `sizeLabel`.
 */

import type { CartItem } from "@/store/cart";
import type { MenuCategory, BoxBaseItem } from "@/data/menu";

/** Kanonischer Küchen-Eintrag je Warenkorb-`itemId`: Menü-Code + deutscher Name. */
export interface KitchenMenuEntry {
  number: string;
  name: string;
}

export type KitchenIndex = Map<string, KitchenMenuEntry>;

const BOX_SIZE_DE: Record<"klein" | "gross", string> = {
  klein: "Kleine",
  gross: "Große",
};
const BOX_CARB_DE: Record<"nudel" | "reis", string> = {
  nudel: "Nudelbox",
  reis: "Reisbox",
};

/**
 * Index `Warenkorb-itemId → { Menü-Code, deutscher Name }`. Speisen/Getränke
 * kommen direkt aus `menuData`; Boxen werden über ihre Code-Zuordnung
 * (GN1…KR7) zu „Große Nudelbox - Paniertes Hähnchen" etc. aufgelöst.
 */
export function buildKitchenIndex(
  menu: MenuCategory[],
  boxes: BoxBaseItem[],
): KitchenIndex {
  const index: KitchenIndex = new Map();

  for (const category of menu) {
    for (const item of category.items) {
      index.set(item.id, { number: item.number, name: item.name });
    }
  }

  for (const box of boxes) {
    for (const carb of ["nudel", "reis"] as const) {
      for (const size of ["klein", "gross"] as const) {
        const code = box.carbs[carb][size];
        if (!code) continue;
        index.set(code, {
          number: code,
          name: `${BOX_SIZE_DE[size]} ${BOX_CARB_DE[carb]} - ${box.name}`,
        });
      }
    }
  }

  return index;
}

export interface KitchenLineItem {
  /** „Code + Variante", so wie das Küchen-Dashboard die Zeile anzeigt. */
  id: string;
  /** Kanonischer Menü-Code (z. B. „C2", „GN3", „01"). */
  number: string;
  cartId: string;
  itemId: string;
  /** Voll ausgeschriebener deutscher Name inkl. Variante (Carb/Soße/Optionen). */
  name: string;
  sizeLabel?: string;
  price: number;
  quantity: number;
}

/**
 * Eine Warenkorb-Zeile → kanonisch-deutscher Küchen-Posten. `name`/`number`
 * stammen aus dem Index (deutsch); die bereits deutsche Variante (`sizeLabel`)
 * wird angehängt. Unbekannte `itemId` fallen sicher auf den Rohwert zurück.
 */
export function toKitchenLineItem(
  index: KitchenIndex,
  item: CartItem,
): KitchenLineItem {
  const variant = (item.sizeLabel ?? "").trim();
  const entry = index.get(item.itemId);
  const baseName = entry?.name ?? item.itemId;

  return {
    id: variant ? `${item.itemId} ${variant}` : item.itemId,
    number: entry?.number ?? item.itemId,
    cartId: item.id,
    itemId: item.itemId,
    name: variant ? `${baseName} · ${variant}` : baseName,
    sizeLabel: item.sizeLabel,
    price: item.price,
    quantity: item.quantity,
  };
}
