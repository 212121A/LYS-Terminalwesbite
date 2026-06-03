-- Supabase SQL Editor (einmalig)
-- pending_orders: Session → Warenkorb-Snapshot vor Webhook-Freigabe
create table if not exists pending_orders (
  session_id text primary key,
  items text not null,
  created_at timestamptz not null default now()
);

-- orders: Lookup per Stripe Session (Success-Seite pollt order_number)
alter table if exists orders add column if not exists stripe_session_id text;

create index if not exists orders_stripe_session_id_idx on orders (stripe_session_id);

comment on column orders.stripe_session_id is 'Stripe Checkout Session ID (cs_…) für Kunden-Status/Polling';
