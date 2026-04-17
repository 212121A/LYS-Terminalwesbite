import type Stripe from 'stripe';
import { getDb, isDatabaseConfigured, stripeOrders } from '@workspace/db';
import { logger } from './lib/logger';
import { getUncachableStripeClient } from './stripeClient';

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (pi == null) return null;
  if (typeof pi === 'string') return pi;
  return pi.id;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
          'Received type: ' +
          typeof payload +
          '. ' +
          'This usually means express.json() parsed the body before reaching this handler. ' +
          'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).',
      );
    }

    const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!whSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET fehlt. Stripe Dashboard → Entwickler → Webhooks → Endpoint (z. B. https://ihre-domain/api/stripe/webhook) → Signing secret kopieren und in Vercel als Umgebungsvariable setzen.',
      );
    }

    const stripe = await getUncachableStripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, whSecret);
    } catch (err: unknown) {
      logger.error({ err }, 'Stripe webhook signature verification failed');
      throw err;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info(
          {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
          },
          'Stripe checkout.session.completed',
        );
        if (isDatabaseConfigured()) {
          const db = getDb();
          await db
            .insert(stripeOrders)
            .values({
              stripeSessionId: session.id,
              stripePaymentIntentId: paymentIntentId(session),
              amountTotal: session.amount_total,
              currency: session.currency ?? null,
              paymentStatus: session.payment_status ?? null,
              customerEmail: session.customer_details?.email ?? null,
              metadata: session.metadata ?? null,
            })
            .onConflictDoNothing({ target: stripeOrders.stripeSessionId });
        }
        break;
      }
      default:
        logger.debug({ type: event.type }, 'Stripe webhook event (no extra handling)');
    }
  }
}
