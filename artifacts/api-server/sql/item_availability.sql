-- Verfügbarkeits-Status je bestellbarem Item. Es existieren NUR Zeilen für
-- aktuell/zuletzt ausgeschaltete Items; keine Zeile = verfügbar.
--
-- Angewandt auf Supabase-Projekt "Bestellungen LYS" (ref: jandskwzlzyjsvpmdhls)
-- als Migration create_item_availability.
create table if not exists public.item_availability (
  item_id       text primary key,                       -- z.B. dish:e1, box:box-tofu, sauce:erdnuss
  mode          text not null check (mode in ('today','permanent')),
  sold_out_date date,                                    -- Geschäftstag (nur relevant bei mode='today')
  updated_at    timestamptz not null default now()
);

alter table public.item_availability enable row level security;

-- Lesen für alle (Terminal/Online nutzen den anon-Key). Schreiben NUR über den
-- API-Server mit Service-Role-Key (umgeht RLS) — daher keine write-Policy.
create policy "item_availability read for anon"
  on public.item_availability
  for select
  to anon, authenticated
  using (true);
