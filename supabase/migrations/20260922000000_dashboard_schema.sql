-- ============================================================================
-- MediStock IMS — dashboard schema
--
-- The first migration (20260908120000_init_schema.sql) only covered auth:
-- profiles + the Hospital Portal's login secret. Everything the dashboard
-- screen renders — the six KPI cards, the Inventory Trend and Stock
-- Movement charts, Recent Transactions, Urgent Alerts, and the header's
-- notification bell — is still reading from frontend/lib/mock-data.ts.
-- This migration adds the real tables (and a few views) that data will come
-- from once the frontend is wired up. See "Dashboard data" in
-- SUPABASE-BACKEND-README.md for exactly which mock-data.ts export maps to
-- which table/view below.
--
-- Same caveat as the first migration: written against Postgres/Supabase
-- syntax, not run against a live database. Run `supabase db reset` and
-- read the results before trusting it.
-- ============================================================================

-- --- suppliers ---------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

comment on table public.suppliers is
  'Backs the Total Suppliers KPI card and the (not yet built) Suppliers '
  'screen. Referenced by medicines.supplier_id and purchase_orders.supplier_id.';

-- --- medicines -----------------------------------------------------------
-- One row per catalogue item, not per unit — quantity_on_hand is a running
-- count kept in sync by the stock_transactions trigger below, the same way
-- a real inventory system works: you never edit quantity_on_hand by hand,
-- you record a transaction and let the trigger adjust it.
create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  category text not null default '',
  supplier_id uuid references public.suppliers (id) on delete set null,
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  expiry_date date,
  created_at timestamptz not null default now()
);

comment on table public.medicines is
  'One row per catalogue item. quantity_on_hand is maintained by the '
  'stock_transactions trigger, not edited directly — see '
  'apply_stock_transaction() below.';

create index medicines_supplier_id_idx on public.medicines (supplier_id);
create index medicines_expiry_date_idx on public.medicines (expiry_date);

-- --- stock_transactions ----------------------------------------------------
-- Backs Recent Transactions and the Stock Movement chart. Every stock
-- change — a delivery booked in, units dispensed, a return — is a row
-- here, never a direct update to medicines.quantity_on_hand.
create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references public.medicines (id) on delete cascade,
  type text not null check (type in ('stock_in', 'stock_out', 'return')),
  quantity integer not null check (quantity <> 0),
  status text not null default 'completed'
    check (status in ('completed', 'pending', 'rejected')),
  performed_by uuid references auth.users (id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.stock_transactions is
  'Append-only log. Backs Recent Transactions directly (order by '
  'created_at desc) and the Stock Movement chart (sum by month). '
  'quantity is always a positive count; type says the direction.';

create index stock_transactions_medicine_id_idx on public.stock_transactions (medicine_id);
create index stock_transactions_created_at_idx on public.stock_transactions (created_at desc);

-- Keep medicines.quantity_on_hand in sync automatically. Only a
-- *completed* transaction should move stock — a pending or rejected row
-- (like the REJECTED return in the mock data) records intent, not an
-- actual change yet.
create function public.apply_stock_transaction()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  delta integer;
begin
  if new.status <> 'completed' then
    return new;
  end if;

  delta := case new.type
    when 'stock_in' then new.quantity
    when 'return'   then new.quantity
    when 'stock_out' then -new.quantity
  end;

  update public.medicines
  set quantity_on_hand = greatest(0, quantity_on_hand + delta)
  where id = new.medicine_id;

  return new;
end;
$$;

create trigger stock_transactions_apply
  after insert on public.stock_transactions
  for each row execute procedure public.apply_stock_transaction();

-- --- purchase_orders ---------------------------------------------------------
-- Backs the "Supplier Delay" / "Purchase Order Delivered" alerts and the
-- future Orders screen. is_delayed is a plain column rather than something
-- computed from expected_date, because a delay is a fact someone (or an
-- integration) reports, not something Postgres can infer on its own.
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'delayed', 'delivered', 'cancelled')),
  expected_date date,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.purchase_orders is
  'One row per order placed with a supplier. status ''delayed'' drives '
  'the amber Supplier Delay alert; status ''delivered'' drives the green '
  'Purchase Order Delivered one.';

create index purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);

-- --- inventory_snapshots -----------------------------------------------------
-- Backs the Inventory Trend line chart's 1W/1M/1Y toggle. A snapshot table
-- rather than computing history from stock_transactions, because the chart
-- needs "total units on hand as of each day", and walking every
-- transaction back to day zero to reconstruct that gets slower the longer
-- the app has been running. One row per day is cheap to query and cheap to
-- keep: see the "Populating inventory_snapshots" note in
-- SUPABASE-BACKEND-README.md for the scheduled job that should insert into
-- this table once a day.
create table public.inventory_snapshots (
  snapshot_date date primary key,
  total_units integer not null,
  total_value numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

comment on table public.inventory_snapshots is
  'One row per day. Populated by a scheduled job (pg_cron or an Edge '
  'Function on a cron trigger) — nothing writes to this table on its own '
  'yet. Backs the Inventory Trend chart.';

-- --- notifications -------------------------------------------------------
-- One table backs both the header's notification bell (every row, newest
-- first) and the dashboard's Urgent Alerts panel (severity in ('danger',
-- 'warning') and not yet resolved) — they're the same underlying events,
-- just two different filters over them. See "Dashboard data" in
-- SUPABASE-BACKEND-README.md for both queries.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('danger', 'warning', 'info', 'success')),
  category text not null default '',
  title text not null,
  body text not null default '',
  action_label text,
  resolved boolean not null default false,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'Backs both the notification bell and the Urgent Alerts panel. '
  'read_by is a list of user ids rather than a per-user table, since '
  'notifications here are facility-wide, not per-recipient.';

create index notifications_created_at_idx on public.notifications (created_at desc);
create index notifications_unresolved_idx on public.notifications (resolved) where resolved = false;

-- --- RLS ----------------------------------------------------------------
-- Every table any signed-in user can see gets RLS enabled with an explicit
-- policy — same rule as the first migration. Nothing here is
-- administrator-only to READ: any authenticated staff member can see the
-- dashboard. Writing catalogue/supplier data is administrator-only;
-- recording a stock transaction is any authenticated user (a pharmacist
-- booking in a delivery shouldn't need admin rights).

alter table public.suppliers enable row level security;
alter table public.medicines enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.notifications enable row level security;

create policy "suppliers: read all"      on public.suppliers      for select using (auth.role() = 'authenticated');
create policy "medicines: read all"      on public.medicines      for select using (auth.role() = 'authenticated');
create policy "stock_transactions: read all" on public.stock_transactions for select using (auth.role() = 'authenticated');
create policy "purchase_orders: read all"    on public.purchase_orders    for select using (auth.role() = 'authenticated');
create policy "inventory_snapshots: read all" on public.inventory_snapshots for select using (auth.role() = 'authenticated');
create policy "notifications: read all"      on public.notifications      for select using (auth.role() = 'authenticated');

create policy "suppliers: administrators write"
  on public.suppliers for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'));

create policy "medicines: administrators write"
  on public.medicines for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'));

create policy "purchase_orders: administrators write"
  on public.purchase_orders for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrator'));

-- Any authenticated user can record a stock transaction (booking in a
-- delivery, dispensing units) — this is the normal pharmacist workflow,
-- not an admin-only action. Nobody can update or delete one after the
-- fact; that's what a new correcting transaction is for, same principle
-- as an accounting ledger.
create policy "stock_transactions: authenticated insert"
  on public.stock_transactions for insert
  with check (auth.role() = 'authenticated');

-- notifications and inventory_snapshots are written only by trusted
-- server-side code (triggers below, or a scheduled job using the
-- service_role key) — no insert/update policy for ordinary users,
-- mirroring hospital_login_secrets in the first migration.

-- --- Auto-generate notifications from real state ------------------------
-- Rather than something else remembering to insert a notification, these
-- triggers watch the tables that actually change and create/resolve
-- notifications from real state — the same "let the database enforce it"
-- approach as prevent_role_self_escalation() in the first migration.

create function public.notify_low_stock()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.quantity_on_hand <= new.reorder_point and
     (old is null or old.quantity_on_hand > old.reorder_point) then
    insert into public.notifications (severity, category, title, body, action_label)
    values (
      'danger', 'Stock',
      'Low Stock: ' || new.name,
      'Current: ' || new.quantity_on_hand || ' units. Reorder point: ' || new.reorder_point || '.',
      'CREATE ORDER'
    );
  elsif new.quantity_on_hand > new.reorder_point then
    update public.notifications
    set resolved = true
    where category = 'Stock' and title = 'Low Stock: ' || new.name and not resolved;
  end if;
  return new;
end;
$$;

create trigger medicines_notify_low_stock
  after insert or update of quantity_on_hand on public.medicines
  for each row execute procedure public.notify_low_stock();

create function public.notify_purchase_order_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  supplier_name text;
begin
  select name into supplier_name from public.suppliers where id = new.supplier_id;

  if new.status = 'delayed' and (old is null or old.status <> 'delayed') then
    insert into public.notifications (severity, category, title, body, action_label)
    values (
      'warning', 'Orders',
      'Supplier Delay: ' || coalesce(supplier_name, 'Unknown supplier'),
      'Shipment for ' || new.po_number || ' is delayed.',
      'CONTACT AGENT'
    );
  elsif new.status = 'delivered' and (old is null or old.status <> 'delivered') then
    insert into public.notifications (severity, category, title, body)
    values (
      'success', 'Orders',
      'Purchase Order Delivered',
      new.po_number || ' from ' || coalesce(supplier_name, 'Unknown supplier') || ' has arrived.'
    );
  end if;
  return new;
end;
$$;

create trigger purchase_orders_notify_status
  after insert or update of status on public.purchase_orders
  for each row execute procedure public.notify_purchase_order_status();

-- --- Dashboard KPI view ---------------------------------------------------
-- One row, six numbers — a single query for the whole KPI row instead of
-- six separate round trips. security_invoker means it runs with the
-- querying user's own RLS, same as querying the tables directly would.
create view public.dashboard_kpis
with (security_invoker = true)
as
select
  (select count(*) from public.medicines) as total_medicines,
  (select count(*) from public.suppliers where status = 'active') as total_suppliers,
  (select count(*) from public.medicines where quantity_on_hand <= reorder_point) as low_stock,
  (select count(*) from public.medicines
     where expiry_date is not null
       and expiry_date between current_date and current_date + interval '7 days') as expiring_soon,
  (select count(*) from public.medicines where expiry_date is not null and expiry_date < current_date) as expired,
  (select coalesce(sum(quantity_on_hand * unit_price), 0) from public.medicines) as total_value;

comment on view public.dashboard_kpis is
  'One row. Maps directly to the six KPIS entries in lib/mock-data.ts — '
  'see "Dashboard data" in SUPABASE-BACKEND-README.md.';

-- --- Stock movement view (Jan–Jun style bar chart) ----------------------
create view public.stock_movement_monthly
with (security_invoker = true)
as
select
  date_trunc('month', created_at)::date as month,
  coalesce(sum(quantity) filter (where type = 'stock_in'), 0) as stock_in,
  coalesce(sum(quantity) filter (where type = 'stock_out'), 0) as stock_out
from public.stock_transactions
where status = 'completed'
group by 1
order by 1;

comment on view public.stock_movement_monthly is
  'Backs the Stock Movement bar chart. The frontend mock data plots a '
  'single height per month — decide there whether that is stock_in, '
  'stock_out, or net (stock_in - stock_out) before wiring this up.';
