-- Repair the consultation launch entitlement for active members whose membership
-- was activated manually or before consultation quota delivery existed.
-- One member can receive this fallback once; normal paid-order grants remain authoritative.

alter table public.consultation_quota_grants
  add column if not exists source_key text;

update public.consultation_quota_grants
set source_key='paid_order:'||source_order_id::text
where source_key is null and source_order_id is not null;

alter table public.consultation_quota_grants
  alter column source_key set not null,
  alter column source_order_id drop not null;

create unique index if not exists consultation_quota_grants_source_key_uidx
  on public.consultation_quota_grants(source_key);

alter table public.consultation_quota_grants
  drop constraint if exists consultation_quota_grants_source_check;
alter table public.consultation_quota_grants
  add constraint consultation_quota_grants_source_check check (
    (source_order_id is not null and source_key='paid_order:'||source_order_id::text)
    or
    (source_order_id is null and source_key='member_initial:'||user_id::text)
  );

create or replace function public.grant_consultation_quota_for_paid_order(p_order_id uuid)
returns public.consultation_quota_grants language plpgsql security definer set search_path=public,pg_temp as $$
declare o record; q integer; g public.consultation_quota_grants; prior_until timestamptz;
begin
  select po.id,po.user_id,po.status,po.paid_at,po.verified_at,po.membership_expires_at,po.metadata,mp.code
    into o from public.payment_orders po join public.membership_plans mp on mp.id=po.plan_id where po.id=p_order_id for update;
  if not found then raise exception 'PAID_ORDER_NOT_FOUND'; end if;
  if o.status not in ('paid','overpaid') and not (o.status='manual_review' and o.metadata->>'manualGoodwillState'='COMPLETED' and o.metadata->>'membershipGranted'='true')
    then raise exception 'ORDER_NOT_MEMBERSHIP_PAID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,0));
  q := case o.code when 'MONTHLY' then 1 when 'QUARTERLY' then 3 when 'YEARLY' then 12 else null end;
  if q is null or o.membership_expires_at is null then raise exception 'ORDER_PLAN_NOT_ELIGIBLE'; end if;
  select * into g from public.consultation_quota_grants where source_order_id=o.id;
  if found then
    insert into public.consultation_quota_ledger(grant_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
      values(g.id,'GRANT',g.quota_total,0,0,'grant:'||o.id) on conflict(idempotency_key) do nothing;
    return g;
  end if;
  if exists(
    select 1 from public.payment_orders predecessor
    where predecessor.user_id=o.user_id
      and predecessor.membership_expires_at is not null
      and (predecessor.membership_expires_at,predecessor.id)<(o.membership_expires_at,o.id)
      and (predecessor.status in ('paid','overpaid') or (predecessor.status='manual_review' and predecessor.metadata->>'manualGoodwillState'='COMPLETED' and predecessor.metadata->>'membershipGranted'='true'))
      and not exists(select 1 from public.consultation_quota_grants prior_grant where prior_grant.source_order_id=predecessor.id)
  ) then raise exception 'ORDER_PREDECESSOR_PENDING'; end if;
  select max(eligible_until) into prior_until from public.consultation_quota_grants where user_id=o.user_id;
  if o.membership_expires_at <= greatest(coalesce(o.paid_at,o.verified_at,now()),coalesce(prior_until,'-infinity'::timestamptz)) then raise exception 'ORDER_TERM_NOT_ELIGIBLE'; end if;
  insert into public.consultation_quota_grants(user_id,source_order_id,source_key,plan_code,quota_total,quota_available,eligible_from,eligible_until)
    values(o.user_id,o.id,'paid_order:'||o.id::text,o.code,q,q,greatest(coalesce(o.paid_at,o.verified_at,now()),coalesce(prior_until,'-infinity'::timestamptz)),o.membership_expires_at)
    on conflict(source_order_id) do nothing;
  select * into g from public.consultation_quota_grants where source_order_id=o.id;
  insert into public.consultation_quota_ledger(grant_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(g.id,'GRANT',q,0,0,'grant:'||o.id) on conflict(idempotency_key) do nothing;
  return g;
end $$;

create or replace function public.grant_initial_consultation_quota_for_active_member(p_user_id uuid)
returns public.consultation_quota_grants language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u record;
  g public.consultation_quota_grants;
  captured_now timestamptz:=clock_timestamp();
  membership_expiry timestamptz;
  fallback_until timestamptz;
  source text:='member_initial:'||p_user_id::text;
begin
  if p_user_id is null then raise exception 'MEMBER_ID_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));

  select id,raw_app_meta_data into u from auth.users where id=p_user_id;
  if not found then raise exception 'MEMBERSHIP_USER_NOT_FOUND'; end if;
  if coalesce(u.raw_app_meta_data->>'role','user')='admin' then raise exception 'MEMBER_QUOTA_NOT_APPLICABLE'; end if;

  begin
    membership_expiry:=nullif(u.raw_app_meta_data->>'membership_expires_at','')::timestamptz;
  exception when others then
    membership_expiry:=null;
  end;
  if membership_expiry is not null then
    if membership_expiry<=captured_now then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;
  elsif coalesce(u.raw_app_meta_data->>'membership_status','inactive')<>'active' then
    raise exception 'MEMBERSHIP_NOT_ACTIVE';
  end if;

  -- Any active grant, including a fully reserved or consumed one, means this
  -- membership period was already represented and must never be topped up.
  select * into g from public.consultation_quota_grants
    where user_id=p_user_id and eligible_from<=captured_now and eligible_until>captured_now
    order by eligible_until,id limit 1;
  if found then return g; end if;

  select * into g from public.consultation_quota_grants where source_key=source;
  if found then return g; end if;

  fallback_until:=least(coalesce(membership_expiry,captured_now+interval '1 month'),captured_now+interval '1 month');
  if fallback_until<=captured_now then raise exception 'MEMBERSHIP_NOT_ACTIVE'; end if;

  insert into public.consultation_quota_grants(
    user_id,source_order_id,source_key,plan_code,quota_total,quota_available,eligible_from,eligible_until
  ) values (
    p_user_id,null,source,'MONTHLY',1,1,captured_now,fallback_until
  ) on conflict(source_key) do nothing;

  select * into g from public.consultation_quota_grants where source_key=source;
  if not found then raise exception 'INITIAL_QUOTA_GRANT_FAILED'; end if;
  insert into public.consultation_quota_ledger(grant_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(g.id,'GRANT',1,0,0,'grant:'||source) on conflict(idempotency_key) do nothing;
  return g;
end $$;

revoke all on function public.grant_initial_consultation_quota_for_active_member(uuid) from public,anon,authenticated;
grant execute on function public.grant_initial_consultation_quota_for_active_member(uuid) to service_role;

-- Repair existing active members at migration time as well as lazily on their
-- first page visit. A bad legacy account must not prevent all other members from
-- being repaired; the function itself remains the authoritative validator.
do $$
declare member_row record;
begin
  for member_row in
    select id from auth.users
    where coalesce(raw_app_meta_data->>'role','user')<>'admin'
      and (
        coalesce(raw_app_meta_data->>'membership_status','inactive')='active'
        or nullif(raw_app_meta_data->>'membership_expires_at','') is not null
      )
  loop
    begin
      perform public.grant_initial_consultation_quota_for_active_member(member_row.id);
    exception when raise_exception then
      if sqlerrm not in ('MEMBERSHIP_NOT_ACTIVE','MEMBER_QUOTA_NOT_APPLICABLE') then raise; end if;
    end;
  end loop;
end $$;
