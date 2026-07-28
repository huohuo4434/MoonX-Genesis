-- MoonX MVP: minimal profiles table (paste once in Supabase SQL Editor)
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'member', 'admin')),
  membership_status text not null default 'inactive'
    check (membership_status in ('inactive', 'active', 'expired', 'suspended')),
  membership_started_at timestamptz,
  membership_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, membership_status, display_name)
  values (
    new.id,
    lower(trim(new.email)),
    case when lower(trim(new.email)) = 'jackzwin999@gmail.com' then 'admin' else 'user' end,
    case when lower(trim(new.email)) = 'jackzwin999@gmail.com' then 'active' else 'inactive' end,
    split_part(new.email, '@', 1)
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own_safe" on public.profiles;
create policy "profiles_update_own_safe" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backfill admin profile if auth user already exists
insert into public.profiles (id, email, role, membership_status, membership_started_at, membership_expires_at, display_name)
select
  u.id,
  lower(u.email),
  'admin',
  'active',
  now(),
  null,
  split_part(u.email, '@', 1)
from auth.users u
where lower(u.email) = 'jackzwin999@gmail.com'
on conflict (id) do update set
  role = 'admin',
  membership_status = 'active',
  membership_expires_at = null,
  updated_at = now();
