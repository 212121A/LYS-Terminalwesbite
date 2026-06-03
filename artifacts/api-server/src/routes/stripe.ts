import express, { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import {
  checkoutRedirectOrigin,
  isAllowedCheckoutReturnUrl,
} from "../lib/allowedOrigins.js";
import { getStripe } from "../stripeClient.js";

const router = Router();
const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Zu viele Anfragen. Bitte warte kurz." },
});
const PRODUCTS: Record<string, { name: string; price: number }> = {
  "v1-regular": { name: "Nem Ran", price: 400 },
  "v2-regular": { name: "Mini Frühlingsrollen (vegan)", price: 200 },

  "c1-regular": { name: "Gemüse Thai Curry", price: 700 },
  "c2-regular": { name: "Hähnchenfleisch Thai Curry", price: 900 },
  "c3-regular": { name: "Paniertes Hähnchenfleisch Thai Curry", price: 1050 },
  "c4-regular": { name: "Fisch Thai Curry", price: 1050 },
  "c5-regular": { name: "Ente Thai Curry", price: 1150 },
  "c6-regular": { name: "Garnelen Thai Curry", price: 1150 },
  "c7-regular": { name: "Tofu Thai Curry", price: 850 },

  "s1-regular": { name: "Gemüse Süß-Sauer", price: 700 },
  "s2-regular": { name: "Hähnchenfleisch Süß-Sauer", price: 900 },
  "s3-regular": { name: "Paniertes Hähnchenfleisch Süß-Sauer", price: 1050 },
  "s4-regular": { name: "Fisch Süß-Sauer", price: 1050 },
  "s5-regular": { name: "Ente Süß-Sauer", price: 1150 },
  "s6-regular": { name: "Garnelen Süß-Sauer", price: 1150 },
  "s7-regular": { name: "Tofu Süß-Sauer", price: 850 },

  "b1-regular": { name: "Gemüse Soja", price: 700 },
  "b2-regular": { name: "Hähnchenfleisch Soja", price: 900 },
  "b3-regular": { name: "Paniertes Hähnchenfleisch Soja", price: 1050 },
  "b4-regular": { name: "Fisch Soja", price: 1050 },
  "b5-regular": { name: "Ente Soja", price: 1150 },
  "b6-regular": { name: "Garnelen Soja", price: 1150 },
  "b7-regular": { name: "Tofu Soja", price: 850 },

  "e1-regular": { name: "Gemüse Erdnuss", price: 700 },
  "e2-regular": { name: "Hähnchenfleisch Erdnuss", price: 900 },
  "e3-regular": { name: "Paniertes Hähnchenfleisch Erdnuss", price: 1050 },
  "e4-regular": { name: "Fisch Erdnuss", price: 1050 },
  "e5-regular": { name: "Ente Erdnuss", price: 1150 },
  "e6-regular": { name: "Garnelen Erdnuss", price: 1150 },
  "e7-regular": { name: "Tofu Erdnuss", price: 850 },

  "m1-regular": { name: "Gemüse Matcha Soße", price: 700 },
  "m2-regular": { name: "Hähnchenfleisch Matcha Soße", price: 900 },
  "m3-regular": { name: "Paniertes Hähnchenfleisch Matcha Soße", price: 1050 },
  "m4-regular": { name: "Fisch Matcha Soße", price: 1050 },
  "m5-regular": { name: "Ente Matcha Soße", price: 1150 },
  "m6-regular": { name: "Garnelen Matcha Soße", price: 1150 },
  "m7-regular": { name: "Tofu Matcha Soße", price: 850 },

  "m8-regular": { name: "Gemüse Mango Soße", price: 700 },
  "m9-regular": { name: "Hähnchenfleisch Mango Soße", price: 900 },
  "m10-regular": { name: "Paniertes Hähnchenfleisch Mango Soße", price: 1050 },
  "m11-regular": { name: "Fisch Mango Soße", price: 1050 },
  "m12-regular": { name: "Ente Mango Soße", price: 1150 },
  "m13-regular": { name: "Garnelen Mango Soße", price: 1150 },
  "m14-regular": { name: "Tofu Mango Soße", price: 850 },

  "a1-regular": { name: "Gebratener Reis mit Ei & Gemüse", price: 700 },
  "a2-regular": { name: "Gebratener Reis Hähnchenfleisch", price: 850 },
  "a3-regular": { name: "Gebratener Reis Paniertes Hähnchenfleisch", price: 1050 },
  "a4-regular": { name: "Gebratener Reis Fisch", price: 1050 },
  "a5-regular": { name: "Gebratener Reis Ente", price: 1150 },
  "a6-regular": { name: "Gebratener Reis Garnelen", price: 1000 },
  "a7-regular": { name: "Gebratener Reis Tofu", price: 850 },

  "box-gemuse-small": { name: "Nudel-/Reisbox Gemüse (klein)", price: 400 },
  "box-gemuse-large": { name: "Nudel-/Reisbox Gemüse (groß)", price: 500 },
  "box-gemuse-regular": { name: "Nudel-/Reisbox Gemüse (groß)", price: 500 },
  "box-huehnchen-small": { name: "Nudel-/Reisbox Hähnchen (klein)", price: 450 },
  "box-huehnchen-large": { name: "Nudel-/Reisbox Hähnchen (groß)", price: 600 },
  "box-huehnchen-regular": { name: "Nudel-/Reisbox Hähnchen (groß)", price: 600 },
  "box-pan-huehnchen-regular": { name: "Nudel-/Reisbox Paniertes Hähnchen", price: 600 },
  "box-fisch-regular": { name: "Nudel-/Reisbox Fisch", price: 600 },
  "box-fruehlingsrollen-regular": { name: "Nudel-/Reisbox Frühlingsrollen", price: 600 },
  "box-tofu-regular": { name: "Nudel-/Reisbox Tofu", price: 800 },
  "box-garnelen-regular": { name: "Nudel-/Reisbox Garnelen", price: 1000 },

  "g-soft-regular": { name: "Softgetränke", price: 300 },
  "g-wasser-regular": { name: "Wasser", price: 200 },
  "m-latte-regular": { name: "Matcha Latte (warm/kalt)", price: 450 },
  "m-dau-regular": { name: "Matcha dâu (Erdbeere)", price: 500 },
  "m-xoai-regular": { name: "Matcha xoài (Mango)", price: 500 },
  "m-rasp-regular": { name: "Matcha Raspberry (Himbeere)", price: 500 },
  "m-vietquat-regular": { name: "Matcha việt quất (Blaubeere)", price: 500 },
  "m-dua-ananas-regular": { name: "Matcha dứa (Ananas)", price: 500 },
  "m-vani-regular": { name: "Matcha vani (Vanille)", price: 500 },
  "m-dua-cloud-regular": { name: "Matcha dừa (Coconut Cloud)", price: 550 },
  "cp-den-regular": { name: "Cà phê đen", price: 450 },
  "cp-sua-da-regular": { name: "Cà phê sữa đá", price: 500 },
  "cp-den-da-regular": { name: "Cà phê đen đá", price: 450 },
  "cp-nau-da-regular": { name: "Cà phê nâu đá", price: 500 },
  "cp-dua-regular": { name: "Cà phê dừa", price: 500 },
  "cp-bac-xiu-regular": { name: "Bạc xỉu", price: 600 },
  "t-chanh-leo-regular": { name: "Trà chanh leo", price: 600 },
  "t-vai-regular": { name: "Trà vải", price: 600 },
  "t-dao-regular": { name: "Trà đào cam sả", price: 600 },
  "t-chanh-simple-regular": { name: "Trà chanh", price: 600 },
  "soda-chanh-regular": { name: "Soda chanh", price: 600 },
  "soda-dao-regular": { name: "Soda đào", price: 600 },
  "soda-vai-regular": { name: "Soda vải", price: 600 },
  "soda-dua-regular": { name: "Soda dứa", price: 600 },
  "smoothie-all-regular": { name: "Smoothie", price: 650 },
  "bowl-oats1-regular": { name: "Overnight Oats", price: 650 },
  "bowl-oats2-regular": { name: "Overnight Oats mit Chia", price: 650 },
  "bowl-chia-regular": { name: "Chia Pudding", price: 650 },
  "kem-matcha-regular": { name: "Matcha Latte mit Matcha Eis", price: 650 },
  "kem-vani-regular": { name: "Matcha Latte mit Vanilleeis", price: 650 },
  "kids-schoko-regular": { name: "Schoko Latte", price: 450 },
};

function normalizeQuantity(value: unknown): number {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) return 1;
  return Math.min(20, Math.max(1, qty));
}

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function getSupabaseOptional() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

router.use("/create-checkout-session", checkoutLimiter);
router.use("/create-payment-intent", checkoutLimiter);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, secret as string);
    } catch (_err) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (event.type === "checkout.session.completed") {
      // Bestellung verarbeiten
    }

    return res.json({ received: true });
  },
);

router.post("/create-payment-intent", async (req, res) => {
  try {
    const stripe = getStripe();
    const { items, currency = "eur", metadata = {} } = req.body ?? {};
    const itemsFromBody = Array.isArray(items) ? items : [];

    if (itemsFromBody.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    const invalidItemIds: string[] = [];
    const amount = itemsFromBody.reduce((sum: number, item: any) => {
      const id = typeof item?.id === "string" ? item.id : "";
      const product = PRODUCTS[id];
      if (!product) {
        invalidItemIds.push(id || "unknown");
        return sum;
      }

      return sum + product.price * normalizeQuantity(item?.quantity);
    }, 0);

    if (invalidItemIds.length > 0) {
      return res.status(400).json({
        error: `Invalid item id(s): ${invalidItemIds.join(", ")}`,
      });
    }

    if (amount < 50) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
});

router.post("/create-checkout-session", async (req, res) => {
  try {
    const stripe = getStripe();
    const supabase = getSupabaseOptional();
    const body = req.body ?? {};
    const {
      currency = "eur",
      customer = {},
      orderType = "pickup",
      origin,
      successUrl: successUrlFromBody,
      cancelUrl: cancelUrlFromBody,
    } = body;

    const normalizedOrigin = checkoutRedirectOrigin(origin);

    const cartItemsRaw = Array.isArray(body.cartItems) ? body.cartItems : [];
    const priceItemsRaw = Array.isArray(body.items) ? body.items : [];

    type Line = {
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string };
      };
      quantity: number;
    };

    let lineItems: Line[] = [];
    let pendingSnapshot: unknown[] = [];

    if (cartItemsRaw.length > 0) {
      const invalidItemIds: string[] = [];
      lineItems = cartItemsRaw
        .map((item: any) => {
          const id = typeof item?.id === "string" ? item.id : "";
          const product = PRODUCTS[id];
          if (!product) {
            invalidItemIds.push(id || "unknown");
            return null;
          }
          pendingSnapshot.push({
            id,
            quantity: normalizeQuantity(item?.quantity),
          });
          return {
            price_data: {
              currency,
              unit_amount: product.price,
              product_data: {
                name: product.name,
              },
            },
            quantity: normalizeQuantity(item?.quantity),
          };
        })
        .filter((lineItem): lineItem is NonNullable<typeof lineItem> => Boolean(lineItem));

      if (invalidItemIds.length > 0) {
        return res.status(400).json({
          error: `Invalid item id(s): ${invalidItemIds.join(", ")}`,
        });
      }
    } else if (priceItemsRaw.length > 0) {
      /** Terminal-Frontend: `{ id?, name, price, quantity }` mit `price` in Euro (wie Menü).
       *  `id` ist die Cart-ID inkl. Größe (z. B. "c1", "box-gemuse-Klein") und wird im
       *  Supabase-Snapshot mitgespeichert, damit das Kitchen Dashboard Gerichte mit
       *  gleichem Anzeige-Namen (z. B. mehrere „Gemüse") unterscheiden kann.
       */
      for (const item of priceItemsRaw as any[]) {
        const id = typeof item?.id === "string" ? item.id.trim() : "";
        const cartId = typeof item?.cartId === "string" ? item.cartId.trim() : "";
        const itemId = typeof item?.itemId === "string" ? item.itemId.trim() : "";
        const sizeLabel = typeof item?.sizeLabel === "string" ? item.sizeLabel.trim() : "";
        const name = typeof item?.name === "string" ? item.name.trim() : "";
        const priceEur = Number(item?.price);
        const qty = normalizeQuantity(item?.quantity);
        if (!name || !Number.isFinite(priceEur) || priceEur < 0 || priceEur > 999) {
          return res.status(400).json({ error: "Ungültiger Artikel (Name/Preis)." });
        }
        const unitCents = Math.round(priceEur * 100);
        if (unitCents < 50) {
          return res.status(400).json({ error: "Betrag zu klein." });
        }
        const snapshotEntry: Record<string, unknown> = { name, priceEur, quantity: qty };
        if (id) snapshotEntry.id = id;
        if (cartId) snapshotEntry.cartId = cartId;
        if (itemId) snapshotEntry.itemId = itemId;
        if (sizeLabel) snapshotEntry.sizeLabel = sizeLabel;
        pendingSnapshot.push(snapshotEntry);
        lineItems.push({
          price_data: {
            currency,
            unit_amount: unitCents,
            product_data: { name },
          },
          quantity: qty,
        });
      }
    } else {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: "No valid items" });
    }

    if (orderType === "delivery") {
      lineItems.push({
        price_data: {
          currency,
          unit_amount: 200,
          product_data: {
            name: "Delivery fee",
          },
        },
        quantity: 1,
      });
    }

    let successUrl = `${normalizedOrigin}/success?session_id={CHECKOUT_SESSION_ID}`;
    let cancelUrl = `${normalizedOrigin}/cancel`;
    if (
      isAllowedCheckoutReturnUrl(successUrlFromBody) &&
      isAllowedCheckoutReturnUrl(cancelUrlFromBody)
    ) {
      successUrl = successUrlFromBody as string;
      cancelUrl = cancelUrlFromBody as string;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email:
        typeof customer.email === "string" ? customer.email : undefined,
      metadata: {
        pickup_time: "",
      },
    });

    if (supabase) {
      const { error: pendingOrderError } = await supabase.from("pending_orders").insert({
        session_id: session.id,
        items: JSON.stringify(pendingSnapshot),
      });

      if (pendingOrderError && process.env.NODE_ENV !== "production") {
        console.error("Failed to save pending order:", pendingOrderError.message);
      }
    }

    return res.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
});

router.get("/config", (_req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return res.status(503).json({ error: "Stripe not configured" });
  }
  return res.json({ publishableKey });
});

export default router;
