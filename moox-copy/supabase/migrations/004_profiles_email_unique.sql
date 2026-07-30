-- Ensure profiles.email is unique and signup trigger is idempotent-safe
create unique index if not exists profiles_email_unique on public.profiles (email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text[] := array['jackzwin999@gmail.com'];
begin
  insert into public.profiles (id, email, role, membership_status, display_name)
  values (
    new.id,
    lower(trim(new.email)),
    case when lower(trim(new.email)) = any(admin_emails) then 'admin' else 'user' end,
    case when lower(trim(new.email)) = any(admin_emails) then 'active' else 'inactive' end,
    split_part(new.email, '@', 1)
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;
