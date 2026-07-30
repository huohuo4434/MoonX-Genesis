-- Membership change ledger (non-destructive)
create table if not exists public.membership_events (
  id text primary key,
  user_id uuid not null,
  user_email text,
  event_type text not null
    check (event_type in (
      'PAYMENT_APPROVED',
      'REFERRAL_REWARD',
      'ADMIN_ADJUSTMENT',
      'DATA_REPAIR',
      'REVOCATION'
    )),
  source text not null,
  source_id text not null,
  previous_expires_at timestamptz,
  new_expires_at timestamptz,
  days_changed integer not null default 0,
  operator_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists membership_events_type_source_uidx
  on public.membership_events (event_type, source_id);

create index if not exists membership_events_user_idx
  on public.membership_events (user_id, created_at desc);

-- Never shorten profiles.membership_expires_at via accidental null upserts from older clients.
-- (Application layer also enforces extend-only.)
