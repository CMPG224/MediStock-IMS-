-- Invited users are created inactive ("pending") by the invite-user function.
-- Nothing ever activated them, so once sign-in refuses deactivated accounts
-- they would be locked out. First sign-in now activates a pending account
-- (inactive AND never signed in); an administrator-deactivated account has a
-- last_login_at and stays inactive.
create or replace function public.touch_last_login()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  -- The role-guard trigger reverts is_active for non-admins; this flag (valid
  -- for this transaction only) tells it the change comes from here.
  perform set_config('app.activating_pending', 'on', true);
  update public.profiles
     set is_active = true
   where id = auth.uid() and not is_active and last_login_at is null;
  update public.profiles set last_login_at = now() where id = auth.uid();
  perform public.write_activity_log(auth.uid(), 'security', 'User signed in', 'user', '', 'success');
end;
$$;

-- Same body as before, plus the activation bypass above.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if current_setting('app.activating_pending', true) = 'on'
     and new.is_active and not old.is_active and old.last_login_at is null
     and new.role is not distinct from old.role
     and new.permissions is not distinct from old.permissions
     and new.email is not distinct from old.email then
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
