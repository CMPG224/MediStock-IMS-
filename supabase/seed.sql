create function pg_temp.make_user(
  p_email text, p_name text, p_role text,
  p_facility text default '', p_staff text default '', p_password text default 'TestPass123!'
) returns void language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_name), now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', p_email),
    'email', now(), now(), now()
  );

  update public.profiles
  set role = p_role, facility_code = p_facility, staff_id = p_staff
  where id = uid;

  if p_facility <> '' then
    insert into public.hospital_login_secrets (user_id, facility_code, staff_id, secret_password)
    values (uid, p_facility, p_staff, p_password);
  end if;
end $$;

select pg_temp.make_user('admin@medistock.test', 'Test Admin', 'administrator');
select pg_temp.make_user('pharmacist@medistock.test', 'Test Pharmacist', 'pharmacist');
select pg_temp.make_user(
  'hospital.wc-gen-014.stf-0001@medistock.test', 'Test Nurse', 'nurse',
  'WC-GEN-014', 'STF-0001', 'local-dev-secret-change-me'
);