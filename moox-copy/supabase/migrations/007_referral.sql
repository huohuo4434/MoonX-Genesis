-- Referral invite / reward schema
-- membership_expires_at already exists on profiles; add referral_code + alias comment.
-- Also add membership_expire_at as a generated alias column for schema clarity (optional mirror).

alter table public.profiles
  add column if not exists referral_code text;

-- Mirror column requested by product naming (same value as membership_expires_at when set via trigger below).
alter table public.profiles
  add column if not exists membership_expire_at timestamptz;

create unique index if not exists profiles_referral_code_uidx
  on public.profiles (referral_code)
  where referral_code is not null;

-- Keep membership_expire_at in sync with membership_expires_at
create or replace function public.sync_membership_expire_at()
returns trigger
language plpgsql
as $$
begin
  new.membership_expire_at := new.membership_expires_at;
  return new;
end;
$$;

drop trigger if exists trg_sync_membership_expire_at on public.profiles;
create trigger trg_sync_membership_expire_at
  before insert or update of membership_expires_at on public.profiles
  for each row execute function public.sync_membership_expire_at();

update public.profiles
set membership_expire_at = membership_expires_at
where membership_expire_at is distinct from membership_expires_at;

create table if not exists public."ReferralInvite" (
  id text primary key,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists referral_invite_inviter_idx
  on public."ReferralInvite" (inviter_id);

create table if not exists public."ReferralRecord" (
  id text primary key,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  payment_id text,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'flagged')),
  reward_days integer not null default 7,
  device_id text,
  flagged_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists referral_record_invitee_uidx
  on public."ReferralRecord" (invitee_id);

create unique index if not exists referral_record_payment_uidx
  on public."ReferralRecord" (payment_id)
  where payment_id is not null;

create index if not exists referral_record_inviter_idx
  on public."ReferralRecord" (inviter_id);

create index if not exists referral_record_status_idx
  on public."ReferralRecord" (status);
