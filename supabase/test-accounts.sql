-- ============================================================================
-- Test accounts for the HOSTED Supabase project (seed.sql only runs on a
-- local `supabase db reset`). Paste into Dashboard → SQL Editor and run.
--
--   admin@medistock.test       administrator
--   pharmacist@medistock.test  pharmacist
--   manager@medistock.test     manager
--   nurse@medistock.test       nurse
--   staff@medistock.test       staff
--   invited@medistock.test     pharmacist, inactive (shows as "pending")
--   Password for all of the above: TestPass123!
--
--   Hospital Portal: facility code WC-GEN-014, staff ID STF-0001
-- ============================================================================

create extension if not exists pgcrypto;

do $$
declare
  acct record;
  uid uuid;
  hospital_secret text;
begin
  for acct in
    select * from (values
      ('admin@medistock.test',      'Test Administrator',     'administrator', true,  array['inventory_overrides', 'user_auditing']),
      ('pharmacist@medistock.test', 'Test Pharmacist',        'pharmacist',    true,  array['inventory_overrides']),
      ('manager@medistock.test',    'Test Inventory Manager', 'manager',       true,  array['financial_reporting']),
      ('nurse@medistock.test',      'Test Nurse',             'nurse',         true,  array[]::text[]),
      ('staff@medistock.test',      'Test Staff',             'staff',         true,  array[]::text[]),
      ('invited@medistock.test',    'Invited Pharmacist',     'pharmacist',    false, array[]::text[])
    ) as t(email, full_name, role, is_active, permissions)
  loop
    select id into uid from auth.users where email = acct.email;

    if uid is null then
      uid := gen_random_uuid();
      -- The token columns must be '' rather than NULL, or Supabase Auth fails
      -- sign-in with "Database error querying schema".
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        acct.email, crypt('TestPass123!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', acct.full_name),
        '', '', '', ''
      );
    else
      update auth.users
      set encrypted_password = crypt('TestPass123!', gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmation_token = coalesce(confirmation_token, ''),
          recovery_token = coalesce(recovery_token, ''),
          email_change = coalesce(email_change, ''),
          email_change_token_new = coalesce(email_change_token_new, ''),
          updated_at = now()
      where id = uid;
    end if;

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', acct.email, 'email_verified', true),
            'email', now(), now(), now())
    on conflict (provider_id, provider) do nothing;

    -- The profile row comes from the handle_new_user trigger. No JWT in the
    -- SQL Editor, so the role guard lets these privileged columns through.
    update public.profiles
    set full_name = acct.full_name,
        role = acct.role,
        is_active = acct.is_active,
        permissions = acct.permissions,
        last_login_at = case when acct.is_active then last_login_at end
    where id = uid;
  end loop;

  -- Hospital Portal account. Nobody types its password: the hospital-login
  -- Edge Function signs in with the one stored in hospital_login_secrets,
  -- so it's only (re)built when that pairing is missing or doesn't match.
  if not exists (
    select 1 from public.hospital_login_secrets h
    join auth.users u on u.id = h.user_id
    where h.facility_code = 'WC-GEN-014' and h.staff_id = 'STF-0001'
      and u.encrypted_password = crypt(h.secret_password, u.encrypted_password)
  ) then
    delete from public.hospital_login_secrets
    where facility_code = 'WC-GEN-014' and staff_id = 'STF-0001';

    select id into uid from auth.users where email = 'hospital-test@medistock.test';
    hospital_secret := encode(gen_random_bytes(24), 'hex');

    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'hospital-test@medistock.test', crypt(hospital_secret, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Hospital Portal Test Account"}',
        '', '', '', ''
      );
    else
      update auth.users
      set encrypted_password = crypt(hospital_secret, gen_salt('bf')),
          confirmation_token = coalesce(confirmation_token, ''),
          recovery_token = coalesce(recovery_token, ''),
          email_change = coalesce(email_change, ''),
          email_change_token_new = coalesce(email_change_token_new, ''),
          updated_at = now()
      where id = uid;
    end if;

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', 'hospital-test@medistock.test', 'email_verified', true),
            'email', now(), now(), now())
    on conflict (provider_id, provider) do nothing;

    update public.profiles
    set role = 'staff', facility_code = 'WC-GEN-014', staff_id = 'STF-0001'
    where id = uid;

    insert into public.hospital_login_secrets (user_id, facility_code, staff_id, secret_password)
    values (uid, 'WC-GEN-014', 'STF-0001', hospital_secret)
    on conflict (user_id) do update
      set facility_code = excluded.facility_code,
          staff_id = excluded.staff_id,
          secret_password = excluded.secret_password;
  end if;
end $$;

select p.email, p.full_name, p.role, p.is_active, p.permissions
from public.profiles p
where p.email like '%@medistock.test'
order by p.role, p.email;
