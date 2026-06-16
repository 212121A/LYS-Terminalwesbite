/**
 * Lauf:  node --experimental-strip-types src/lib/kitchenOrder.test.ts
 * (Das Frontend hat keinen Test-Runner — Node-Type-Stripping reicht für diese
 *  reine Logik. menu.ts hat keine Wert-Importe, daher relativ importierbar.)
 */
import { buildKitchenIndex, toKitchenLineItem } from "./kitchenOrder.ts";
import { menuData, boxMenuItems } from "../data/menu.ts";
import type { CartItem } from "../store/cart.ts";

const index = buildKitchenIndex(menuData, boxMenuItems);

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

function cart(partial: Partial<CartItem> & Pick<CartItem, "itemId">): CartItem {
  return {
    id: partial.id ?? `${partial.itemId}${partial.sizeLabel ? `-${partial.sizeLabel}` : ""}`,
    itemId: partial.itemId,
    name: partial.name ?? "<übersetzter Anzeigename>",
    price: partial.price ?? 0,
    quantity: partial.quantity ?? 1,
    sizeLabel: partial.sizeLabel,
  };
}

// 1) Soße-Gericht mit Carb-Wahl: Kunde z. B. auf Vietnamesisch → Anzeigename
//    übersetzt, aber sizeLabel ist bereits deutsch („Nudel"). Küche = deutsch.
const c2 = toKitchenLineItem(index, cart({ itemId: "c2", name: "Gà với rau · Mì", sizeLabel: "Nudel", price: 9 }));
check("c2.number", c2.number, "C2");
check("c2.name", c2.name, "Hähnchenfleisch mit Gemüse · Nudel");
check("c2.id", c2.id, "c2 Nudel");
check("c2.sizeLabel", c2.sizeLabel, "Nudel");

// 2) Reis-Variante
const e5 = toKitchenLineItem(index, cart({ itemId: "e5", sizeLabel: "Reis" }));
check("e5.name", e5.name, "Ente mit Gemüse · Reis");
check("e5.id", e5.id, "e5 Reis");

// 2b) Soßen-Gericht mit Modifikatoren („Keine Soße"/„Ohne Gemüse" sind bereits
//     deutsche Konstanten im sizeLabel) → Küche bekommt alles deutsch angehängt.
const b2 = toKitchenLineItem(index, cart({ itemId: "b2", sizeLabel: "Nudel · Keine Soße · Ohne Gemüse" }));
check("b2.name", b2.name, "Hähnchenfleisch mit Gemüse · Nudel · Keine Soße · Ohne Gemüse");
check("b2.id", b2.id, "b2 Nudel · Keine Soße · Ohne Gemüse");

// 3) Box: Größe+Beilage stecken im Code, Soße ist bereits deutsch.
const gn3 = toKitchenLineItem(index, cart({ itemId: "GN3", sizeLabel: "Sojasoße", price: 6, quantity: 2 }));
check("GN3.number", gn3.number, "GN3");
check("GN3.name", gn3.name, "Große Nudelbox - Paniertes Hähnchen · Sojasoße");
check("GN3.id", gn3.id, "GN3 Sojasoße");

// 4) Kleine Reisbox
const kr1 = toKitchenLineItem(index, cart({ itemId: "KR1", sizeLabel: "Matcha Soße" }));
check("KR1.name", kr1.name, "Kleine Reisbox - Gemüse · Matcha Soße");

// 5) Getränk mit Optionen (deutsche Konstanten)
const m01 = toKitchenLineItem(index, cart({ itemId: "01", sizeLabel: "Classic · Kuhmilch", price: 4.5 }));
check("01.number", m01.number, "01");
check("01.name", m01.name, "Matcha Latte (warm/kalt) · Classic · Kuhmilch");

// 6) Getränk ohne Variante
const gd2 = toKitchenLineItem(index, cart({ itemId: "gd2", price: 2 }));
check("gd2.number", gd2.number, "GD2");
check("gd2.name", gd2.name, "Wasser (inkl. Pfand)");
check("gd2.id", gd2.id, "gd2");

// 7) Unbekannte itemId → sicherer Rohwert-Fallback
const unknown = toKitchenLineItem(index, cart({ itemId: "zzz", sizeLabel: "Extra" }));
check("unknown.name", unknown.name, "zzz · Extra");
check("unknown.number", unknown.number, "zzz");

if (failures > 0) {
  console.error(`\n${failures} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS");
