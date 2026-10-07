-- ============================================================================
-- MediStock IMS — initial schema
--
-- Supabase gives you an `auth.users` table for free (email, hashed password,
-- session handling — you never touch it directly). This migration adds the
-- application-specific data Django's custom User model used to hold:
-- full name, role, and the facility_code/staff_id pair the Hospital Portal
-- login screen needs. It lives in a separate `profiles` table, linked
-- one-to-one to `auth.users`, because you're not allowed to add arbitrary
-- columns to `auth.users` itself — this is the standard, documented Supabase
-- pattern for "extra user data."
-- ============================================================================

-- --- profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff'
    check (role in ('administrator', 'pharmacist', 'nurse', 'staff')),
  facility_code text not null default '',
  staff_id text not null default '',
  created_at timestamptz not null default now()
);

-- A facility_code + staff_id pair must be unique, but only when both are
-- actually set — otherwise every normal email/password account (where both
-- are blank) would collide with each other under a plain unique constraint.
-- This mirrors the same constraint from the earlier Django model.
create unique index profiles_facility_staff_unique
  on public.profiles (facility_code, staff_id)
  where facility_code <> '' and staff_id <> '';

comment on table public.profiles is
  'One row per auth.users row. Created automatically by the '
  'handle_new_user trigger below — never insert into this table directly '
  'from application code.';

-- --- Auto-create a profile row whenever a new auth user is created --------
-- Without this, every new sign-up would need a second manual step to create
-- their profile row, which is easy to forget and leaves the two tables out
-- of sync. This trigger makes profile creation automatic and atomic with
-- sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --- Row Level Security on profiles -----------------------------------------
-- RLS is Postgres's built-in per-row access control — it runs on every
-- query, including ones from Supabase's auto-generated REST API, so there's
-- no way to accidentally bypass it from application code the way you could
-- forget a permission check in a hand-written view. Every table exposed to
-- the client needs RLS enabled AND explicit policies, or by default nobody
-- (not even the row's owner) can read or write anything.
alter table public.profiles enable row level security;

-- Users can read their own profile.
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile. Role changes are blocked separately
-- by a trigger below — RLS is row-level, not column-level, so "you can
-- update your own row but not touch one specific column" doesn't cleanly
-- express as an RLS policy. A trigger is the more reliable tool for that.
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Administrators can read every profile (needed for the Users screen).
create policy "profiles: administrators read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'administrator'
    )
  );

-- --- Block role self-escalation ---------------------------------------------
-- Without this, a signed-in user could call `update profiles set
-- role = 'administrator' where id = auth.uid()` — which the "update own"
-- policy above would otherwise allow — and grant themselves admin. This
-- trigger silently keeps `role` at whatever it already was unless the
-- request is running as service_role (the Edge Functions / admin tooling
-- use that key; ordinary logged-in users never do). Promoting someone to
-- administrator is meant to happen from a trusted context, not a client
-- update call.
create function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_self_escalation();

-- --- hospital_login_secrets --------------------------------------------------
-- Backs the Hospital Portal login screen (facility_code + staff_id, no
-- password). Supabase Auth has no built-in "passwordless code lookup", so
-- this table holds a real, randomly-generated password per hospital
-- account, which the hospital-login Edge Function uses on the account's
-- behalf. See supabase/functions/hospital-login/index.ts.
--
-- RLS is enabled with ZERO policies, deliberately — that means nothing using
-- the anon or authenticated role can read or write this table AT ALL, from
-- the client, ever. Only the Edge Function, using the service_role key
-- (which bypasses RLS entirely by design), can touch it. If you ever find
-- yourself wanting to add a policy here to let the frontend read from this
-- table directly, stop — that would defeat the entire point of the table.
create table public.hospital_login_secrets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  facility_code text not null,
  staff_id text not null,
  secret_password text not null
);

alter table public.hospital_login_secrets enable row level security;
-- No policies. See comment above.
