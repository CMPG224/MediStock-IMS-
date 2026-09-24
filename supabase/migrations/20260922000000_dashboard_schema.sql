-- suppliers
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

-- medicines: quantity_on_hand is kept in sync by a trigger, never edited directly.
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

create index medicines_supplier_id_idx on public.medicines (supplier_id);
create index medicines_expiry_date_idx on public.medicines (expiry_date);

-- stock_transactions: append-only ledger of every stock change.
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

create index stock_transactions_medicine_id_idx on public.stock_transactions (medicine_id);
create index stock_transactions_created_at_idx on public.stock_transactions (created_at desc);

-- Only a completed transaction moves stock.
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
    when 'return' then new.quantity
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

-- purchase_orders
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

create index purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);

-- inventory_snapshots: one row per day. Nothing fills it yet (Section 4 of the guide).
create table public.inventory_snapshots (
  snapshot_date date primary key,
  total_units integer not null,
  total_value numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

-- notifications: feeds the bell and the Urgent Alerts panel.
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

create index notifications_created_at_idx on public.notifications (created_at desc);
create index notifications_unresolved_idx on public.notifications (resolved) where resolved = false;

-- Row Level Security
alter table public.suppliers enable row level security;
alter table public.medicines enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.notifications enable row level security;

create policy "suppliers: read all" on public.suppliers
  for select using (auth.role() = 'authenticated');
create policy "medicines: read all" on public.medicines
  for select using (auth.role() = 'authenticated');
create policy "stock_transactions: read all" on public.stock_transactions
  for select using (auth.role() = 'authenticated');
create policy "purchase_orders: read all" on public.purchase_orders
  for select using (auth.role() = 'authenticated');
create policy "inventory_snapshots: read all" on public.inventory_snapshots
  for select using (auth.role() = 'authenticated');
create policy "notifications: read all" on public.notifications
  for select using (auth.role() = 'authenticated');

create policy "suppliers: administrators write" on public.suppliers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "medicines: administrators write" on public.medicines
  for all using (public.is_admin()) with check (public.is_admin());
create policy "purchase_orders: administrators write" on public.purchase_orders
  for all using (public.is_admin()) with check (public.is_admin());

create policy "stock_transactions: authenticated insert" on public.stock_transactions
  for insert with check (auth.role() = 'authenticated');

-- Low-stock notification: created automatically, resolved once restocked.
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
    where category = 'Stock'
      and title = 'Low Stock: ' || new.name
      and not resolved;
  end if;
  return new;
end;
$$;

create trigger medicines_notify_low_stock
  after insert or update of quantity_on_hand on public.medicines
  for each row execute procedure public.notify_low_stock();

-- Purchase order notifications (delayed / delivered).
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

-- Views for the dashboard.
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
  (select count(*) from public.medicines
     where expiry_date is not null and expiry_date < current_date) as expired,
  (select coalesce(sum(quantity_on_hand * unit_price), 0) from public.medicines) as total_value;

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

-- Grants: newer Supabase projects don't auto-grant access to new tables.
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select on
  public.suppliers, public.medicines, public.stock_transactions,
  public.purchase_orders, public.inventory_snapshots, public.notifications
  to authenticated;
grant insert, update, delete on
  public.suppliers, public.medicines, public.purchase_orders
  to authenticated;
grant insert on public.stock_transactions to authenticated;
grant select on public.dashboard_kpis, public.stock_movement_monthly to authenticated;
grant select, insert, update on public.inventory_snapshots to service_role;