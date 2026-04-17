import Stripe from 'stripe';

function getCredentialsFromEnv() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLIC_KEY?.trim();
  if (secretKey && publishableKey) {
    return { publishableKey, secretKey };
  }
  return null;
}

async function getCredentials() {
  const fromEnv = getCredentialsFromEnv();
  if (fromEnv) {
    return fromEnv;
  }
  throw new Error(
    'Stripe nicht konfiguriert: STRIPE_SECRET_KEY sowie STRIPE_PUBLISHABLE_KEY (oder STRIPE_PUBLIC_KEY) in den Umgebungsvariablen setzen (z. B. Vercel → Project → Settings → Environment Variables). Test- und Live-Keys nicht mischen.',
  );
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    timeout: 22_000,
    maxNetworkRetries: 0,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
