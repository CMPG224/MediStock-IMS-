-- Lets a signed-in user mark notifications as read (or dismiss them) for
-- themselves. notifications has no client UPDATE policy on purpose — a
-- direct update could also flip `resolved` or rewrite other users' read_by —
-- so this narrow SECURITY DEFINER function only ever appends auth.uid().

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set read_by = array_append(read_by, auth.uid())
   where auth.uid() is not null
     and not (auth.uid() = any(read_by))
     and (p_ids is null or id = any(p_ids));
$$;

comment on function public.mark_notifications_read(uuid[]) is
  'Adds the caller to read_by for the given notifications (all when p_ids is null).';

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
