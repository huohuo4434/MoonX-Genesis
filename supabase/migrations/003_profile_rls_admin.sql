-- Prevent users from self-elevating role or membership via client updates.
create or replace function public.profiles_prevent_privilege_escalation()
returns trigger as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;
  if auth.uid() = old.id then
    new.role := old.role;
    new.membership_status := old.membership_status;
    new.membership_started_at := old.membership_started_at;
    new.membership_expires_at := old.membership_expires_at;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.profiles_prevent_privilege_escalation();

-- Ensure seeded admin has permanent access
update public.profiles
set
  role = 'admin',
  membership_status = 'active',
  membership_started_at = coalesce(membership_started_at, now()),
  membership_expires_at = null
where lower(email) = 'jackzwin999@gmail.com';

-- Membership expiry cron must not expire admins
create or replace function public.expire_memberships_safe()
returns integer as $$
declare
  affected integer;
begin
  update public.profiles
  set membership_status = 'expired'
  where membership_status = 'active'
    and role not in ('admin')
    and membership_expires_at is not null
    and membership_expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$ language plpgsql security definer;
