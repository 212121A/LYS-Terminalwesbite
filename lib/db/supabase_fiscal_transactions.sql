-- Fiskalisierung Terminal-Kartenzahlung (KassenSichV / fiskaly Cloud-TSE).
-- Manuell im Supabase SQL-Editor ausführen (Projekt: Bestellungen LYS).
-- Eine Zeile = ein Bezahlvorgang am Terminal. id ist zugleich das öffentliche
-- Beleg-Token (/beleg/:id) — unguessbare UUID, deshalb kein weiterer Schutz nötig.

create table if not exists fiscal_transactions (
  id uuid primary key default gen_random_uuid(),
  state text not null default 'created'
    check (state in ('created','waiting_payment','finalizing','completed','payment_failed','canceled','tse_error')),
  payment_intent_id text unique,
  reader_id text,

  -- TSE (fiskaly SIGN DE)
  tse_tx_id uuid,
  tse_tx_number bigint,
  tse_serial text,
  tse_signature_counter bigint,
  tse_signature_value text,
  tse_signature_algorithm text,
  tse_time_format text,
  tse_time_start timestamptz,
  tse_time_end timestamptz,
  tse_qr_data text,
  tse_raw jsonb,

  -- Beleg-Inhalt (§6 KassenSichV + DSFinV-K)
  items jsonb not null,          -- [{id,name,quantity,unit_price_cents,vat_rate}]
  vat_amounts jsonb,             -- [{vat_rate, incl_vat_cents, vat_cents}]
  total_cents integer not null,
  payment_type text not null default 'NON_CASH',
  order_number text,
  business_day date,             -- Berliner Geschäftstag, für Tagesabschluss
  closing_id uuid,               -- fiskaly cash_point_closing, gesetzt nach Export
  n8n_posted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fiscal_transactions_business_day_idx
  on fiscal_transactions (business_day);
create index if not exists fiscal_transactions_state_idx
  on fiscal_transactions (state);

-- RLS an, KEINE Policies: nur service_role (Backend) kommt ran.
-- Der Beleg wird über den Backend-Endpoint /api/receipt/:id ausgeliefert.
alter table fiscal_transactions enable row level security;
