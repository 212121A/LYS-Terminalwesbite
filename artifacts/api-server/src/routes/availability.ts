import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { currentBusinessDay } from "../lib/businessDay.js";

const router = Router();

// Schützt v.a. /verify gegen PIN-Brute-Force.
const availabilityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Zu viele Anfragen. Bitte warte kurz." },
});
router.use(availabilityLimiter);

function getSupabaseOptional() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function pinOk(pin: unknown): boolean {
  const expected = process.env.STAFF_PIN;
  return typeof expected === "string" && expected.length > 0 && pin === expected;
}

type Action = "available" | "sold_out_today" | "sold_out_permanent";

// PIN prüfen, damit der versteckte Modus erst nach korrekter PIN aufgeht.
router.post("/verify", (req, res) => {
  if (!pinOk(req.body?.pin)) return res.status(401).json({ error: "Falsche PIN" });
  return res.json({ ok: true });
});

// Verfügbarkeit setzen/entfernen.
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const pin = body.pin as unknown;
  const itemId = body.itemId as unknown;
  const action = body.action as Action;

  if (!pinOk(pin)) return res.status(401).json({ error: "Falsche PIN" });
  if (typeof itemId !== "string" || itemId.length === 0) {
    return res.status(400).json({ error: "itemId fehlt" });
  }

  const supabase = getSupabaseOptional();
  if (!supabase) {
    return res.status(503).json({ error: "Bestellservice nicht konfiguriert." });
  }

  if (action === "available") {
    const { error } = await supabase.from("item_availability").delete().eq("item_id", itemId);
    if (error) return res.status(500).json({ error: "Speichern fehlgeschlagen." });
    return res.json({ ok: true });
  }

  if (action === "sold_out_today" || action === "sold_out_permanent") {
    const mode = action === "sold_out_permanent" ? "permanent" : "today";
    const { error } = await supabase.from("item_availability").upsert(
      {
        item_id: itemId,
        mode,
        sold_out_date: mode === "today" ? currentBusinessDay() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id" },
    );
    if (error) return res.status(500).json({ error: "Speichern fehlgeschlagen." });
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Ungültige action" });
});

export default router;
