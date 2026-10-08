-- ============================================================================
-- MediStock IMS — app pages schema
--
-- The first two migrations covered auth (profiles) and the dashboard
-- (medicines, suppliers, stock_transactions, purchase_orders, notifications,
-- snapshots + KPI views). This one is purely additive on top of them and
-- adds what the other seven pages need: Medicine, Suppliers, Transactions,
-- Orders, Reports, Users, Settings and Logs. It never edits the earlier
-- migrations — where an existing check constraint or function has to change
-- it is dropped/replaced by name here.
--
-- House rules carried over: RLS is enabled on EVERY new table with explicit
-- policies (each one commented with why it exists), every view is
-- security_invoker, every table/view carries a comment.
--
-- Section map:
--   0. Shared helpers (is_admin, current_app_role, touch_updated_at, ...)
--   1. profiles       (Users page) + role guard + handle_new_user
--   2. user_settings  (Settings page)
--   3. medicines      (Medicine page) + medicine_inventory view
--   4. suppliers      (Suppliers page) + supplier_directory view
--   5. stock_transactions (Transactions page) + transaction_feed view
--   6. purchase_orders / purchase_order_items (Orders page) + stats view
--   7. reports catalogue + report views (Reports page)
--   8. activity_logs  (Logs page) + log triggers
-- ============================================================================


-- ============================================================================
-- 0. Shared helpers
-- ============================================================================

-- Returns the caller's role, or NULL when they are unknown or deactivated.
-- SECURITY DEFINER on purpose: a policy on `profiles` that selects from
-- `profiles` itself makes Postgres raise "infinite recursion detected in
-- policy for relation profiles" for any non-superuser. Reading the role
-- inside a definer function (which runs as the table owner and therefore is
-- not subject to RLS) is the standard way out.
create function public.current_app_role()
returns text
language plpgsql
stable
security definer set search_path = public
as $$
declare
  r text;
begin
  -- plpgsql (not sql) so the body is not validated until first call; it
  -- references profiles.is_active, which section 1 adds further down.
  select p.role into r from public.profiles p
  where p.id = auth.uid() and p.is_active;
  return r;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_app_role() = 'administrator', false)
$$;

-- A user's display name and nothing else. Views like transaction_feed need
-- "who did this" for every row, but profiles RLS (correctly) only lets a
-- pharmacist read their own row — and we do not want to open profiles (email,
-- permissions) to every staff member just to show a name. This exposes only
-- full_name.
create function public.profile_display_name(p_id uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select nullif(full_name, '') from public.profiles where id = p_id
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.profile_display_name(uuid) from public, anon;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.profile_display_name(uuid) to authenticated, service_role;


-- ============================================================================
-- 8a. activity_logs table + writer (created early: later triggers call it)
-- ============================================================================
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  user_label text not null default 'System',
  category text not null
    check (category in ('inventory', 'orders', 'users', 'security', 'system')),
  action text not null,
  entity_type text not null default '',
  entity_label text not null default '',
  ip_address inet,
  result text not null default 'success'
    check (result in ('success', 'warning', 'failed')),
  created_at timestamptz not null default now()
);

comment on table public.activity_logs is
  'Append-only audit trail backing the Logs page. Written only by triggers '
  'and the SECURITY DEFINER helpers write_activity_log()/log_activity(); '
  'no client insert/update/delete policy exists. user_label is a snapshot '
  '(''System'' for automated events) so rows stay readable after a user is '
  'deleted (user_id is then set null). The Logs page shows a role column: '
  'join profiles.role via user_id (null user_id = automated/unauthenticated).';

create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index activity_logs_category_idx on public.activity_logs (category);
create index activity_logs_user_id_idx on public.activity_logs (user_id);

alter table public.activity_logs enable row level security;

-- Administrators audit everything (Logs page / "User Auditing").
create policy "activity_logs: administrators read all"
  on public.activity_logs for select
  using (public.is_admin());

-- Everyone else can see the trail of their own actions only.
create policy "activity_logs: read own"
  on public.activity_logs for select
  using (user_id = auth.uid());

-- Deliberately NO insert/update/delete policy: with RLS on, that means no
-- client can forge, edit or erase a log line. Triggers and service_role
-- (which bypasses RLS) are the only writers.

-- Internal writer. p_user null / unknown => 'System'. IP comes from the
-- PostgREST request headers when present (x-forwarded-for), else null.
create function public.write_activity_log(
  p_user uuid,
  p_category text,
  p_action text,
  p_entity_type text default '',
  p_entity_label text default '',
  p_result text default 'success'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid;
  v_label text;
  v_ip inet;
begin
  select p.id, coalesce(nullif(p.full_name, ''), nullif(p.email, ''), 'Unknown user')
    into v_uid, v_label
  from public.profiles p
  where p.id = p_user;

  if not found then
    v_uid := null;
    v_label := 'System';
  end if;

  begin
    v_ip := nullif(split_part(
      (nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for'),
      ',', 1), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.activity_logs
    (user_id, user_label, category, action, entity_type, entity_label, ip_address, result)
  values
    (v_uid, v_label, p_category, p_action, coalesce(p_entity_type, ''), coalesce(p_entity_label, ''), v_ip, p_result);
end;
$$;

-- The helper named in the spec: logs on behalf of the current caller.
-- Not callable from the browser (a client-callable logger would let anyone
-- forge audit lines); server-side code / service_role only. Triggers below
-- run as the function owner and are unaffected by these grants.
create function public.log_activity(
  p_category text,
  p_action text,
  p_entity_type text default '',
  p_entity_label text default '',
  p_result text default 'success'
)
returns void
language sql
security definer set search_path = public
as $$
  select public.write_activity_log(auth.uid(), p_category, p_action, p_entity_type, p_entity_label, p_result)
$$;

revoke all on function public.write_activity_log(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.log_activity(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.write_activity_log(uuid, text, text, text, text, text) to service_role;
grant execute on function public.log_activity(text, text, text, text, text) to service_role;


-- ============================================================================
-- 2. user_settings (Settings page) — created before handle_new_user uses it
-- ============================================================================
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_alerts boolean not null default true,
  low_stock_alerts boolean not null default true,
  expiry_notifications boolean not null default true,
  weekly_summary boolean not null default false,
  two_factor_enabled boolean not null default false,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  accent_color text not null default '#0B4C8C' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is
  'Per-user preferences for the Settings page; one row per auth user, '
  'created by handle_new_user. two_factor_enabled is only a preference '
  'flag — real TOTP enrolment is Supabase Auth MFA and is not wired here.';

create trigger user_settings_touch
  before update on public.user_settings
  for each row execute procedure public.touch_updated_at();

alter table public.user_settings enable row level security;

-- Preferences are private: each user reads, creates and edits ONLY their own
-- row. No delete policy — the row goes away with the auth user (cascade).
create policy "user_settings: read own"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "user_settings: insert own"
  on public.user_settings for insert
  with check (user_id = auth.uid());

create policy "user_settings: update own"
  on public.user_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 1. profiles (Users page)
-- ============================================================================
alter table public.profiles
  add column email text,
  add column is_active boolean not null default true,
  add column last_login_at timestamptz,
  add column permissions text[] not null default '{}';

alter table public.profiles
  add constraint profiles_permissions_check
  check (permissions <@ array['inventory_overrides', 'financial_reporting', 'user_auditing']::text[]);

-- Allow the 'manager' (Inventory Manager) role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('administrator', 'pharmacist', 'manager', 'nurse', 'staff'));

comment on column public.profiles.email is
  'Copy of auth.users.email made at sign-up by handle_new_user (not kept in '
  'sync afterwards). Locked against non-admin edits by the guard trigger.';
comment on column public.profiles.is_active is
  'Admin-controlled switch on the Users page. NOTE: nothing in Supabase Auth '
  'reads this — it gates the RLS helpers here, not sign-in itself.';
comment on column public.profiles.permissions is
  'Fine-grained grants shown as toggles on the Users page. Allowed values: '
  'inventory_overrides, financial_reporting, user_auditing.';

-- Backfill for rows that existed before this migration.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Replace handle_new_user: same behaviour as before, plus copy the email and
-- create the user's settings row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill settings rows for existing users.
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- The first migration's "administrators read all" policy selected from
-- profiles inside a policy ON profiles, which Postgres rejects with
-- "infinite recursion detected in policy" for every non-superuser query.
-- Recreated on top of is_admin() (definer, no RLS re-entry). Same intent.
drop policy "profiles: administrators read all" on public.profiles;

-- Administrators read every profile (Users page, Logs role column).
create policy "profiles: administrators read all"
  on public.profiles for select
  using (public.is_admin());

-- Administrators can edit any profile (role, is_active, permissions) from
-- the Users page. The trigger below still decides WHICH columns a
-- non-admin may touch on their own row.
create policy "profiles: administrators update all"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Rewritten role guard. Rules:
--   * service_role, or no JWT at all (auth.uid() null: migrations, seed,
--     psql as owner)                          -> anything goes
--   * an active administrator                  -> may change role,
--     is_active, permissions, email of any profile
--   * everyone else (own-row updates only, via RLS) -> role, is_active,
--     permissions and email are silently kept at their old values; the
--     rest of the update (e.g. full_name) still goes through, and the
--     attempt is recorded in activity_logs as a failed security event.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.permissions is distinct from old.permissions
     or new.email is distinct from old.email then
    perform public.write_activity_log(
      auth.uid(), 'security', 'Blocked privileged profile change',
      'user', coalesce(nullif(old.full_name, ''), old.id::text), 'failed');
  end if;

  new.role := old.role;
  new.is_active := old.is_active;
  new.permissions := old.permissions;
  new.email := old.email;
  return new;
end;
$$;
-- (the trigger profiles_prevent_role_self_escalation from migration 1 keeps
-- pointing at this function name, so it picks up the new body.)

-- Called by the frontend right after sign-in. SECURITY DEFINER so it can
-- stamp the row without giving users a general "update own profile" path
-- for this column; only ever touches auth.uid()'s own row.
create function public.touch_last_login()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles set last_login_at = now() where id = auth.uid();
  perform public.write_activity_log(auth.uid(), 'security', 'User signed in', 'user', '', 'success');
end;
$$;

revoke all on function public.touch_last_login() from public, anon;
grant execute on function public.touch_last_login() to authenticated, service_role;

create view public.user_stats
with (security_invoker = true)
as
select
  count(*) filter (where is_active and role = 'administrator') as admins,
  count(*) filter (where is_active and role = 'pharmacist')    as pharmacists,
  count(*) filter (where is_active and role = 'manager')       as managers,
  count(*) filter (where not is_active and last_login_at is null) as pending,
  count(*) filter (where is_active)                            as total_active
from public.profiles;

comment on view public.user_stats is
  'One row for the Users page stat cards and the "N Active Users" line. '
  'pending = is_active = false AND never logged in (an invited-but-not-yet-'
  'activated account). Runs with the caller''s RLS: an administrator sees '
  'the whole org, anyone else only counts their own row.';


-- ============================================================================
-- 3. medicines (Medicine page)
-- ============================================================================
alter table public.medicines
  add column generic_name text not null default '',
  add column batch_number text,
  add column barcode text,
  add column storage_location text not null default '',
  add column temperature_condition text not null default 'room_temp';

alter table public.medicines
  add constraint medicines_batch_number_check
    check (batch_number is null or length(btrim(batch_number)) > 0),
  add constraint medicines_barcode_check
    check (barcode is null or barcode ~ '^[0-9]{12,14}$'),
  add constraint medicines_temperature_condition_check
    check (temperature_condition in ('room_temp', 'refrigerated', 'frozen'));

-- "Min alert stock" on the form must be > 0. NOT VALID = enforced for every
-- new/updated row but existing rows (older default was 0) are not re-checked.
alter table public.medicines
  add constraint medicines_reorder_point_positive
    check (reorder_point > 0) not valid;

comment on column public.medicines.batch_number is
  'Free text (list shows AMX-2026-0034, the form regex is stricter); only '
  'constraint is non-empty when present. The form-level regex belongs in the UI.';
comment on column public.medicines.unit_price is
  'The form''s "unit cost" (frontend field unitCost).';

create view public.medicine_inventory
with (security_invoker = true)
as
select
  m.id,
  m.name,
  m.generic_name,
  m.sku,
  m.category,
  m.supplier_id,
  s.name as supplier_name,
  m.batch_number,
  m.barcode,
  m.storage_location,
  m.temperature_condition,
  m.unit_price,
  m.quantity_on_hand,
  m.reorder_point,
  m.expiry_date,
  (m.expiry_date - current_date) as days_to_expiry,
  case
    when m.quantity_on_hand <= m.reorder_point then 'low_stock'
    when m.expiry_date is not null and m.expiry_date <= current_date + 90 then 'expiring_soon'
    when m.quantity_on_hand >= 3 * m.reorder_point then 'well_stocked'
    else 'in_stock'
  end as stock_status,
  m.created_at
from public.medicines m
left join public.suppliers s on s.id = m.supplier_id;

comment on view public.medicine_inventory is
  'Medicine page list + featured cards. stock_status precedence (first '
  'match wins): low_stock (qty <= reorder_point) > expiring_soon (expiry '
  'within 90 days, INCLUDING already-expired: see days_to_expiry < 0) > '
  'well_stocked (qty >= 3 x reorder_point) > in_stock. The list UI can '
  'fold well_stocked into "In Stock"; the featured cards use it as-is.';


-- ============================================================================
-- 4. suppliers (Suppliers page)
-- ============================================================================
alter table public.suppliers
  add column featured_tier text,
  add column rating numeric(2, 1),
  add column supplier_type text not null default '',
  add column last_delivery_at timestamptz;

alter table public.suppliers
  add constraint suppliers_featured_tier_check
    check (featured_tier is null or featured_tier in ('primary', 'secondary', 'urgent')),
  add constraint suppliers_rating_check
    check (rating is null or (rating >= 0 and rating <= 5));

comment on column public.suppliers.featured_tier is
  'Badge on the featured supplier cards; null = not featured.';
comment on column public.suppliers.last_delivery_at is
  'Kept up to date by sync_supplier_last_delivery() when a PO is delivered; '
  'can also be set by hand for history that predates purchase_orders.';

-- (supplier_directory is created after purchase_orders gets its new status.)


-- ============================================================================
-- 5. stock_transactions (Transactions page)
-- ============================================================================
alter table public.stock_transactions drop constraint if exists stock_transactions_type_check;
alter table public.stock_transactions
  add constraint stock_transactions_type_check
  check (type in ('stock_in', 'stock_out', 'damaged', 'return', 'expired'));

-- The old check was <> 0, which lets a negative quantity flip the direction
-- of a stock_out. Quantity is a positive count; type carries the sign.
-- NOT VALID so pre-existing rows are not re-checked.
alter table public.stock_transactions
  add constraint stock_transactions_quantity_positive check (quantity > 0) not valid;

alter table public.stock_transactions
  add column reference text unique,
  add column department text not null default '',
  add column batch_number text;

-- Actor defaults to the caller, so the frontend does not have to send it.
alter table public.stock_transactions alter column performed_by set default auth.uid();

comment on column public.stock_transactions.reference is
  'Human-readable id, ''TX-94821'' (the UI prefixes ''#''). Generated by '
  'stock_transactions_set_reference from a sequence starting at 94800.';

create sequence public.stock_transaction_ref_seq start with 94800;

create function public.set_stock_transaction_reference()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.reference is null then
    new.reference := 'TX-' || nextval('public.stock_transaction_ref_seq');
  end if;
  return new;
end;
$$;

create trigger stock_transactions_set_reference
  before insert on public.stock_transactions
  for each row execute procedure public.set_stock_transaction_reference();

-- Backfill references for rows recorded before this migration (oldest first).
do $$
declare r record;
begin
  for r in select id from public.stock_transactions where reference is null order by created_at, id loop
    update public.stock_transactions
    set reference = 'TX-' || nextval('public.stock_transaction_ref_seq')
    where id = r.id;
  end loop;
end;
$$;

-- Direction: stock_in and return add; stock_out, damaged and expired subtract.
create or replace function public.apply_stock_transaction()
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
    when 'stock_in'  then new.quantity
    when 'return'    then new.quantity
    when 'stock_out' then -new.quantity
    when 'damaged'   then -new.quantity
    when 'expired'   then -new.quantity
  end;

  update public.medicines
  set quantity_on_hand = greatest(0, quantity_on_hand + delta)
  where id = new.medicine_id;

  return new;
end;
$$;

-- Tightened: a user may only record transactions as themselves (the ledger
-- is the audit trail; performed_by must not be forgeable).
drop policy "stock_transactions: authenticated insert" on public.stock_transactions;
create policy "stock_transactions: authenticated insert"
  on public.stock_transactions for insert
  with check (auth.role() = 'authenticated' and performed_by = auth.uid());

create view public.transaction_feed
with (security_invoker = true)
as
select
  t.id,
  t.reference,
  t.type,
  t.quantity,
  t.status,
  t.medicine_id,
  m.name as medicine_name,
  m.sku,
  coalesce(t.batch_number, m.batch_number) as batch_number,
  t.department,
  t.note,
  t.performed_by,
  public.profile_display_name(t.performed_by) as performed_by_name,
  t.created_at
from public.stock_transactions t
join public.medicines m on m.id = t.medicine_id
order by t.created_at desc;

comment on view public.transaction_feed is
  'Transactions table + Live Timeline, newest first. performed_by_name comes '
  'from profile_display_name() (full_name only, works for every role); null '
  'performed_by = system/automated. quantity is always positive: derive the '
  'sign in the UI from type (stock_in/return = +, the rest = -).';


-- ============================================================================
-- 6. purchase_orders / purchase_order_items (Orders page)
-- ============================================================================
alter table public.purchase_orders drop constraint if exists purchase_orders_status_check;
alter table public.purchase_orders
  add constraint purchase_orders_status_check
  check (status in ('pending', 'approved', 'delayed', 'delivered', 'cancelled'));

alter table public.purchase_orders
  add column total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  add column priority text not null default 'normal'
    check (priority in ('normal', 'high', 'critical')),
  add column approved_by uuid references auth.users (id) on delete set null,
  add column approved_at timestamptz;

comment on column public.purchase_orders.total_amount is
  'Derived: kept equal to sum(purchase_order_items.line_total) by a trigger '
  'whenever items change. Only set it by hand for an order with no items.';

-- --- PO number generator ----------------------------------------------------
create sequence public.po_number_seq start with 129;

create function public.set_purchase_order_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- BEFORE triggers run before NOT NULL is checked, so a null po_number
  -- from the client is filled in here rather than rejected.
  if new.po_number is null or btrim(new.po_number) = '' then
    new.po_number := 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.po_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger purchase_orders_set_number
  before insert on public.purchase_orders
  for each row execute procedure public.set_purchase_order_number();

-- --- Approval / delivery stamping -------------------------------------------
create function public.stamp_purchase_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    if tg_op = 'INSERT' then
      -- an order inserted already-approved keeps explicit values (seed/import)
      new.approved_at := coalesce(new.approved_at, now());
      new.approved_by := coalesce(new.approved_by, auth.uid());
    else
      -- moving to approved always stamps who/when, ignoring client values
      new.approved_at := now();
      new.approved_by := auth.uid();
    end if;
  end if;

  if new.status = 'delivered' and new.delivered_at is null then
    new.delivered_at := now();
  end if;
  return new;
end;
$$;

create trigger purchase_orders_stamp
  before insert or update on public.purchase_orders
  for each row execute procedure public.stamp_purchase_order();

-- Delivered PO => supplier's last_delivery_at moves forward (never back).
create function public.sync_supplier_last_delivery()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'delivered' and new.delivered_at is not null then
    update public.suppliers
    set last_delivery_at = greatest(coalesce(last_delivery_at, new.delivered_at), new.delivered_at)
    where id = new.supplier_id;
  end if;
  return new;
end;
$$;

create trigger purchase_orders_sync_supplier
  after insert or update of status, delivered_at on public.purchase_orders
  for each row execute procedure public.sync_supplier_last_delivery();

-- --- purchase_order_items -----------------------------------------------------
create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(10, 2) not null check (unit_cost >= 0),
  line_total numeric(12, 2) generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now()
);

comment on table public.purchase_order_items is
  'Line items of a purchase order. line_total is generated; '
  'purchase_orders.total_amount is the trigger-maintained sum of it.';

create index purchase_order_items_po_idx on public.purchase_order_items (purchase_order_id);
create index purchase_order_items_medicine_idx on public.purchase_order_items (medicine_id);

create function public.recalc_purchase_order_total()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ids uuid[];
begin
  ids := case tg_op
    when 'INSERT' then array[new.purchase_order_id]
    when 'DELETE' then array[old.purchase_order_id]
    else array[new.purchase_order_id, old.purchase_order_id]
  end;

  update public.purchase_orders po
  set total_amount = coalesce((
    select sum(i.line_total) from public.purchase_order_items i where i.purchase_order_id = po.id
  ), 0)
  where po.id = any(ids);

  return null;
end;
$$;

create trigger purchase_order_items_recalc
  after insert or update or delete on public.purchase_order_items
  for each row execute procedure public.recalc_purchase_order_total();

alter table public.purchase_order_items enable row level security;

-- Read: same as purchase_orders — any signed-in user.
create policy "purchase_order_items: read all"
  on public.purchase_order_items for select
  using (auth.role() = 'authenticated');

-- Administrators may change items on any order.
create policy "purchase_order_items: administrators write"
  on public.purchase_order_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- Pharmacists and managers build orders, so they may edit items — but only
-- while the order is still 'pending' (an approved order's lines are frozen).
create policy "purchase_order_items: staff write while pending"
  on public.purchase_order_items for all
  using (
    public.current_app_role() in ('pharmacist', 'manager')
    and exists (select 1 from public.purchase_orders po
                where po.id = purchase_order_id and po.status = 'pending')
  )
  with check (
    public.current_app_role() in ('pharmacist', 'manager')
    and exists (select 1 from public.purchase_orders po
                where po.id = purchase_order_id and po.status = 'pending')
  );

-- Additional purchase_orders policies (the administrators-write policy from
-- migration 2 stays as is).
-- Pharmacists/managers can raise a new order, but only as 'pending'.
create policy "purchase_orders: pharmacists and managers create pending"
  on public.purchase_orders for insert
  with check (public.current_app_role() in ('pharmacist', 'manager') and status = 'pending');

-- Inventory Managers approve/cancel/etc. orders (the role's job per the Users page).
create policy "purchase_orders: managers update"
  on public.purchase_orders for update
  using (public.current_app_role() = 'manager')
  with check (public.current_app_role() = 'manager');

create view public.purchase_order_stats
with (security_invoker = true)
as
select
  count(*) filter (where status = 'pending')  as pending_approval,
  count(*) filter (where status = 'approved') as approved_orders,
  count(*) filter (where status = 'delivered'
                     and delivered_at >= date_trunc('month', now())) as delivered_mtd,
  coalesce(sum(total_amount) filter (where status = 'delivered'
                     and delivered_at >= date_trunc('month', now())), 0)::numeric(12, 2) as delivered_mtd_value,
  count(*) as total_orders
from public.purchase_orders;

comment on view public.purchase_order_stats is
  'One row: the Orders page stat cards. delivered_mtd counts POs delivered '
  'since the 1st of the current month (server time zone).';

-- --- supplier_directory (needs the final PO status list) ---------------------
create view public.supplier_directory
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.supplier_type,
  s.featured_tier,
  s.rating,
  s.contact_name,
  s.contact_email,
  s.contact_phone,
  s.status,
  (select count(*) from public.medicines m where m.supplier_id = s.id) as sku_count,
  (select count(*) from public.purchase_orders po where po.supplier_id = s.id) as total_orders,
  (select count(*) from public.purchase_orders po
     where po.supplier_id = s.id and po.status in ('pending', 'approved', 'delayed')) as active_orders,
  greatest(
    (select max(po.delivered_at) from public.purchase_orders po where po.supplier_id = s.id),
    s.last_delivery_at
  ) as last_delivery,
  s.created_at
from public.suppliers s;

comment on view public.supplier_directory is
  'Suppliers page: featured cards (featured_tier not null) and the directory '
  'table. active_orders = purchase orders in pending/approved/delayed; '
  'last_delivery = latest delivered_at (or suppliers.last_delivery_at if newer).';


-- ============================================================================
-- 7. Reports
-- ============================================================================
create table public.reports (
  slug text primary key,
  title text not null,
  description text not null default '',
  icon text not null default '',
  schedule_label text,
  last_run_at timestamptz
);

comment on table public.reports is
  'Catalogue behind the "Available Reports" cards. schedule_label is a fixed '
  'caption (''Weekly Auto-run''); when it is null the card should show '
  '''Updated <relative time>'' derived from last_run_at.';

alter table public.reports enable row level security;

-- Every signed-in user can see which reports exist.
create policy "reports: read all"
  on public.reports for select
  using (auth.role() = 'authenticated');

-- Only administrators manage the catalogue.
create policy "reports: administrators write"
  on public.reports for all
  using (public.is_admin())
  with check (public.is_admin());

create view public.monthly_expenditure
with (security_invoker = true)
as
with months as (
  select generate_series(
    date_trunc('month', current_date) - interval '11 months',
    date_trunc('month', current_date),
    interval '1 month')::date as month
)
select
  m.month,
  coalesce(sum(po.total_amount), 0)::numeric(14, 2) as total
from months m
left join public.purchase_orders po
  on date_trunc('month', po.created_at)::date = m.month
 and po.status <> 'cancelled'
group by m.month
order by m.month;

comment on view public.monthly_expenditure is
  'Reports > Monthly Expenditure: last 12 calendar months (zero-filled), '
  'sum of total_amount of non-cancelled POs by created month. The "previous '
  'period" series is the same view shifted a year by the frontend.';

create view public.inventory_value_by_category
with (security_invoker = true)
as
with v as (
  select
    coalesce(nullif(category, ''), 'Uncategorised') as category,
    sum(quantity_on_hand * unit_price) as value
  from public.medicines
  group by 1
)
select
  category,
  value::numeric(14, 2) as value,
  round(100 * value / nullif(sum(value) over (), 0), 1) as pct
from v
order by value desc;

comment on view public.inventory_value_by_category is
  'Reports > Inventory Value: sum(qty x unit_price) per category, with pct of total.';

create view public.supplier_performance
with (security_invoker = true)
as
select
  s.id as supplier_id,
  s.name as supplier,
  count(*) filter (where po.status = 'delivered') as delivered_orders,
  count(*) as counted_orders,
  round(100.0 * count(*) filter (where po.status = 'delivered') / count(*))::int as fulfillment_rate
from public.suppliers s
join public.purchase_orders po on po.supplier_id = s.id and po.status <> 'cancelled'
group by s.id, s.name
order by fulfillment_rate desc, s.name;

comment on view public.supplier_performance is
  'Reports > Supplier Performance: fulfillment_rate = delivered / non-'
  'cancelled POs, whole percent. Suppliers with no counted order are omitted. '
  'This is delivery completion, NOT on-time delivery (no promised-date '
  'comparison).';

create view public.stock_turnover_monthly
with (security_invoker = true)
as
with outs as (
  select date_trunc('month', created_at)::date as month, sum(quantity) as units_out
  from public.stock_transactions
  where status = 'completed' and type = 'stock_out'
  group by 1
),
snap as (
  select date_trunc('month', snapshot_date)::date as month, avg(total_units) as avg_units
  from public.inventory_snapshots
  group by 1
)
select
  x.month,
  x.units_out,
  x.avg_units_on_hand,
  round(x.units_out / nullif(x.avg_units_on_hand, 0), 2) as turnover
from (
  select
    coalesce(o.month, s.month) as month,
    coalesce(o.units_out, 0) as units_out,
    round(s.avg_units, 1) as avg_units_on_hand
  from outs o
  full join snap s on s.month = o.month
) x
where x.month >= date_trunc('month', current_date) - interval '11 months'
order by x.month;

comment on view public.stock_turnover_monthly is
  'Reports > Stock Turnover: units dispensed (completed stock_out only; '
  'damaged/expired are wastage, not turnover) divided by the month''s average '
  'total_units from inventory_snapshots. turnover is null for months with no '
  'snapshots (the snapshot job is not built yet).';


-- ============================================================================
-- 8b. Activity-log triggers
-- ============================================================================
create function public.log_medicine_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.write_activity_log(auth.uid(), 'inventory', 'Created medicine record',
    'Medicine', new.name);
  return new;
end;
$$;
create trigger medicines_log_insert
  after insert on public.medicines
  for each row execute procedure public.log_medicine_insert();

create function public.log_stock_transaction()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  med text;
begin
  select name into med from public.medicines where id = new.medicine_id;
  perform public.write_activity_log(
    coalesce(new.performed_by, auth.uid()),
    'inventory',
    case new.type
      when 'stock_in'  then 'Stock in recorded'
      when 'stock_out' then 'Stock out recorded'
      when 'damaged'   then 'Damaged stock recorded'
      when 'return'    then 'Return recorded'
      when 'expired'   then 'Expired stock recorded'
    end,
    'Medicine',
    coalesce(med, '') || ' (' || new.reference || ')',
    case new.status when 'completed' then 'success' when 'pending' then 'warning' else 'failed' end);
  return new;
end;
$$;
create trigger stock_transactions_log
  after insert on public.stock_transactions
  for each row execute procedure public.log_stock_transaction();

create function public.log_purchase_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_activity_log(auth.uid(), 'orders', 'Purchase order created', 'Order', new.po_number);
  elsif new.status is distinct from old.status then
    perform public.write_activity_log(
      auth.uid(), 'orders',
      case new.status
        when 'approved'  then 'Purchase order approved'
        when 'delivered' then 'Purchase order delivered'
        when 'cancelled' then 'Purchase order cancelled'
        when 'delayed'   then 'Purchase order delayed'
        else 'Purchase order status changed to ' || new.status
      end,
      'Order', new.po_number,
      case when new.status in ('cancelled', 'delayed') then 'warning' else 'success' end);
  end if;
  return new;
end;
$$;
create trigger purchase_orders_log
  after insert or update of status on public.purchase_orders
  for each row execute procedure public.log_purchase_order();

create function public.log_profile_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  who text := coalesce(nullif(new.full_name, ''), new.email, new.id::text);
begin
  if new.role is distinct from old.role then
    perform public.write_activity_log(auth.uid(), 'users', 'User role changed', 'User', who);
  end if;
  if new.is_active is distinct from old.is_active then
    perform public.write_activity_log(auth.uid(), 'users',
      case when new.is_active then 'User account reactivated' else 'User account deactivated' end,
      'User', who);
  end if;
  if new.permissions is distinct from old.permissions then
    perform public.write_activity_log(auth.uid(), 'users', 'User permissions changed', 'User', who);
  end if;
  return new;
end;
$$;
create trigger profiles_log_change
  after update of role, is_active, permissions on public.profiles
  for each row execute procedure public.log_profile_change();

create function public.log_supplier_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.write_activity_log(auth.uid(), 'orders', 'Supplier added', 'Supplier', new.name);
  return new;
end;
$$;
create trigger suppliers_log_insert
  after insert on public.suppliers
  for each row execute procedure public.log_supplier_insert();
