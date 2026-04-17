import { type Request, type Response, Router } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';

const router = Router();

function keyMode(prefix: 'sk' | 'pk', key: string | undefined): 'test' | 'live' | 'unknown' {
  if (!key?.trim()) return 'unknown';
  if (prefix === 'sk') {
    if (key.startsWith('sk_test')) return 'test';
    if (key.startsWith('sk_live')) return 'live';
  } else {
    if (key.startsWith('pk_test')) return 'test';
    if (key.startsWith('pk_live')) return 'live';
  }
  return 'unknown';
}

router.get('/stripe/publishable-key', async (_req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Diagnose: ob Vercel die Stripe-Env-Keys an die Serverless-Funktion durchreicht (ohne Geheimnisse). */
router.get('/stripe/status', (_req, res) => {
  const sk = process.env.STRIPE_SECRET_KEY?.trim();
  const pk = (
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLIC_KEY?.trim()
  );
  const hasSecret = !!sk;
  const hasPub = !!pk;
  const secretMode = keyMode('sk', sk);
  const publishableMode = keyMode('pk', pk);
  const modesMatch =
    !hasSecret || !hasPub
      ? true
      : secretMode === 'unknown' || publishableMode === 'unknown'
        ? true
        : secretMode === publishableMode;
  res.json({
    stripeKeysPresent: hasSecret && hasPub,
    hasSecretKey: hasSecret,
    hasPublishableKey: hasPub,
    secretMode,
    publishableMode,
    modesMatch,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    databaseConfigured: !!process.env.DATABASE_URL?.trim(),
  });
});

/** Gleicher Pfad wie LYS Website: POST /api/stripe/create-checkout-session */
async function createCheckoutSessionHandler(req: Request, res: Response) {
  try {
    const { items, successUrl, cancelUrl, paymentMethod } = req.body as {
      items: Array<{ name: string; price: number; quantity: number }>;
      successUrl: string;
      cancelUrl: string;
      paymentMethod?: string | null;
    };

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const sk = process.env.STRIPE_SECRET_KEY?.trim();
    const pk = (
      process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
      process.env.STRIPE_PUBLIC_KEY?.trim()
    );
    const sm = keyMode('sk', sk);
    const pm = keyMode('pk', pk);
    if (!sk || !pk) {
      return res.status(500).json({
        error:
          'Stripe-Keys fehlen auf dem Server. In Vercel: Project → Settings → Environment Variables → STRIPE_SECRET_KEY und STRIPE_PUBLISHABLE_KEY setzen, dann Redeploy.',
        code: 'stripe_keys_missing',
      });
    }
    if (sm !== 'unknown' && pm !== 'unknown' && sm !== pm) {
      return res.status(500).json({
        error:
          'Stripe: Secret-Key und Publishable-Key passen nicht zusammen (Test vs. Live). Beide aus demselben Modus im Dashboard kopieren (Test: sk_test_… + pk_test_…, Live: sk_live_… + pk_live_…).',
        code: 'stripe_key_mode_mismatch',
      });
    }

    const stripe = await getUncachableStripeClient();

    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const base = {
      line_items: lineItems,
      mode: 'payment' as const,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'de' as const,
      metadata: { app: 'lys-terminal' },
    };

    const createSession = (paymentMethodTypes: string[]) =>
      stripe.checkout.sessions.create({
        ...base,
        payment_method_types: paymentMethodTypes as any,
      });

    /** LYS Website: nur „card“ (Apple Pay / Wallet über Checkout). PayPal nur wenn Nutzer PayPal wählt. */
    let session;
    if (paymentMethod === 'paypal') {
      try {
        session = await createSession(['card', 'paypal']);
      } catch {
        session = await createSession(['card']);
      }
    } else {
      session = await createSession(['card']);
    }

    if (!session.url) {
      return res.status(500).json({
        error:
          'Stripe hat keine Checkout-URL zurückgegeben (session.url leer). Modus/Konfiguration im Dashboard prüfen.',
        code: 'checkout_session_no_url',
      });
    }

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    let message =
      err?.raw?.message ||
      err?.message ||
      (typeof err === 'string' ? err : 'Checkout fehlgeschlagen');
    if (typeof message === 'string') {
      const m = message
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\u2019/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      const compact = m.replace(/\W/g, '').toLowerCase();
      const compactMatch =
        compact.includes('paymentcouldnotbestarted') ||
        compact.includes('thepaymentcouldnotbestarted') ||
        compact.includes('paymentcouldntbestarted') ||
        (compact.includes('couldnotbestarted') && compact.includes('payment'));
      if (
        /(?:the\s+)?payment\s+could\s+not\s+be\s+started/i.test(m) ||
        /payment\s+couldn['']?t\s+be\s+started/i.test(m) ||
        (/could\s+not\s+be\s+started/i.test(m) && /payment/i.test(m)) ||
        compactMatch
      ) {
        message =
          'Zahlung konnte nicht gestartet werden. Häufig: Test/Live-Keys gemischt, Zahlungsarten im Stripe-Dashboard nicht aktiviert, oder Konto noch eingeschränkt. Im Dashboard unter „Zahlungen“ → Entwicklerprotokolle prüfen.';
      }
    }
    const code = err?.code ?? err?.raw?.code;
    const type = err?.type ?? err?.raw?.type;
    return res.status(500).json({
      error: message,
      ...(code ? { stripeCode: code } : {}),
      ...(type ? { stripeType: type } : {}),
    });
  }
}

router.post('/checkout/session', createCheckoutSessionHandler);
router.post('/stripe/create-checkout-session', createCheckoutSessionHandler);

export default router;
