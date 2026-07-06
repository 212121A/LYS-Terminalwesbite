// artifacts/api-server/src/fiskaly/config.ts
/**
 * Feste Geschäftsdaten für Beleg (§6 KassenSichV) und DSFinV-K-Abschluss.
 * Bewusst im Code statt ENV: nicht geheim, gehört in die Code-Review.
 */
export const FISCAL_BUSINESS = {
  name: "LYS Noodles & Rice",
  address: {
    street: "Kappelgasse 2",
    postalCode: "73525",
    city: "Schwäbisch Gmünd",
    countryCode: "DEU",
  },
  // ⚠️ Vor Go-Live vom Steuerberater bestätigen lassen und eintragen —
  // Pflichtangabe auf dem Beleg und im DSFinV-K-Export.
  taxNumber: "",
  vatId: "",
} as const;

/** Kennung dieser Kasse im DSFinV-K-Export (frei wählbar, aber stabil halten). */
export const CASH_REGISTER = {
  brand: "LYS Terminal",
  model: "Kiosk-Bestellterminal (Eigenentwicklung)",
  softwareVersion: "1.0",
  baseCurrencyCode: "EUR",
} as const;

export type FiskalyEnv = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  tssId: string;
  clientId: string;
};

/** Liest die fiskaly-ENV; wirft mit klarer Meldung, wenn etwas fehlt. */
export function getFiskalyEnv(): FiskalyEnv {
  const apiKey = process.env.FISKALY_API_KEY;
  const apiSecret = process.env.FISKALY_API_SECRET;
  const baseUrl = process.env.FISKALY_BASE_URL?.replace(/\/$/, "");
  const tssId = process.env.FISKALY_TSS_ID;
  const clientId = process.env.FISKALY_CLIENT_ID;

  const missing = [
    !apiKey && "FISKALY_API_KEY",
    !apiSecret && "FISKALY_API_SECRET",
    !baseUrl && "FISKALY_BASE_URL",
    !tssId && "FISKALY_TSS_ID",
    !clientId && "FISKALY_CLIENT_ID",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`fiskaly nicht konfiguriert: ${missing.join(", ")} fehlt`);
  }

  return {
    apiKey: apiKey as string,
    apiSecret: apiSecret as string,
    baseUrl: baseUrl as string,
    tssId: tssId as string,
    clientId: clientId as string,
  };
}

/** Ist Fiskalisierung überhaupt konfiguriert? (für sauberes 503 statt Crash) */
export function isFiskalyConfigured(): boolean {
  try {
    getFiskalyEnv();
    return true;
  } catch {
    return false;
  }
}
