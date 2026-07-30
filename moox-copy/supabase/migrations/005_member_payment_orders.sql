-- Manual membership payment review queue.
-- Product fields: id, user_email, plan, amount, network, tx_hash, status, created_at
-- (plus order_number / user_id for app joins)

create table if not exists public.member_payment_orders (
  id text primary key,
  order_number text not null unique,
  user_id uuid,
  user_email text not null,
  plan text not null check (plan in ('MONTHLY', 'QUARTERLY', 'YEARLY')),
  amount numeric(18, 2) not null,
  network text not null check (network in ('TRC20', 'BEP20')),
  tx_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  notification_status text,
  is_system_test boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

create unique index if not exists member_payment_orders_tx_hash_uidx
  on public.member_payment_orders (lower(tx_hash));

create index if not exists member_payment_orders_status_idx
  on public.member_payment_orders (status);

create index if not exists member_payment_orders_email_idx
  on public.member_payment_orders (lower(user_email));

alter table public.member_payment_orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'member_payment_orders' and policyname = 'member_payment_orders_select_own'
  ) then
    create policy member_payment_orders_select_own on public.member_payment_orders
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Alias view for product name "payment_orders" when legacy complex table is absent.
do $$
begin
  if to_regclass('public.payment_orders') is null then
    execute $v$
      create view public.payment_orders as
      select
        id,
        user_email,
        plan,
        amount,
        network,
        tx_hash,
        status,
        created_at,
        order_number,
        user_id,
        notification_status,
        is_system_test,
        reviewed_at,
        reviewed_by
      from public.member_payment_orders
    $v$;
  end if;
end $$;
