// artifacts/api-server/src/routes/receipt.ts
/**
 * Digitaler Kassenbeleg (§6 KassenSichV) für Terminal-Kartenzahlungen.
 * GET /api/receipt/:id — public: die UUID selbst ist das (unguessbare) Token,
 * der QR auf der Success-Seite verlinkt auf /beleg/:id, das hierher fetcht.
 * Nur abgeschlossene Vorgänge; tse_error-Belege weisen den TSE-Ausfall aus.
 */
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { FISCAL_BUSINESS } from "../fiskaly/config.js";
import { VAT_RATE_PERCENT } from "../fiskaly/receipt.js";

const router = Router();

router.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Zu viele Anfragen. Bitte warte kurz." },
}));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/:id", async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: "Nicht konfiguriert." });

  const id = req.params.id;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: "Beleg nicht gefunden." });

  try {
    const supabase = createClient(url, key);
    const { data: row } = await supabase
      .from("fiscal_transactions")
      .select("*")
      .eq("id", id)
      .in("state", ["completed", "tse_error"])
      .single();

    if (!row) return res.status(404).json({ error: "Beleg nicht gefunden." });

    const items = Array.isArray(row.items) ? row.items : [];
    const vatAmounts = Array.isArray(row.vat_amounts) ? row.vat_amounts : [];

    // Beleg ist nach Abschluss unveränderlich → aggressiv cachen.
    res.setHeader("Cache-Control", "public, s-maxage=86400, max-age=3600");

    return res.json({
      business: {
        name: FISCAL_BUSINESS.name,
        street: FISCAL_BUSINESS.address.street,
        postal_code: FISCAL_BUSINESS.address.postalCode,
        city: FISCAL_BUSINESS.address.city,
        tax_number: FISCAL_BUSINESS.taxNumber || null,
        vat_id: FISCAL_BUSINESS.vatId || null,
      },
      order_number: row.order_number,
      created_at: row.created_at,
      payment_type: row.payment_type, // NON_CASH = Kartenzahlung
      total_cents: row.total_cents,
      items: items.map((item: Record<string, unknown>) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        vat_rate: item.vat_rate,
        vat_percent: VAT_RATE_PERCENT[item.vat_rate as keyof typeof VAT_RATE_PERCENT] ?? null,
      })),
      vat_amounts: vatAmounts.map((vat: Record<string, unknown>) => ({
        vat_rate: vat.vat_rate,
        vat_percent: VAT_RATE_PERCENT[vat.vat_rate as keyof typeof VAT_RATE_PERCENT] ?? null,
        incl_vat_cents: vat.incl_vat_cents,
        vat_cents: vat.vat_cents,
      })),
      // TSE-Pflichtangaben (§6 KassenSichV). Bei TSE-Ausfall: tse = null + Hinweis.
      tse: row.state === "tse_error" ? null : {
        serial_number: row.tse_serial,
        transaction_number: row.tse_tx_number,
        signature_counter: row.tse_signature_counter,
        signature_value: row.tse_signature_value,
        signature_algorithm: row.tse_signature_algorithm,
        time_format: row.tse_time_format,
        time_start: row.tse_time_start,
        time_end: row.tse_time_end,
        qr_data: row.tse_qr_data,
      },
      tse_outage: row.state === "tse_error",
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

export default router;
