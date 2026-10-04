-- profiles: one row per auth.users row, created automatically.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff'
    check (role in ('administrator', 'pharmacist', 'nurse', 'staff')),
  facility_code text not null default '',
  staff_id text not null default '',
  created_at timestamptz not null default now()
);

-- Unique facility_code + staff_id pair, only when both are actually set.
create unique index profiles_facility_staff_unique
  on public.profiles (facility_code, staff_id)
  where facility_code <> '' and staff_id <> '';

-- Auto-create a profile row whenever a new auth user is created.
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

-- Helper used by the admin policy (avoids a recursion error).
create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'administrator'
  );
$$;

-- Row Level Security
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: administrators read all"
  on public.profiles for select
  using (public.is_admin());

-- Block role self-escalation.
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

-- hospital_login_secrets: RLS enabled, ZERO policies.
create table public.hospital_login_secrets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  facility_code text not null,
  staff_id text not null,
  secret_password text not null
);

alter table public.hospital_login_secrets enable row level security;
-- Newer Supabase projects don't auto-grant access to tables you create.
-- The Edge Function (service_role) needs to read the secrets table.
grant select on public.hospital_login_secrets to service_role;