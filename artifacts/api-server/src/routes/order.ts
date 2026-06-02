import { type Request, type Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPool, isDatabaseConfigured } from '@workspace/db';

const router = Router();

/** Analog `checkoutSessionLimiter` in routes/checkout.ts (20 req/min/IP). */
const orderLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
});

type OrderItem = {
  id?: string;
  name: string;
  price: number;
  quantity: number;
};

function isValidItem(x: unknown): x is OrderItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    o.name.length > 0 &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    o.price >= 0 &&
    typeof o.quantity === 'number' &&
    Number.isInteger(o.quantity) &&
    o.quantity > 0 &&
    (o.id === undefined || typeof o.id === 'string')
  );
}

async function createOrderHandler(req: Request, res: Response) {
  const body = req.body as { items?: unknown };
  const items = Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0 || !items.every(isValidItem)) {
    return res.status(400).json({ error: 'No items provided' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(500).json({
      error:
        'DATABASE_URL fehlt auf dem Server. In Vercel Environment Variables setzen und Redeploy.',
    });
  }

  try {
    const pool = getPool();
    const result = await pool.query<{ order_number: number; order_id: string }>(
      'select order_number, order_id from public.create_order($1::jsonb, $2::text)',
      [JSON.stringify(items), 'terminal'],
    );

    const row = result.rows[0];
    if (!row || typeof row.order_number !== 'number') {
      return res.status(500).json({
        error: 'create_order hat keine Bestellnummer zurückgegeben.',
      });
    }

    return res.json({ order_number: row.order_number, order_id: row.order_id });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Bestellung konnte nicht angelegt werden.';
    req.log?.error?.({ err }, 'create_order failed');
    return res.status(500).json({ error: message });
  }
}

router.post('/order', orderLimiter, createOrderHandler);

export default router;
