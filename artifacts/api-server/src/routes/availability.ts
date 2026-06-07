import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { currentBusinessDay } from "../lib/businessDay.js";

const router = Router();

// Strenger Schutz gegen PIN-Brute-Force: nur Fehlversuche zählen (skipSuccessfulRequests),
// damit normales Schalten durch Mitarbeiter nicht limitiert wird, Raten aber praktisch
// unmöglich ist. Gilt für BEIDE PIN-prüfenden Endpunkte — sonst ließe sich die PIN
// einfach über POST / statt /verify durchprobieren.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: "Zu viele Fehlversuche. Bitte warte 15 Minuten." },
});

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

// IDs sehen aus wie dish:e1, box:box-tofu, sauce:erdnuss — Wortzeichen plus : . -
function validItemId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[\w:.-]+$/.test(value);
}

// PIN prüfen, damit der versteckte Modus erst nach korrekter PIN aufgeht.
router.post("/verify", authLimiter, (req, res) => {
  if (!pinOk(req.body?.pin)) return res.status(401).json({ error: "Falsche PIN" });
  return res.json({ ok: true });
});

// Verfügbarkeit setzen/entfernen.
router.post("/", authLimiter, async (req, res) => {
  try {
    const body = req.body ?? {};
    const pin = body.pin as unknown;
    const itemId = body.itemId as unknown;
    const action = body.action as "available" | "sold_out_today" | "sold_out_permanent";

    if (!pinOk(pin)) return res.status(401).json({ error: "Falsche PIN" });
    if (!validItemId(itemId)) return res.status(400).json({ error: "Ungültige itemId" });

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
});

export default router;
