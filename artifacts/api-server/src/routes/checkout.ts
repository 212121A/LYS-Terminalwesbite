import { Router } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';

const router = Router();

router.get('/stripe/publishable-key', async (_req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkout/session', async (req, res) => {
  try {
    const { items, successUrl, cancelUrl } = req.body as {
      items: Array<{ name: string; price: number; quantity: number }>;
      successUrl: string;
      cancelUrl: string;
    };

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'] as any,
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'de',
      payment_intent_data: {
        description: 'LYS Noodle Box Bestellung',
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
