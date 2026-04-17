-- Supabase → SQL Editor → New query → ausführen (einmalig)
-- Alternativ: DATABASE_URL setzen und im Repo: pnpm --filter @workspace/db run push

create table if not exists stripe_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  payment_status text,
  customer_email text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stripe_orders_created_at_idx on stripe_orders (created_at desc);
