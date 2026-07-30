-- Update membership plan prices (upsert — no duplicate plans)
insert into public.membership_plans (code, name, duration_days, price_usdt, access_level, active, sort_order)
values
  ('MONTHLY', '月度会员', 30, 50, 'member', true, 1),
  ('QUARTERLY', '季度会员', 90, 120, 'member', true, 2),
  ('YEARLY', '年度会员', 365, 400, 'member', true, 3)
on conflict (code) do update set
  name = excluded.name,
  duration_days = excluded.duration_days,
  price_usdt = excluded.price_usdt,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();
