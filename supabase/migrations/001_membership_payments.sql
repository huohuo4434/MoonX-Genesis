-- MoonX membership & crypto payment schema
-- Run in Supabase SQL editor or via supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'member', 'premium', 'admin')),
  membership_status text not null default 'inactive'
    check (membership_status in ('inactive', 'active', 'expired', 'suspended')),
  membership_started_at timestamptz,
  membership_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

-- membership_plans
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_days integer not null,
  price_usdt numeric(18, 6),
  access_level text not null check (access_level in ('member', 'premium')),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed plans (inactive until admin sets prices — see 002_update_plan_prices.sql for production prices)
insert into public.membership_plans (code, name, duration_days, price_usdt, access_level, active, sort_order)
values
  ('MONTHLY', '月度会员', 30, null, 'member', false, 1),
  ('QUARTERLY', '季度会员', 90, null, 'member', false, 2),
  ('YEARLY', '年度会员', 365, null, 'member', false, 3)
on conflict (code) do nothing;

-- payment_orders
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  chain text not null check (chain in ('TRON', 'BSC')),
  token_symbol text not null,
  token_contract text not null,
  recipient_address text not null,
  expected_amount numeric(18, 6) not null,
  paid_amount numeric(18, 6),
  status text not null default 'pending'
    check (status in (
      'pending', 'verifying', 'paid', 'underpaid', 'overpaid', 'expired',
      'manual_review', 'rejected', 'refunded'
    )),
  tx_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  verified_at timestamptz,
  membership_expires_at timestamptz,
  verification_error text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists payment_orders_user_idx on public.payment_orders(user_id);
create index if not exists payment_orders_status_idx on public.payment_orders(status);
create unique index if not exists payment_orders_tx_hash_unique
  on public.payment_orders(tx_hash) where tx_hash is not null;

-- crypto_transactions
create table if not exists public.crypto_transactions (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (chain in ('TRON', 'BSC')),
  tx_hash text not null unique,
  block_number bigint,
  sender_address text,
  recipient_address text not null,
  token_contract text not null,
  amount_raw text not null,
  amount_normalized numeric(18, 6) not null,
  block_timestamp timestamptz,
  confirmation_status text not null default 'confirmed',
  matched_order_id uuid references public.payment_orders(id),
  processed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- subscription_events
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.payment_orders(id),
  event_type text not null,
  previous_expires_at timestamptz,
  new_expires_at timestamptz,
  created_at timestamptz not null default now(),
  note text
);

-- payment_audit_logs
create table if not exists public.payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.payment_orders(id),
  action text not null,
  result text not null,
  message text,
  created_at timestamptz not null default now(),
  server_metadata jsonb not null default '{}'::jsonb
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists membership_plans_updated_at on public.membership_plans;
create trigger membership_plans_updated_at before update on public.membership_plans
  for each row execute function public.set_updated_at();

-- auto-create profile on signup; seed admin for jackzwin999@gmail.com
create or replace function public.handle_new_user()
returns trigger as $$
declare
  admin_emails text[] := array['jackzwin999@gmail.com'];
begin
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    case when lower(new.email) = any(admin_emails) then 'admin' else 'user' end,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.payment_orders enable row level security;
alter table public.crypto_transactions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.payment_audit_logs enable row level security;

-- profiles: users read/update own (not role/membership fields via client)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own_safe" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- plans: public read active plans only
create policy "plans_select_active" on public.membership_plans
  for select using (active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- payment_orders: own orders only
create policy "orders_select_own" on public.payment_orders
  for select using (auth.uid() = user_id);

create policy "orders_insert_own" on public.payment_orders
  for insert with check (auth.uid() = user_id);

-- subscription_events: own only
create policy "subscription_events_select_own" on public.subscription_events
  for select using (auth.uid() = user_id);

-- crypto_transactions & audit_logs: no direct user access (service role only)
create policy "crypto_tx_deny_all" on public.crypto_transactions for all using (false);
create policy "audit_logs_deny_all" on public.payment_audit_logs for all using (false);
