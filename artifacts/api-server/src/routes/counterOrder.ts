import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";

const router = Router();

const payAtCounterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Zu viele Anfragen. Bitte warte kurz." },
});

const N8N_ORDER_WEBHOOK_URL =
  process.env.N8N_ORDER_WEBHOOK_URL?.trim() || "https://feal.app.n8n.cloud/webhook/order_made";

function normalizeQuantity(value: unknown): number {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) return 1;
  return Math.min(20, Math.max(1, qty));
}

function getSupabaseOptional() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

type N8nOrderResponse = {
  success: boolean;
  order_number: number | null;
  message: string;
};

function normalizeOrderNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function postOrderToN8n(payload: Record<string, unknown>): Promise<N8nOrderResponse> {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);
    try {
      const response = await fetch(N8N_ORDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned HTTP ${response.status}`);
      }

      const raw = await response.text();
      let parsed: Record<string, unknown> = {};
      if (raw) {
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
      }

      const mappedOrderNumber =
        normalizeOrderNumber(parsed.order_number) ?? normalizeOrderNumber(parsed.current_number);

      return {
        success: true,
        order_number: mappedOrderNumber,
        message:
          typeof parsed.message === "string" && parsed.message.trim()
            ? parsed.message
            : "Bitte mit dieser Bestellnummer an der Kasse bezahlen.",
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("Unknown n8n webhook error");
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("n8n webhook request failed");
}

router.use("/pay-at-counter", payAtCounterLimiter);

/**
 * Terminal „Bezahlung an der Kasse“: gleicher `pending_orders`-Snapshot wie
 * `create-checkout-session` mit `priceItemsRaw` (name, priceEur, quantity, optional id).
 */
router.post("/pay-at-counter", async (req, res) => {
  try {
    const supabase = getSupabaseOptional();
    if (!supabase) {
      return res.status(503).json({
        error:
          "Bestellservice nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      });
    }

    const body = req.body ?? {};
    const priceItemsRaw = Array.isArray(body.items) ? body.items : [];

    if (priceItemsRaw.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const pendingSnapshot: Record<string, unknown>[] = [];
    let totalEur = 0;

    for (const item of priceItemsRaw as any[]) {
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      const cartId = typeof item?.cartId === "string" ? item.cartId.trim() : "";
      const itemId = typeof item?.itemId === "string" ? item.itemId.trim() : "";
      const sizeLabel = typeof item?.sizeLabel === "string" ? item.sizeLabel.trim() : "";
      // Küchen-Felder aus dem Direkt-Post-Format: Menü-Code + Box-Zustand müssen
      // erhalten bleiben, sonst verliert der Küchen-Bon Code/Box-Angabe (P1-2).
      const number = typeof item?.number === "string" ? item.number.trim().slice(0, 20) : "";
      const boxOption = typeof item?.box_option === "string" ? item.box_option.trim().slice(0, 40) : "";
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
      if (number) snapshotEntry.number = number;
      if (boxOption) snapshotEntry.box_option = boxOption;
      pendingSnapshot.push(snapshotEntry);
      totalEur += priceEur * qty;
    }

    // Box-Zustand (offen/zu) auch top-level — wie der bisherige Direkt-Post.
    const topBoxOption =
      typeof body.box_option === "string" ? body.box_option.trim().slice(0, 40) || null : null;

    // Keep Stripe-like session prefix for existing downstream order processors.
    const sessionId = `cs_counter_${randomUUID()}`;

    const { error: pendingOrderError } = await supabase.from("pending_orders").insert({
      session_id: sessionId,
      items: JSON.stringify(pendingSnapshot),
    });

    if (pendingOrderError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("pay-at-counter pending_orders:", pendingOrderError.message);
      }
      return res.status(500).json({ error: "Bestellung konnte nicht gespeichert werden." });
    }

    try {
      // Items in der Form des bisherigen Frontend-Direkt-Posts (`price` statt
      // `priceEur`) — n8n speichert items 1:1, das Küchen-Dashboard liest sie so.
      const n8nItems = pendingSnapshot.map(({ priceEur, ...rest }) => ({
        ...rest,
        price: priceEur,
      }));

      const webhookResult = await postOrderToN8n({
        source: "terminal",
        paymentType: "pay-at-counter",
        payment_status: "unpaid",
        box_option: topBoxOption,
        sessionId,
        createdAt: new Date().toISOString(),
        totalEur: Number(totalEur.toFixed(2)),
        items: n8nItems,
      });

      return res.json({
        success: true,
        sessionId,
        order_number: webhookResult.order_number,
        message: webhookResult.message,
      });
    } catch (webhookError: unknown) {
      const message = webhookError instanceof Error ? webhookError.message : "Unknown webhook error";
      if (process.env.NODE_ENV !== "production") {
        console.error("pay-at-counter n8n webhook:", message);
      }
      return res.status(502).json({
        error: "Bestellung konnte nicht ans Dashboard weitergeleitet werden. Bitte erneut versuchen.",
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
});

export default router;
