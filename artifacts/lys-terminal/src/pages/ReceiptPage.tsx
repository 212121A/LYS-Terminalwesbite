import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { QRCodeSVG } from "qrcode.react";

/**
 * Digitaler Kassenbeleg (/beleg/:id) — wird vom Kundenhandy geöffnet (QR auf
 * der Success-Seite). Bewusst nur Deutsch mit englischen Untertiteln: die
 * Seite läuft außerhalb des Kiosk-Sprachkontexts. Datenquelle: /api/receipt/:id.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type ReceiptData = {
  business: {
    name: string;
    street: string;
    postal_code: string;
    city: string;
    tax_number: string | null;
    vat_id: string | null;
  };
  order_number: string | null;
  created_at: string;
  payment_type: string;
  total_cents: number;
  items: { name: string; quantity: number; unit_price_cents: number; vat_percent: number | null }[];
  vat_amounts: { vat_percent: number | null; incl_vat_cents: number; vat_cents: number }[];
  tse: {
    serial_number: string | null;
    transaction_number: number | null;
    signature_counter: number | null;
    signature_value: string | null;
    signature_algorithm: string | null;
    time_format: string | null;
    time_start: string | null;
    time_end: string | null;
    qr_data: string | null;
  } | null;
  tse_outage: boolean;
};

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

const dateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date(iso))
    : "—";

export function ReceiptPage() {
  const [, params] = useRoute("/beleg/:id");
  const id = params?.id ?? "";
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    if (!id) {
      setStatus("notfound");
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/api/receipt/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setStatus("notfound");
        if (!res.ok) return setStatus("error");
        setReceipt((await res.json()) as ReceiptData);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return <Centered>Beleg wird geladen… <Sub>Loading receipt…</Sub></Centered>;
  }
  if (status === "notfound") {
    return <Centered>Beleg nicht gefunden. <Sub>Receipt not found.</Sub></Centered>;
  }
  if (status === "error" || !receipt) {
    return <Centered>Beleg konnte nicht geladen werden. <Sub>Failed to load receipt.</Sub></Centered>;
  }

  const business = receipt.business;

  return (
    <div className="min-h-screen bg-background py-6 px-4 flex justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm px-5 py-6 text-card-foreground">
        {/* Kopf */}
        <div className="text-center mb-5">
          <h1 className="font-serif text-xl font-semibold">{business.name}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {business.street} · {business.postal_code} {business.city}
          </p>
          {business.tax_number && (
            <p className="text-[12px] text-muted-foreground">St.-Nr. {business.tax_number}</p>
          )}
          {business.vat_id && (
            <p className="text-[12px] text-muted-foreground">USt-IdNr. {business.vat_id}</p>
          )}
        </div>

        <div className="border-t border-dashed border-border my-4" />

        <div className="flex justify-between text-[13px] text-muted-foreground mb-1">
          <span>Beleg / Receipt</span>
          <span>{dateTime(receipt.created_at)}</span>
        </div>
        {receipt.order_number && (
          <div className="flex justify-between text-[13px] text-muted-foreground mb-3">
            <span>Bestellnummer / Order no.</span>
            <span className="font-semibold text-foreground">{receipt.order_number}</span>
          </div>
        )}

        {/* Positionen */}
        <table className="w-full text-[14px] mb-3">
          <tbody>
            {receipt.items.map((item, index) => (
              <tr key={index} className="align-top">
                <td className="py-1 pr-2">
                  <span className="tabular-nums">{item.quantity}× </span>
                  {item.name}
                  <span className="text-muted-foreground text-[12px]"> ({item.vat_percent ?? "?"} % USt)</span>
                </td>
                <td className="py-1 text-right tabular-nums whitespace-nowrap">
                  {eur(item.unit_price_cents * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-border pt-2 flex justify-between font-semibold text-[16px] mb-1">
          <span>Summe / Total</span>
          <span className="tabular-nums">{eur(receipt.total_cents)}</span>
        </div>
        <p className="text-[13px] text-muted-foreground mb-3">
          Zahlart / Payment: {receipt.payment_type === "NON_CASH" ? "Kartenzahlung / Card" : receipt.payment_type}
        </p>

        {/* USt-Aufschlüsselung */}
        <table className="w-full text-[12.5px] text-muted-foreground mb-4">
          <thead>
            <tr className="text-left">
              <th className="font-medium">USt / VAT</th>
              <th className="font-medium text-right">Brutto / Gross</th>
              <th className="font-medium text-right">USt / VAT</th>
            </tr>
          </thead>
          <tbody>
            {receipt.vat_amounts.map((vat, index) => (
              <tr key={index}>
                <td>{vat.vat_percent ?? "?"} %</td>
                <td className="text-right tabular-nums">{eur(vat.incl_vat_cents)}</td>
                <td className="text-right tabular-nums">{eur(vat.vat_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-border my-4" />

        {/* TSE-Pflichtangaben (§6 KassenSichV) */}
        {receipt.tse ? (
          <div className="text-[11.5px] text-muted-foreground space-y-0.5 break-all">
            <p className="text-[12.5px] font-medium text-foreground mb-1">TSE-Signatur (KassenSichV)</p>
            <p>TSE-Seriennummer: {receipt.tse.serial_number ?? "—"}</p>
            <p>Transaktionsnummer: {receipt.tse.transaction_number ?? "—"}</p>
            <p>Signaturzähler: {receipt.tse.signature_counter ?? "—"}</p>
            <p>Vorgangsbeginn: {dateTime(receipt.tse.time_start)}</p>
            <p>Vorgangsende: {dateTime(receipt.tse.time_end)}</p>
            <p>Zeitformat: {receipt.tse.time_format ?? "—"}</p>
            <p>Signaturalgorithmus: {receipt.tse.signature_algorithm ?? "—"}</p>
            <p>Signatur: {receipt.tse.signature_value ?? "—"}</p>
            {receipt.tse.qr_data && (
              <div className="flex justify-center pt-4">
                <div className="bg-white p-3 rounded-xl border border-border">
                  <QRCodeSVG value={receipt.tse.qr_data} level="L" size={180} bgColor="#ffffff" fgColor="#000000" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            Beleg ohne TSE-Signatur erstellt — Ausfall der technischen
            Sicherheitseinrichtung. <span className="italic">Receipt issued during TSE outage.</span>
          </p>
        )}

        <p className="text-center text-[12px] text-muted-foreground mt-6">
          Vielen Dank für deinen Besuch! / Thank you for your visit!
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center text-foreground text-[16px]">
      <div>{children}</div>
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <span className="block text-[13px] text-muted-foreground mt-1">{children}</span>;
}
