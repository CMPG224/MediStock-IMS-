-- ============================================================================
-- Local dev test accounts. Runs automatically on `supabase db reset`.
--
-- Inserting directly into auth.users isn't Supabase's normal signup path —
-- normally that happens through the Auth API. This is a documented pattern
-- Supabase itself uses for LOCAL DEV SEEDING ONLY (crypt() + gen_salt('bf')
-- produces a bcrypt hash matching what Supabase Auth expects) — never do
-- this against a real production project; use the Auth API or the
-- dashboard there instead.
-- ============================================================================

-- pgcrypto provides crypt()/gen_salt(), used below to hash the seed
-- passwords the same way Supabase Auth would.
create extension if not exists pgcrypto;

-- --- Two ordinary email/password accounts -----------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@medistock.test',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dr. Test Administrator"}'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'pharmacist@medistock.test',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Pharmacist"}'
  );

-- The handle_new_user trigger (see migrations/) fires on insert into
-- auth.users, so both profiles rows above already exist — this just sets
-- their role, since the trigger only sets full_name.
-- The role guard (prevent_role_self_escalation) is switched off just for
-- these seed updates: on real Supabase a seed run has no JWT so the guard
-- lets it through, but under a stubbed auth.uid() it would not.
alter table public.profiles disable trigger profiles_prevent_role_self_escalation;
update public.profiles set role = 'administrator' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'pharmacist'     where id = '00000000-0000-0000-0000-000000000002';
alter table public.profiles enable trigger profiles_prevent_role_self_escalation;

-- --- One Hospital Portal account --------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'hospital-test@medistock.test',
  crypt('not-used-directly-see-hospital_login_secrets', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Hospital Portal Test Account"}'
);

update public.profiles
set role = 'staff', facility_code = 'WC-GEN-014', staff_id = 'STF-0001'
where id = '00000000-0000-0000-0000-000000000003';

-- This is the row the hospital-login Edge Function actually authenticates
-- against — the real password backing this account, that the human never
-- sees or types.
insert into public.hospital_login_secrets (user_id, facility_code, staff_id, secret_password)
values (
  '00000000-0000-0000-0000-000000000003',
  'WC-GEN-014',
  'STF-0001',
  'seed-only-secret-do-not-reuse-93f7c2'
);

-- ============================================================================
-- Dashboard data — a small set of rows so the dashboard has something real
-- to show once it's wired up, echoing a few of the exact items in
-- frontend/lib/mock-data.ts (Amoxicillin, Ibuprofen, Global Pharma, ...)
-- without trying to reproduce all 1,284 medicines the KPI card claims.
-- ============================================================================

insert into public.suppliers (id, name, contact_name, contact_email, status) values
  ('10000000-0000-0000-0000-000000000001', 'MediLink Supplies', 'Naledi Khumalo', 'orders@medilink.example', 'active'),
  ('10000000-0000-0000-0000-000000000002', 'Global Pharma',     'Given Moyo',     'orders@globalpharma.example', 'active');

insert into public.medicines (id, name, sku, category, supplier_id, unit_price, quantity_on_hand, reorder_point, expiry_date) values
  ('20000000-0000-0000-0000-000000000001', 'Amoxicillin 500mg',  'MED-AMOX-500', 'Antibiotic',   '10000000-0000-0000-0000-000000000001', 4.20,  12, 50, current_date + 120),
  ('20000000-0000-0000-0000-000000000002', 'Ibuprofen 400mg',    'MED-IBU-400',  'Analgesic',    '10000000-0000-0000-0000-000000000001', 1.85, 340, 80, current_date + 200),
  ('20000000-0000-0000-0000-000000000003', 'Paracetamol Liquid', 'MED-PARA-LIQ', 'Analgesic',    '10000000-0000-0000-0000-000000000001', 2.10, 210, 60, current_date + 90),
  ('20000000-0000-0000-0000-000000000004', 'Insulin Glargine',   'MED-INS-GLAR', 'Endocrine',    '10000000-0000-0000-0000-000000000002', 18.60, 64, 40, current_date + 5);

-- Amoxicillin's seeded quantity_on_hand (12) is already below its reorder
-- point (50), so the insert above fires medicines_notify_low_stock and
-- creates the "Low Stock: Amoxicillin" notification on its own — nothing
-- further needed here.
--
-- Note a deliberate difference from frontend/lib/mock-data.ts: the mock
-- TRANSACTIONS array pairs a +250 Amoxicillin restock with a still-active
-- "Low Stock: Amoxicillin" alert, which is static data that was never made
-- to agree with itself. Here, a completed restock genuinely resolves the
-- alert (medicines_notify_low_stock's elsif branch) — so the transaction
-- below restocks Paracetamol instead, leaving Amoxicillin's alert active
-- to demonstrate the resolve path separately: update its quantity_on_hand
-- yourself after `supabase db reset` and watch the notification disappear.
insert into public.stock_transactions (medicine_id, type, quantity, status, performed_by, created_at) values
  ('20000000-0000-0000-0000-000000000003', 'stock_in',  250, 'completed', '00000000-0000-0000-0000-000000000002', now() - interval '2 minutes'),
  ('20000000-0000-0000-0000-000000000002', 'stock_out',  45, 'completed', '00000000-0000-0000-0000-000000000002', now() - interval '15 minutes'),
  ('20000000-0000-0000-0000-000000000003', 'stock_in',  100, 'pending',   '00000000-0000-0000-0000-000000000002', now() - interval '1 hour'),
  ('20000000-0000-0000-0000-000000000004', 'return',      2, 'rejected',  '00000000-0000-0000-0000-000000000002', now() - interval '3 hours');

insert into public.purchase_orders (po_number, supplier_id, status, expected_date) values
  ('PO-2026-00128', '10000000-0000-0000-0000-000000000002', 'delayed',   current_date + 2),
  ('PO-2026-00127', '10000000-0000-0000-0000-000000000001', 'delivered', current_date - 1);

-- ============================================================================
-- App pages data (migration 20260930000000_app_pages_schema.sql)
-- Mirrors the frontend mocks in frontend/lib/mock/*.ts. Everything below runs
-- as the seed/owner role (RLS bypassed). Trigger side effects are expected:
-- transactions/orders/medicines/suppliers each write activity_logs rows, and
-- stock changes can raise notifications.
-- ============================================================================

-- --- More users: an Inventory Manager and a not-yet-activated invitee --------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'manager@medistock.test',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Inventory Manager"}'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'invited@medistock.test',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Invited Pharmacist"}'
  );

-- Roles / activity / permissions. Guard switched off for the same reason as above.
alter table public.profiles disable trigger profiles_prevent_role_self_escalation;
update public.profiles set permissions = array['inventory_overrides','user_auditing'], last_login_at = now() - interval '2 minutes'
  where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set permissions = array['inventory_overrides'], last_login_at = now() - interval '1 hour'
  where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set role = 'manager', permissions = array['financial_reporting'], last_login_at = now() - interval '1 day'
  where id = '00000000-0000-0000-0000-000000000004';
-- Invited pharmacist: never logged in and switched off => counts as "pending".
update public.profiles set role = 'pharmacist', is_active = false
  where id = '00000000-0000-0000-0000-000000000005';
alter table public.profiles enable trigger profiles_prevent_role_self_escalation;

-- Settings rows already exist for all five users (handle_new_user); vary two.
update public.user_settings set weekly_summary = true, two_factor_enabled = true, theme = 'system', accent_color = '#0B7A54'
  where user_id = '00000000-0000-0000-0000-000000000001';
update public.user_settings set theme = 'dark'
  where user_id = '00000000-0000-0000-0000-000000000002';

-- --- Suppliers -------------------------------------------------------------
update public.suppliers set supplier_type = 'Regional Supplier', contact_phone = '+27 11 555-0101', rating = 4.4
  where id = '10000000-0000-0000-0000-000000000001';
update public.suppliers set supplier_type = 'Equipment & Drugs', contact_phone = '+27 11 555-0102', rating = 4.1
  where id = '10000000-0000-0000-0000-000000000002';

insert into public.suppliers
  (id, name, contact_name, contact_email, contact_phone, status, featured_tier, rating, supplier_type, last_delivery_at) values
  ('10000000-0000-0000-0000-000000000003', 'BioLogix Pharma',   'Sarah Jenkins',   's.jenkins@biologix.com', '+27 69 012-3456', 'active',   'primary',   4.9, 'Tier 1 Partner',        now() - interval '6 days'),
  ('10000000-0000-0000-0000-000000000004', 'Global Med Inc.',   'Mark Thompson',   'contact@globalmed.co',   '+27 79 987-6543', 'active',   'secondary', 4.7, 'Equipment & Drugs',     now() - interval '12 days'),
  ('10000000-0000-0000-0000-000000000005', 'Apex Vaccines Ltd', 'Elena Rodriguez', 'e.rodriguez@apex.uk',    '+27 60 234-5678', 'inactive', 'urgent',    4.2, 'Specialized Logistics', now() - interval '30 days'),
  ('10000000-0000-0000-0000-000000000006', 'NovaMed Dist.',     'James Wilson',    'orders@novamed.io',      '+27 61 876-5432', 'active',   null,        4.0, 'Regional Supplier',     now() - interval '18 days'),
  ('10000000-0000-0000-0000-000000000007', 'PharmaCorp Global', 'Lerato Dlamini',  'orders@pharmacorp.example', '', 'active', null, 4.3, 'Wholesaler', null),
  ('10000000-0000-0000-0000-000000000008', 'SurgicalPro Ltd.',  'Pieter van Wyk',  'sales@surgicalpro.example', '', 'active', null, 3.8, 'Surgical Supplies', null),
  ('10000000-0000-0000-0000-000000000009', 'BioTech Solutions', 'Ayesha Patel',    'orders@biotech.example',    '', 'active', null, 4.5, 'Specialised Drugs', null),
  ('10000000-0000-0000-0000-000000000010', 'NovaHealth Inc.',   'Thabo Mokoena',   'orders@novahealth.example', '', 'active', null, 4.1, 'Regional Supplier', null);

-- --- Medicines ---------------------------------------------------------------
update public.medicines set category = 'Antibiotics', generic_name = 'Amoxicillin trihydrate', batch_number = 'AMX-2026-0034', storage_location = 'Shelf A-01'
  where id = '20000000-0000-0000-0000-000000000001';
update public.medicines set category = 'Analgesics', generic_name = 'Ibuprofen', batch_number = 'IBU-2026-0112', storage_location = 'Shelf A-03', barcode = '6001234500017'
  where id = '20000000-0000-0000-0000-000000000002';
update public.medicines set category = 'Analgesics', generic_name = 'Paracetamol', batch_number = 'PAR-2026-0150', storage_location = 'Shelf A-04'
  where id = '20000000-0000-0000-0000-000000000003';
update public.medicines set category = 'Chronic Care', generic_name = 'Insulin glargine', batch_number = 'INS-2026-0088', storage_location = 'Cold Room 1', temperature_condition = 'refrigerated'
  where id = '20000000-0000-0000-0000-000000000004';

-- Metformin is inserted at 374 on purpose: the seeded Metformin transactions
-- further down (+300 in, -188 out, -6 damaged) net +106, landing on the
-- mock's 480 once they have run through apply_stock_transaction().
insert into public.medicines
  (id, name, generic_name, sku, category, supplier_id, batch_number, barcode, storage_location, temperature_condition, unit_price, quantity_on_hand, reorder_point, expiry_date) values
  ('20000000-0000-0000-0000-000000000005', 'Metformin 500mg',     'Metformin hydrochloride', 'MED-MET-500', 'Chronic Care', '10000000-0000-0000-0000-000000000006', 'MET-2026-0201', '6001234500055', 'Shelf B-04',   'room_temp',    3.40,  374, 150, date '2027-03-10'),
  ('20000000-0000-0000-0000-000000000006', 'Lisinopril 10mg',     'Lisinopril',              'MED-LIS-010', 'Cardiology',   '10000000-0000-0000-0000-000000000003', 'LIS-2026-0301', null,            'Shelf B-06',   'room_temp',    2.90,  260, 100, current_date + 300),
  ('20000000-0000-0000-0000-000000000007', 'Atorvastatin 20mg',   'Atorvastatin calcium',    'MED-ATO-020', 'Cardiology',   '10000000-0000-0000-0000-000000000003', 'ATO-2026-0177', null,            'Shelf B-07',   'room_temp',    4.75,  410, 120, current_date + 420),
  ('20000000-0000-0000-0000-000000000008', 'Salbutamol Inhaler',  'Salbutamol sulfate',      'MED-SAL-INH', 'Emergency',    '10000000-0000-0000-0000-000000000004', 'SAL-2026-0044', '600123450008',  'Emergency Cabinet 2', 'room_temp', 42.00, 55, 30, current_date + 75),
  ('20000000-0000-0000-0000-000000000009', 'Surgical Gauze Pack', 'Sterile gauze',           'MED-GAU-PCK', 'Emergency',    '10000000-0000-0000-0000-000000000008', 'GAU-2026-0920', null,            'Store Room C',  'room_temp',  105.00,  90,  40, current_date + 700),
  ('20000000-0000-0000-0000-000000000010', 'Hepatitis B Vaccine', 'HBsAg recombinant',       'MED-HEPB-VAC','Vaccines',     '10000000-0000-0000-0000-000000000005', 'HBV-2026-0012', '60012345000123','Cold Room 2',   'refrigerated',165.00, 120,  40, current_date + 180);

-- --- Purchase orders + items (mirrors the Orders page) -------------------------
-- The seed lines below insert orders in bulk, so the per-status alert
-- trigger is off for them (it would raise ~10 "delivered" notifications on
-- the dashboard). Order activity_logs rows are still written.
alter table public.purchase_orders disable trigger purchase_orders_notify_status;

-- Items for the two orders that the dashboard section already created.
insert into public.purchase_order_items (purchase_order_id, medicine_id, quantity, unit_cost)
select po.id, x.med, x.qty, x.cost
from (values
  ('PO-2026-00127', '20000000-0000-0000-0000-000000000005'::uuid,  50, 84.01),   -- R4,200.50
  ('PO-2026-00128', '20000000-0000-0000-0000-000000000004'::uuid,  20, 18.60)    -- R372.00
) as x(po_number, med, qty, cost)
join public.purchase_orders po on po.po_number = x.po_number;

update public.purchase_orders set priority = 'normal', created_at = now() - interval '5 days'
  where po_number = 'PO-2026-00127';
update public.purchase_orders set priority = 'high', created_at = now() - interval '3 days'
  where po_number = 'PO-2026-00128';

-- PharmaCorp: po_number omitted on purpose -> generator issues PO-2026-00129.
insert into public.purchase_orders (id, supplier_id, status, priority, expected_date, created_at) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'pending', 'high', current_date + 7, now() - interval '2 days');

insert into public.purchase_orders (id, po_number, supplier_id, status, priority, expected_date, delivered_at, approved_by, approved_at, created_at) values
  ('30000000-0000-0000-0000-000000000002', 'PO-2026-00126', '10000000-0000-0000-0000-000000000008', 'cancelled', 'high',     null,             null, null, null, now() - interval '7 days'),
  ('30000000-0000-0000-0000-000000000003', 'PO-2026-00125', '10000000-0000-0000-0000-000000000009', 'pending',   'critical', current_date + 5, null, null, null, now() - interval '6 days'),
  ('30000000-0000-0000-0000-000000000004', 'PO-2026-00124', '10000000-0000-0000-0000-000000000010', 'delivered', 'normal',   null,
      date_trunc('month', now()) + interval '2 hours', null, null, date_trunc('month', now()) - interval '4 days'),
  ('30000000-0000-0000-0000-000000000005', 'PO-2026-00123', '10000000-0000-0000-0000-000000000006', 'approved',  'high',     current_date + 10, null,
      '00000000-0000-0000-0000-000000000001', now() - interval '1 day', now() - interval '4 days');

insert into public.purchase_order_items (purchase_order_id, medicine_id, quantity, unit_cost) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 500, 18.90),  -- 9,450.00
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 200, 15.00),  -- 3,000.00 => R12,450.00
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009',  89, 100.00), -- R8,900.00
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 200, 155.00), -- R31,000.00
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 100, 14.50),  -- R1,450.00
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 1000, 3.40);  -- R3,400.00

-- History for Reports (monthly expenditure, supplier fulfilment): nine orders,
-- one per past month, mostly delivered, two cancelled, one still delayed.
-- Bulk history: order activity_logs rows would all read "now", so the log
-- trigger is off for this block too.
alter table public.purchase_orders disable trigger purchase_orders_log;
do $$
declare
  i int;
  sup uuid[] := array[
    '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001']::uuid[];
  po_id uuid;
  st text;
  created timestamptz;
begin
  for i in 1..9 loop
    po_id := ('30000000-0000-0000-0000-' || lpad((100 + i)::text, 12, '0'))::uuid;
    st := case when i in (3, 7) then 'cancelled' when i = 5 then 'delayed' else 'delivered' end;
    created := date_trunc('month', now()) - (i || ' months')::interval + interval '9 days';
    insert into public.purchase_orders (id, po_number, supplier_id, status, priority, created_at, delivered_at)
    values (po_id, 'PO-2026-' || lpad((100 + i)::text, 5, '0'), sup[i], st,
            case when i % 4 = 0 then 'high' else 'normal' end, created,
            case when st = 'delivered' then created + interval '6 days' end);
    insert into public.purchase_order_items (purchase_order_id, medicine_id, quantity, unit_cost)
    values (po_id, ('20000000-0000-0000-0000-' || lpad(((i % 10) + 1)::text, 12, '0'))::uuid,
            100 + 40 * i, 5 + 3 * i);
  end loop;
end;
$$;
alter table public.purchase_orders enable trigger purchase_orders_log;
alter table public.purchase_orders enable trigger purchase_orders_notify_status;

-- --- Stock transactions: every type, plus Metformin history ----------------------
insert into public.stock_transactions
  (medicine_id, type, quantity, status, performed_by, department, batch_number, note, created_at) values
  -- Metformin history (nets +106 => 480, see the medicine insert above)
  ('20000000-0000-0000-0000-000000000005', 'stock_in',  300, 'completed', '00000000-0000-0000-0000-000000000004', 'Central Store',       'MET-2026-0201', 'Quarterly restock', now() - interval '160 days'),
  ('20000000-0000-0000-0000-000000000005', 'stock_out',  40, 'completed', '00000000-0000-0000-0000-000000000002', 'Outpatient Pharmacy', 'MET-2026-0201', '', now() - interval '140 days'),
  ('20000000-0000-0000-0000-000000000005', 'stock_out',  35, 'completed', '00000000-0000-0000-0000-000000000002', 'Outpatient Pharmacy', 'MET-2026-0201', '', now() - interval '110 days'),
  ('20000000-0000-0000-0000-000000000005', 'stock_out',  45, 'completed', '00000000-0000-0000-0000-000000000002', 'Outpatient Pharmacy', 'MET-2026-0201', '', now() - interval '80 days'),
  ('20000000-0000-0000-0000-000000000005', 'stock_out',  30, 'completed', '00000000-0000-0000-0000-000000000002', 'Outpatient Pharmacy', 'MET-2026-0201', '', now() - interval '50 days'),
  ('20000000-0000-0000-0000-000000000005', 'stock_out',  38, 'completed', '00000000-0000-0000-0000-000000000002', 'Outpatient Pharmacy', 'MET-2026-0201', '', now() - interval '20 days'),
  ('20000000-0000-0000-0000-000000000005', 'damaged',     6, 'completed', '00000000-0000-0000-0000-000000000004', 'Central Store',       'MET-2026-0201', 'Blister packs crushed in transit', now() - interval '15 days'),
  -- One of each remaining type, recent (Live Timeline)
  ('20000000-0000-0000-0000-000000000006', 'stock_out',  50, 'completed', '00000000-0000-0000-0000-000000000002', 'Emergency Dept. (Ward B)', 'LIS-2026-0301', 'Dispensed to Ward B', now() - interval '4 hours'),
  ('20000000-0000-0000-0000-000000000002', 'expired',    20, 'completed', null,                                   'Pharmacy Store',      'IBU-2026-0090', 'Auto-flagged by expiry sweep', now() - interval '6 hours'),
  ('20000000-0000-0000-0000-000000000002', 'return',     25, 'completed', '00000000-0000-0000-0000-000000000002', 'Pediatric Unit',      'IBU-2026-0112', 'Order cancelled', now() - interval '8 hours'),
  ('20000000-0000-0000-0000-000000000003', 'damaged',     8, 'completed', '00000000-0000-0000-0000-000000000002', 'Pharmacy Store',      'PAR-2026-0150', 'Bottles broken', now() - interval '1 day'),
  ('20000000-0000-0000-0000-000000000001', 'stock_in',  500, 'pending',   '00000000-0000-0000-0000-000000000004', 'Central Store',       'AMX-2026-0034', 'Awaiting goods-received sign-off', now() - interval '30 minutes');

-- --- inventory_snapshots: one row per day for the last 12 months -----------------
-- Deterministic wave (no random()) around ~1,250 units so the trend chart and
-- stock_turnover_monthly have something to show. Replace with the real
-- scheduled job described in the README.
insert into public.inventory_snapshots (snapshot_date, total_units, total_value)
select
  current_date - d,
  round((1250 + 140 * sin(d / 38.0) + (365 - d) * 0.25)::numeric)::int,
  round(((1250 + 140 * sin(d / 38.0) + (365 - d) * 0.25) * 21.5)::numeric, 2)
from generate_series(0, 364) as d;

-- --- Reports catalogue -------------------------------------------------------------
insert into public.reports (slug, title, description, icon, schedule_label, last_run_at) values
  ('low-stock-report',   'Low Stock Report',     'Critical alert for 24 items falling below safety threshold.', 'trending_down', null,             now() - interval '2 hours'),
  ('expiry-forecast',    'Expiry Forecast',      'Predictive analysis of stock expiring within 90 days.',       'event_busy',    'Weekly Auto-run', now() - interval '3 days'),
  ('inventory-valuation','Inventory Valuation',  'Full financial breakdown by FIFO and Weighted Average.',      'payments',      'Monthly Closeout', now() - interval '12 days');

-- --- Extra activity logs (variety: things triggers do not produce) ------------------------
-- Direct inserts as the seed/owner role; in the running app only triggers,
-- the definer helpers and service_role can write here.
insert into public.activity_logs (user_id, user_label, category, action, entity_type, entity_label, ip_address, result, created_at) values
  (null, 'Unknown',        'security', 'Failed login attempt',       'Account', 'unrecognised@example.test', '203.0.113.42', 'failed',  now() - interval '35 minutes'),
  (null, 'System',         'system',   'Low-stock alert generated',  'Medicine','Amoxicillin 500mg',         '127.0.0.1',    'warning', now() - interval '50 minutes'),
  (null, 'System',         'system',   'Batch expiry warning',       'Batch',   'INS-2026-0088',             '127.0.0.1',    'warning', now() - interval '5 hours'),
  ('00000000-0000-0000-0000-000000000001', 'Dr. Test Administrator', 'system',   'Report exported',  'Report',  'Inventory Valuation', '10.24.8.5', 'success', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000002', 'Test Pharmacist',        'security', 'Password changed', 'Account', 'pharmacist@medistock.test', '10.24.8.31', 'success', now() - interval '2 days');
