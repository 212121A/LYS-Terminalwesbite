import Stripe from "stripe";

/** Wie LYS Website `artifacts/api-server/src/routes/stripe.ts` — nur Secret Key. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, {
    // @ts-expect-error LYS Website: SDK-Typen können neueren Default erwarten
    apiVersion: "2025-03-31.basil",
  });
}
