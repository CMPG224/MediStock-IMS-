create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'administrator';
$$;

create or replace function public.profile_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(full_name), ''), 'Unknown user')
  from public.profiles
  where id = p_user_id;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.write_activity_log(
  p_user_id uuid,
  p_user_label text,
  p_category text,
  p_action text,
  p_entity_type text default null,
  p_entity_label text default null,
  p_ip_address inet default null,
  p_result text default 'success'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  insert into public.activity_logs (
    user_id,
    user_label,
    category,
    action,
    entity_type,
    entity_label,
    ip_address,
    result
  )
  values (
    p_user_id,
    coalesce(p_user_label, public.profile_display_name(p_user_id)),
    p_category,
    p_action,
    p_entity_type,
    p_entity_label,
    p_ip_address,
    p_result
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.write_activity_log(uuid,text,text,text,text,text,inet,text) from public;

grant execute on function public.write_activity_log(uuid,text,text,text,text,text,inet,text)
to service_role;

create or replace function public.log_activity(
  p_category text,
  p_action text,
  p_entity_type text default null,
  p_entity_label text default null,
  p_result text default 'success'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if auth.role() = 'service_role' then
    insert into public.activity_logs (
      user_id,
      user_label,
      category,
      action,
      entity_type,
      entity_label,
      result
    )
    values (
      v_uid,
      public.profile_display_name(v_uid),
      p_category,
      p_action,
      p_entity_type,
      p_entity_label,
      p_result
    )
    returning id into v_id;

    return v_id;
  end if;

  raise exception 'direct activity log writes are not permitted';
end;
$$;

revoke all on function public.log_activity(text,text,text,text,text) from public;

grant execute on function public.log_activity(text,text,text,text,text)
to service_role;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_label text not null default '',
  category text not null
    check (category in ('inventory','orders','users','security','system')),
  action text not null,
  entity_type text,
  entity_label text,
  ip_address inet,
  result text not null default 'success'
    check (result in ('success','warning','failed')),
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx
on public.activity_logs (created_at desc);

create index if not exists activity_logs_user_id_idx
on public.activity_logs (user_id);

create index if not exists activity_logs_category_idx
on public.activity_logs (category);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs: administrators read all"
on public.activity_logs;

drop policy if exists "activity_logs: users read own"
on public.activity_logs;

create policy "activity_logs: administrators read all"
on public.activity_logs
for select
using (public.is_admin());

create policy "activity_logs: users read own"
on public.activity_logs
for select
using (auth.uid() = user_id);

revoke insert, update, delete
on public.activity_logs
from anon, authenticated;

grant select
on public.activity_logs
to authenticated;

grant insert
on public.activity_logs
to service_role;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_alerts boolean not null default true,
  low_stock_alerts boolean not null default true,
  expiry_notifications boolean not null default true,
  weekly_summary boolean not null default true,
  two_factor_enabled boolean not null default false,
  theme text not null default 'system'
    check (theme in ('light','dark','system')),
  accent_color text not null default '#00549A'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings: own read"
on public.user_settings;

drop policy if exists "user_settings: own insert"
on public.user_settings;

drop policy if exists "user_settings: own update"
on public.user_settings;

create policy "user_settings: own read"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy "user_settings: own insert"
on public.user_settings
for insert
with check (auth.uid() = user_id);

create policy "user_settings: own update"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists user_settings_updated_at_idx
on public.user_settings (updated_at desc);

drop trigger if exists user_settings_touch_updated_at
on public.user_settings;

create trigger user_settings_touch_updated_at
before update on public.user_settings
for each row
execute procedure public.touch_updated_at();

grant select, insert, update
on public.user_settings
to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into public.user_settings (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles
add column if not exists email text;

alter table public.profiles
add column if not exists is_active boolean not null default true;

alter table public.profiles
add column if not exists last_login_at timestamptz;

alter table public.profiles
add column if not exists permissions text[] not null default '{}';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (
  role in (
    'administrator',
    'pharmacist',
    'nurse',
    'staff',
    'manager'
  )
);

create index if not exists profiles_role_idx
on public.profiles (role);

create index if not exists profiles_active_idx
on public.profiles (is_active);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p.is_active, true)
    then p.role
    else null
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

drop policy if exists "profiles: administrators read all"
on public.profiles;

drop policy if exists "profiles: administrators update all"
on public.profiles;

create policy "profiles: administrators read all"
on public.profiles
for select
using (public.is_admin());

create policy "profiles: administrators update all"
on public.profiles
for update
using (
  public.is_admin()
  or auth.uid() = id
)
with check (
  public.is_admin()
  or auth.uid() = id
);

grant select, update
on public.profiles
to authenticated;

create or replace function public.profiles_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and not public.is_admin() then

    new.role := old.role;
    new.is_active := old.is_active;
    new.permissions := old.permissions;
    new.email := old.email;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_self_escalation
on public.profiles;

create trigger profiles_prevent_role_self_escalation
before update on public.profiles
for each row
execute procedure public.profiles_guard_privileged_fields();

create or replace function public.touch_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authenticated user required';
  end if;

  update public.profiles
  set last_login_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.touch_last_login()
to authenticated;

alter table public.medicines
add column if not exists generic_name text not null default '';

alter table public.medicines
add column if not exists manufacturer text not null default '';

alter table public.medicines
add column if not exists batch_number text not null default '';

alter table public.medicines
add column if not exists storage_location text not null default '';

alter table public.medicines
add column if not exists barcode text not null default '';

alter table public.medicines
add column if not exists temperature_condition text not null default 'room_temp';

alter table public.medicines
drop constraint if exists medicines_temperature_condition_check;

alter table public.medicines
add constraint medicines_temperature_condition_check
check (
  temperature_condition in (
    'room_temp',
    'refrigerated',
    'frozen'
  )
);

alter table public.medicines
drop constraint if exists medicines_reorder_point_check;

alter table public.medicines
add constraint medicines_reorder_point_positive
check (reorder_point > 0)
not valid;

create index if not exists medicines_generic_name_idx
on public.medicines (generic_name);

create index if not exists medicines_barcode_idx
on public.medicines (barcode)
where barcode <> '';

create index if not exists medicines_batch_number_idx
on public.medicines (batch_number);

alter table public.suppliers
add column if not exists featured_tier text;

alter table public.suppliers
add column if not exists rating numeric(2,1);

alter table public.suppliers
add column if not exists supplier_type text not null default '';

alter table public.suppliers
add column if not exists last_delivery_at timestamptz;

alter table public.suppliers
drop constraint if exists suppliers_featured_tier_check;

alter table public.suppliers
add constraint suppliers_featured_tier_check
check (
  featured_tier is null
  or featured_tier in (
    'primary',
    'secondary',
    'urgent'
  )
);

alter table public.suppliers
drop constraint if exists suppliers_rating_check;

alter table public.suppliers
add constraint suppliers_rating_check
check (
  rating is null
  or (
    rating >= 0
    and rating <= 5
  )
);

create index if not exists suppliers_status_idx
on public.suppliers (status);

create index if not exists suppliers_featured_tier_idx
on public.suppliers (featured_tier);

alter table public.stock_transactions
add column if not exists reference text;

alter table public.stock_transactions
add column if not exists department text not null default '';

alter table public.stock_transactions
add column if not exists batch_number text not null default '';

alter table public.stock_transactions
drop constraint if exists stock_transactions_type_check;

alter table public.stock_transactions
add constraint stock_transactions_type_check
check (
  type in (
    'stock_in',
    'stock_out',
    'damaged',
    'return',
    'expired'
  )
);

alter table public.stock_transactions
drop constraint if exists stock_transactions_quantity_check;

alter table public.stock_transactions
add constraint stock_transactions_quantity_positive
check (quantity > 0)
not valid;

create unique index if not exists stock_transactions_reference_unique
on public.stock_transactions (reference)
where reference is not null;

create sequence if not exists public.stock_transaction_reference_seq
start with 94800
increment by 1;

create or replace function public.assign_stock_transaction_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null
     or btrim(new.reference) = '' then

    new.reference :=
      'TX-' ||
      nextval('public.stock_transaction_reference_seq')::text;
  end if;

  if new.performed_by is null then
    new.performed_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists stock_transactions_assign_reference
on public.stock_transactions;

create trigger stock_transactions_assign_reference
before insert on public.stock_transactions
for each row
execute procedure public.assign_stock_transaction_reference();

create or replace function public.apply_stock_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := 0;
begin
  if new.status <> 'completed' then
    return new;
  end if;

  delta := case new.type
    when 'stock_in' then new.quantity
    when 'return' then new.quantity
    when 'stock_out' then -new.quantity
    when 'damaged' then -new.quantity
    when 'expired' then -new.quantity
    else 0
  end;

  update public.medicines
  set quantity_on_hand =
    greatest(0, quantity_on_hand + delta)
  where id = new.medicine_id;

  return new;
end;
$$;

grant execute on function public.apply_stock_transaction()
to service_role;

drop trigger if exists stock_transactions_apply
on public.stock_transactions;

create trigger stock_transactions_apply
after insert on public.stock_transactions
for each row
execute procedure public.apply_stock_transaction();

grant select, insert
on public.stock_transactions
to authenticated;

alter table public.purchase_orders
add column if not exists total_amount numeric(14,2) not null default 0;

alter table public.purchase_orders
add column if not exists priority text not null default 'normal';

alter table public.purchase_orders
add column if not exists approved_by uuid
references auth.users (id)
on delete set null;

alter table public.purchase_orders
add column if not exists approved_at timestamptz;

alter table public.purchase_orders
drop constraint if exists purchase_orders_status_check;

alter table public.purchase_orders
add constraint purchase_orders_status_check
check (
  status in (
    'pending',
    'delayed',
    'approved',
    'delivered',
    'cancelled'
  )
);

alter table public.purchase_orders
drop constraint if exists purchase_orders_priority_check;

alter table public.purchase_orders
add constraint purchase_orders_priority_check
check (
  priority in (
    'normal',
    'high',
    'critical'
  )
);

create sequence if not exists public.purchase_order_number_seq
start with 129
increment by 1;

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null
    references public.purchase_orders (id)
    on delete cascade,
  medicine_id uuid not null
    references public.medicines (id)
    on delete restrict,
  quantity integer not null
    check (quantity > 0),
  unit_cost numeric(12,2) not null
    check (unit_cost >= 0),
  line_total numeric(14,2)
    generated always as (quantity * unit_cost)
    stored,
  created_at timestamptz not null default now()
);

create index if not exists purchase_order_items_po_idx
on public.purchase_order_items (purchase_order_id);

create index if not exists purchase_order_items_medicine_idx
on public.purchase_order_items (medicine_id);

alter table public.purchase_order_items
enable row level security;

drop policy if exists "purchase_order_items: read all"
on public.purchase_order_items;

drop policy if exists "purchase_order_items: admin write"
on public.purchase_order_items;

drop policy if exists "purchase_order_items: pharmacist manager pending"
on public.purchase_order_items;

create policy "purchase_order_items: read all"
on public.purchase_order_items
for select
using (auth.role() = 'authenticated');

create policy "purchase_order_items: admin write"
on public.purchase_order_items
for all
using (public.is_admin())
with check (public.is_admin());

create policy "purchase_order_items: pharmacist manager pending"
on public.purchase_order_items
for all
using (
  public.current_app_role() in ('pharmacist','manager')
  and exists (
    select 1
    from public.purchase_orders po
    where po.id = purchase_order_id
      and po.status = 'pending'
  )
)
with check (
  public.current_app_role() in ('pharmacist','manager')
  and exists (
    select 1
    from public.purchase_orders po
    where po.id = purchase_order_id
      and po.status = 'pending'
  )
);

grant select
on public.purchase_order_items
to authenticated;

grant insert, update, delete
on public.purchase_order_items
to authenticated;

create or replace function public.assign_purchase_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.po_number is null
     or btrim(new.po_number) = '' then

    new.po_number :=
      'PO-' ||
      extract(
        year from coalesce(new.created_at, now())
      )::integer::text ||
      '-' ||
      lpad(
        nextval('public.purchase_order_number_seq')::text,
        5,
        '0'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_orders_assign_number
on public.purchase_orders;

create trigger purchase_orders_assign_number
before insert on public.purchase_orders
for each row
execute procedure public.assign_purchase_order_number();

create or replace function public.purchase_orders_stamp()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then

    if new.status = 'approved'
       and old.status is distinct from 'approved' then

      new.approved_at :=
        coalesce(new.approved_at, now());

      new.approved_by :=
        coalesce(new.approved_by, auth.uid());
    end if;

    if new.status = 'delivered'
       and old.status is distinct from 'delivered' then

      new.delivered_at :=
        coalesce(new.delivered_at, now());
    end if;

  elsif tg_op = 'INSERT' then

    if new.status = 'approved' then
      new.approved_at :=
        coalesce(new.approved_at, now());

      new.approved_by :=
        coalesce(new.approved_by, auth.uid());

    elsif new.status = 'delivered' then
      new.delivered_at :=
        coalesce(new.delivered_at, now());
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists purchase_orders_stamp
on public.purchase_orders;

create trigger purchase_orders_stamp
before insert or update of status
on public.purchase_orders
for each row
execute procedure public.purchase_orders_stamp();

create or replace function public.recalculate_purchase_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po uuid;
begin
  v_po := coalesce(
    new.purchase_order_id,
    old.purchase_order_id
  );

  update public.purchase_orders po
  set total_amount = coalesce(
    (
      select sum(poi.line_total)
      from public.purchase_order_items poi
      where poi.purchase_order_id = v_po
    ),
    0
  )
  where po.id = v_po;

  return coalesce(new, old);
end;
$$;

drop trigger if exists purchase_order_items_recalculate_total
on public.purchase_order_items;

create trigger purchase_order_items_recalculate_total
after insert or update or delete
on public.purchase_order_items
for each row
execute procedure public.recalculate_purchase_order_total();

create or replace function public.supplier_last_delivery_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered'
     and (
       tg_op = 'INSERT'
       or old.status is distinct from 'delivered'
     ) then

    update public.suppliers
    set last_delivery_at = greatest(
      coalesce(last_delivery_at, new.delivered_at),
      coalesce(new.delivered_at, now())
    )
    where id = new.supplier_id;
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_orders_supplier_delivery
on public.purchase_orders;

create trigger purchase_orders_supplier_delivery
after insert or update of status, delivered_at
on public.purchase_orders
for each row
execute procedure public.supplier_last_delivery_stamp();

drop policy if exists "purchase_orders: administrators write"
on public.purchase_orders;

drop policy if exists "purchase_orders: admin all"
on public.purchase_orders;

drop policy if exists "purchase_orders: pharmacist manager create"
on public.purchase_orders;

drop policy if exists "purchase_orders: manager update"
on public.purchase_orders;

create policy "purchase_orders: admin all"
on public.purchase_orders
for all
using (public.is_admin())
with check (public.is_admin());

create policy "purchase_orders: pharmacist manager create"
on public.purchase_orders
for insert
with check (
  public.current_app_role() in (
    'pharmacist',
    'manager'
  )
);

create policy "purchase_orders: manager update"
on public.purchase_orders
for update
using (
  public.current_app_role() = 'manager'
)
with check (
  public.current_app_role() = 'manager'
);

grant select, insert, update
on public.purchase_orders
to authenticated;

create table if not exists public.reports (
  slug text primary key,
  title text not null,
  description text not null default '',
  icon text not null default 'file-bar-chart',
  schedule_label text not null default '',
  last_run_at timestamptz
);

alter table public.reports
enable row level security;

drop policy if exists "reports: signed in read"
on public.reports;

drop policy if exists "reports: administrators write"
on public.reports;

create policy "reports: signed in read"
on public.reports
for select
using (auth.role() = 'authenticated');

create policy "reports: administrators write"
on public.reports
for all
using (public.is_admin())
with check (public.is_admin());

grant select
on public.reports
to authenticated;

grant insert, update, delete
on public.reports
to authenticated;

insert into public.reports (
  slug,
  title,
  description,
  icon,
  schedule_label
)
values
  (
    'low-stock-report',
    'Low Stock Report',
    'Medicines at or below their reorder point.',
    'triangle-alert',
    'On demand'
  ),
  (
    'expiry-report',
    'Expiry Report',
    'Expired and soon-to-expire medicines.',
    'calendar-clock',
    'Daily'
  ),
  (
    'supplier-performance',
    'Supplier Performance',
    'Supplier delivery and expenditure performance.',
    'truck',
    'Monthly'
  ),
  (
    'stock-turnover',
    'Stock Turnover',
    'Monthly stock movement and turnover.',
    'refresh-cw',
    'Monthly'
  ),
  (
    'monthly-expenditure',
    'Monthly Expenditure',
    'Purchase expenditure by month.',
    'wallet',
    'Monthly'
  )
on conflict (slug) do nothing;

create or replace view public.user_stats
with (security_invoker = true)
as
select
  count(*) filter (
    where is_active
  ) as active_users,

  count(*) filter (
    where not is_active
  ) as inactive_users,

  count(*) as total_users,

  count(*) filter (
    where role = 'administrator'
  ) as administrators,

  count(*) filter (
    where role = 'manager'
  ) as managers,

  count(*) filter (
    where role = 'pharmacist'
  ) as pharmacists,

  count(*) filter (
    where role = 'nurse'
  ) as nurses,

  count(*) filter (
    where role = 'staff'
  ) as staff

from public.profiles;

create or replace view public.medicine_inventory
with (security_invoker = true)
as
select
  m.id,
  m.name,
  m.generic_name,
  m.sku,
  m.category,
  m.manufacturer,
  m.supplier_id,
  s.name as supplier_name,
  m.unit_price,
  m.quantity_on_hand,
  m.reorder_point,
  m.expiry_date,
  m.batch_number,
  m.storage_location,
  m.barcode,
  m.temperature_condition,

  case
    when m.quantity_on_hand <= m.reorder_point
      then 'low_stock'

    when m.expiry_date is not null
      and m.expiry_date < current_date
      then 'expired'

    when m.expiry_date is not null
      and m.expiry_date <= current_date + 90
      then 'expiring_soon'

    when m.quantity_on_hand >= m.reorder_point * 3
      then 'well_stocked'

    else 'in_stock'
  end as stock_status,

  case
    when m.expiry_date is null
      then null
    else m.expiry_date - current_date
  end as days_to_expiry,

  (
    m.quantity_on_hand * m.unit_price
  )::numeric(14,2) as inventory_value,

  m.created_at

from public.medicines m

left join public.suppliers s
  on s.id = m.supplier_id;

create or replace view public.transaction_feed
with (security_invoker = true)
as
select
  st.id,
  st.reference,
  st.medicine_id,
  m.name as medicine_name,
  m.sku,
  st.type,
  st.quantity,
  st.status,
  st.performed_by,
  public.profile_display_name(
    st.performed_by
  ) as performed_by_name,
  st.note,
  st.department,
  st.batch_number,
  st.created_at

from public.stock_transactions st

join public.medicines m
  on m.id = st.medicine_id;

create or replace view public.purchase_order_stats
with (security_invoker = true)
as
select
  po.id,
  po.po_number,
  po.supplier_id,
  s.name as supplier_name,
  po.status,
  po.expected_date,
  po.delivered_at,
  po.created_at,
  po.total_amount,
  po.priority,
  po.approved_by,
  public.profile_display_name(
    po.approved_by
  ) as approved_by_name,
  po.approved_at,
  count(poi.id)::integer as item_count,
  coalesce(
    sum(poi.quantity),
    0
  )::integer as total_units

from public.purchase_orders po

join public.suppliers s
  on s.id = po.supplier_id

left join public.purchase_order_items poi
  on poi.purchase_order_id = po.id

group by
  po.id,
  s.name;

create or replace view public.supplier_directory
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.contact_name,
  s.contact_email,
  s.contact_phone,
  s.status,
  s.featured_tier,
  s.rating,
  s.supplier_type,
  s.last_delivery_at,

  count(distinct po.id)::integer
    as purchase_order_count,

  coalesce(
    sum(po.total_amount),
    0
  )::numeric(14,2)
    as total_expenditure

from public.suppliers s

left join public.purchase_orders po
  on po.supplier_id = s.id

group by s.id;

create or replace view public.monthly_expenditure
with (security_invoker = true)
as
select
  date_trunc(
    'month',
    po.created_at
  )::date as month,

  coalesce(
    sum(po.total_amount)
      filter (
        where po.status <> 'cancelled'
      ),
    0
  )::numeric(14,2) as expenditure

from public.purchase_orders po

group by 1

order by 1;

create or replace view public.inventory_value_by_category
with (security_invoker = true)
as
select
  coalesce(
    nullif(m.category, ''),
    'Uncategorised'
  ) as category,

  coalesce(
    sum(
      m.quantity_on_hand *
      m.unit_price
    ),
    0
  )::numeric(14,2) as inventory_value,

  sum(
    m.quantity_on_hand
  )::bigint as total_units

from public.medicines m

group by 1

order by 1;

create or replace view public.supplier_performance
with (security_invoker = true)
as
select
  s.id as supplier_id,
  s.name as supplier_name,

  count(po.id)::integer as orders,

  count(po.id)
    filter (
      where po.status = 'delivered'
    )::integer as delivered_orders,

  count(po.id)
    filter (
      where po.status = 'delayed'
    )::integer as delayed_orders,

  coalesce(
    sum(po.total_amount)
      filter (
        where po.status <> 'cancelled'
      ),
    0
  )::numeric(14,2) as expenditure,

  case
    when count(po.id) = 0
      then 0

    else round(
      100.0 *
      count(po.id)
        filter (
          where po.status = 'delivered'
        )
      / count(po.id),
      1
    )
  end as delivery_rate

from public.suppliers s

left join public.purchase_orders po
  on po.supplier_id = s.id

group by s.id;

create or replace view public.stock_turnover_monthly
with (security_invoker = true)
as
select
  date_trunc(
    'month',
    st.created_at
  )::date as month,

  coalesce(
    sum(st.quantity)
      filter (
        where st.type = 'stock_out'
          and st.status = 'completed'
      ),
    0
  ) as units_out,

  coalesce(
    sum(st.quantity)
      filter (
        where st.type in (
          'stock_in',
          'return'
        )
        and st.status = 'completed'
      ),
    0
  ) as units_in,

  case
    when coalesce(
      sum(st.quantity)
        filter (
          where st.type = 'stock_in'
            and st.status = 'completed'
        ),
      0
    ) = 0
    then 0

    else round(
      sum(st.quantity)
        filter (
          where st.type = 'stock_out'
            and st.status = 'completed'
        )::numeric
      /
      nullif(
        sum(st.quantity)
          filter (
            where st.type = 'stock_in'
              and st.status = 'completed'
          ),
        0
      ),
      4
    )
  end as turnover_ratio

from public.stock_transactions st

group by 1

order by 1;

grant select on
  public.user_stats,
  public.medicine_inventory,
  public.transaction_feed,
  public.purchase_order_stats,
  public.supplier_directory,
  public.monthly_expenditure,
  public.inventory_value_by_category,
  public.supplier_performance,
  public.stock_turnover_monthly
to authenticated;

create or replace function public.activity_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then

    insert into public.activity_logs (
      user_id,
      user_label,
      category,
      action,
      entity_type,
      entity_label,
      result
    )
    values (
      auth.uid(),
      public.profile_display_name(
        auth.uid()
      ),

      case
        when tg_table_name = 'purchase_orders'
          then 'orders'

        when tg_table_name = 'stock_transactions'
          or tg_table_name = 'medicines'
          then 'inventory'

        when tg_table_name = 'profiles'
          then 'users'

        when tg_table_name = 'suppliers'
          then 'system'

        else 'system'
      end,

      tg_op,
      tg_table_name,

      case
        when tg_op = 'DELETE'
          then old.id::text
        else new.id::text
      end,

      'success'
    );

  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists medicines_activity_log
on public.medicines;

create trigger medicines_activity_log
after insert or update or delete
on public.medicines
for each row
execute procedure public.activity_log_trigger();

drop trigger if exists stock_transactions_activity_log
on public.stock_transactions;

create trigger stock_transactions_activity_log
after insert or update or delete
on public.stock_transactions
for each row
execute procedure public.activity_log_trigger();

drop trigger if exists purchase_orders_activity_log
on public.purchase_orders;

create trigger purchase_orders_activity_log
after insert or update or delete
on public.purchase_orders
for each row
execute procedure public.activity_log_trigger();

drop trigger if exists suppliers_activity_log
on public.suppliers;

create trigger suppliers_activity_log
after insert or update or delete
on public.suppliers
for each row
execute procedure public.activity_log_trigger();

drop trigger if exists profiles_activity_log
on public.profiles;

create trigger profiles_activity_log
after update on public.profiles
for each row
execute procedure public.activity_log_trigger();