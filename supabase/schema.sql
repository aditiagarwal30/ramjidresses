-- Run this in the Supabase SQL editor for your project.
-- Stage 1: bills table, server-assigned bill_no, RLS for authenticated staff.

create table if not exists bills (
  id          uuid primary key,
  bill_no     text unique,
  customer    text,
  total       numeric(12,2) not null default 0,
  items       int not null default 0,
  qty         int not null default 0,
  snapshot    jsonb not null,
  pdf_data    jsonb,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists bills_created_at_idx on bills (created_at desc);
create index if not exists bills_alive_idx on bills (created_at desc) where deleted_at is null;

create sequence if not exists bill_no_seq start 1;

create or replace function assign_bill_no()
returns trigger
language plpgsql
as $$
begin
  if new.bill_no is null then
    new.bill_no := '#' || lpad(nextval('bill_no_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists bills_assign_bill_no on bills;
create trigger bills_assign_bill_no
  before insert on bills
  for each row execute function assign_bill_no();

alter table bills enable row level security;

drop policy if exists bills_read on bills;
create policy bills_read on bills
  for select to authenticated
  using (true);

drop policy if exists bills_insert on bills;
create policy bills_insert on bills
  for insert to authenticated
  with check (created_by = auth.uid());

-- update needed for soft delete (setting deleted_at). Any staff can delete any bill.
drop policy if exists bills_update on bills;
create policy bills_update on bills
  for update to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Rate catalog: one row per (brand, article, size). Visible & editable in
-- the Supabase dashboard. CSV upload from any device upserts here; all other
-- devices pull on next load.
-- ---------------------------------------------------------------------------
create table if not exists rates (
  brand       text not null,
  article     text not null default '',
  size        text not null,
  rate        numeric(10,2) not null,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  primary key (brand, article, size)
);

-- Singleton row tracking the last CSV upload (filename + when).
create table if not exists rate_sheet_meta (
  id          int primary key default 1,
  file_name   text,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  constraint rate_sheet_meta_singleton check (id = 1)
);

-- One-time migration from the old jsonb-blob design to per-row rates.
-- Safe to re-run: the do-block only fires while rate_sheets still exists.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'rate_sheets'
  ) then
    insert into rates (brand, article, size, rate, updated_by, updated_at)
    select
      upper(coalesce(r->>'brand', '')),
      upper(coalesce(r->>'article', '')),
      upper(coalesce(r->>'size', '')),
      (r->>'rate')::numeric,
      rs.updated_by,
      coalesce(rs.updated_at, now())
    from rate_sheets rs, jsonb_array_elements(rs.rates) r
    where rs.id = 1
      and coalesce(r->>'brand', '') <> ''
      and coalesce(r->>'size', '') <> ''
    on conflict (brand, article, size) do nothing;

    insert into rate_sheet_meta (id, file_name, updated_by, updated_at)
    select 1, file_name, updated_by, coalesce(updated_at, now())
    from rate_sheets where id = 1
    on conflict (id) do update
      set file_name  = excluded.file_name,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at;

    drop table rate_sheets cascade;
  end if;
end $$;

alter table rates enable row level security;

drop policy if exists rates_read on rates;
create policy rates_read on rates for select to authenticated using (true);
drop policy if exists rates_insert on rates;
create policy rates_insert on rates for insert to authenticated with check (true);
drop policy if exists rates_update on rates;
create policy rates_update on rates for update to authenticated using (true) with check (true);
drop policy if exists rates_delete on rates;
create policy rates_delete on rates for delete to authenticated using (true);

alter table rate_sheet_meta enable row level security;

drop policy if exists rsm_read on rate_sheet_meta;
create policy rsm_read on rate_sheet_meta for select to authenticated using (true);
drop policy if exists rsm_insert on rate_sheet_meta;
create policy rsm_insert on rate_sheet_meta for insert to authenticated with check (true);
drop policy if exists rsm_update on rate_sheet_meta;
create policy rsm_update on rate_sheet_meta for update to authenticated using (true) with check (true);
drop policy if exists rsm_delete on rate_sheet_meta;
create policy rsm_delete on rate_sheet_meta for delete to authenticated using (true);
