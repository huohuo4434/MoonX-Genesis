-- Member consultation quota and encrypted request lifecycle.
-- Service-role only. Apply after 001_membership_payments.sql.
create table if not exists public.consultation_quota_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_order_id uuid not null references public.payment_orders(id),
  plan_code text not null check (plan_code in ('MONTHLY','QUARTERLY','YEARLY')),
  quota_total integer not null check (quota_total in (1,3,12)),
  quota_available integer not null check (quota_available >= 0),
  quota_reserved integer not null default 0 check (quota_reserved >= 0),
  quota_consumed integer not null default 0 check (quota_consumed >= 0),
  eligible_from timestamptz not null,
  eligible_until timestamptz not null,
  created_at timestamptz not null default now(),
  check (quota_available + quota_reserved + quota_consumed = quota_total),
  check (eligible_until > eligible_from),
  unique(source_order_id)
);
create index if not exists consultation_quota_grants_user_idx on public.consultation_quota_grants(user_id, eligible_until);

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_id uuid not null references public.consultation_quota_grants(id),
  kind text not null check (kind in ('LIUYAO','BAZI')),
  status text not null check (status in ('RESERVED','SUBMITTED','AI_DRAFTING','DRAFT_READY','HUMAN_REVIEW','NEEDS_INFO','REJECTED','APPROVED','CANCELLED','SYSTEM_FAILED','INFO_EXPIRED','PURGE_PENDING','PURGED')),
  missing_fields jsonb not null default '[]'::jsonb,
  hold_until timestamptz,
  current_version integer not null default 0,
  reviewer_id uuid references auth.users(id),
  reviewer_display_name text,
  reviewed_at timestamptz,
  final_content_hash text,
  final_diff_hash text,
  quota_consumed boolean not null default false,
  purge_requested_at timestamptz,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consultation_requests_user_idx on public.consultation_requests(user_id, created_at desc);
create index if not exists consultation_requests_queue_idx on public.consultation_requests(status, updated_at);

create table if not exists public.consultation_private_payloads (
  request_id uuid primary key references public.consultation_requests(id) on delete cascade,
  key_version integer not null,
  iv text not null,
  auth_tag text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.consultation_response_versions (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.consultation_requests(id) on delete cascade,
  version integer not null, author_kind text not null check (author_kind in ('AI_DRAFT','ADMIN_EDIT','PRIMARY_REVIEWER_FINAL')),
  author_id uuid references auth.users(id), previous_version_id uuid references public.consultation_response_versions(id),
  key_version integer not null, iv text not null, auth_tag text not null, ciphertext text not null,
  content_hash text not null, diff_hash text not null, created_at timestamptz not null default now(), unique(request_id, version)
);
create table if not exists public.consultation_request_events (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.consultation_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id), event_type text not null, actor_id uuid references auth.users(id),
  idempotency_key text not null unique, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.consultation_quota_ledger (
  id uuid primary key default gen_random_uuid(), grant_id uuid not null references public.consultation_quota_grants(id),
  request_id uuid references public.consultation_requests(id), event_type text not null check (event_type in ('GRANT','RESERVE','RELEASE','CONSUME')),
  available_delta integer not null, reserved_delta integer not null, consumed_delta integer not null,
  idempotency_key text not null unique, created_at timestamptz not null default now()
);

alter table public.consultation_quota_grants enable row level security;
alter table public.consultation_requests enable row level security;
alter table public.consultation_private_payloads enable row level security;
alter table public.consultation_response_versions enable row level security;
alter table public.consultation_request_events enable row level security;
alter table public.consultation_quota_ledger enable row level security;

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
  insert into public.consultation_quota_grants(user_id,source_order_id,plan_code,quota_total,quota_available,eligible_from,eligible_until)
    values(o.user_id,o.id,o.code,q,q,greatest(coalesce(o.paid_at,o.verified_at,now()),coalesce(prior_until,'-infinity'::timestamptz)),o.membership_expires_at)
    on conflict(source_order_id) do nothing;
  select * into g from public.consultation_quota_grants where source_order_id=o.id;
  insert into public.consultation_quota_ledger(grant_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(g.id,'GRANT',q,0,0,'grant:'||o.id) on conflict(idempotency_key) do nothing;
  return g;
end $$;

create or replace function public.reserve_consultation_request(p_request_id uuid,p_user_id uuid,p_kind text,p_key_version integer,p_iv text,p_auth_tag text,p_ciphertext text)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.consultation_quota_grants; r public.consultation_requests;
begin
  if p_request_id is null or p_key_version<1 or length(p_iv)<8 or length(p_auth_tag)<8 or length(p_ciphertext)<8 then raise exception 'INVALID_ENCRYPTED_PAYLOAD'; end if;
  select * into g from public.consultation_quota_grants where user_id=p_user_id and quota_available>0 and eligible_from<=now() and eligible_until>now() order by eligible_until,id for update skip locked limit 1;
  if not found then raise exception 'CONSULTATION_QUOTA_UNAVAILABLE'; end if;
  insert into public.consultation_requests(id,user_id,grant_id,kind,status) values(p_request_id,p_user_id,g.id,p_kind,'SUBMITTED') returning * into r;
  insert into public.consultation_private_payloads(request_id,key_version,iv,auth_tag,ciphertext) values(r.id,p_key_version,p_iv,p_auth_tag,p_ciphertext);
  update public.consultation_quota_grants set quota_available=quota_available-1,quota_reserved=quota_reserved+1 where id=g.id;
  insert into public.consultation_quota_ledger(grant_id,request_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(g.id,r.id,'RESERVE',-1,1,0,'reserve:'||r.id);
  return r;
end $$;

create or replace function public.transition_consultation_request(p_request_id uuid,p_actor_id uuid,p_expected text[],p_target text,p_missing_fields jsonb,p_hold_until timestamptz)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests; prior_status text;
begin
  if p_target not in ('SUBMITTED','AI_DRAFTING','DRAFT_READY','HUMAN_REVIEW','NEEDS_INFO') then raise exception 'INVALID_TRANSITION_TARGET'; end if;
  select * into r from public.consultation_requests where id=p_request_id for update;
  if not found or not (r.status=any(p_expected)) or r.status='APPROVED' then raise exception 'CONSULTATION_TRANSITION_CONFLICT'; end if;
  prior_status:=r.status;
  update public.consultation_requests set status=p_target,missing_fields=coalesce(p_missing_fields,'[]'::jsonb),hold_until=p_hold_until,updated_at=clock_timestamp()
    where id=p_request_id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key,metadata)
    values(r.id,r.user_id,p_target,p_actor_id,'transition:'||r.id||':'||prior_status||':'||p_target||':'||r.updated_at::text||':'||gen_random_uuid()::text,jsonb_build_object('expected',p_expected,'priorStatus',prior_status,'transitionedAt',r.updated_at));
  return r;
end $$;

create or replace function public.supplement_consultation_request(p_request_id uuid,p_user_id uuid,p_kind text,p_key_version integer,p_iv text,p_auth_tag text,p_ciphertext text)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests;
begin
  select * into r from public.consultation_requests where id=p_request_id and user_id=p_user_id and kind=p_kind and status='NEEDS_INFO' for update;
  if not found then raise exception 'CONSULTATION_SUPPLEMENT_CONFLICT'; end if;
  update public.consultation_private_payloads set key_version=p_key_version,iv=p_iv,auth_tag=p_auth_tag,ciphertext=p_ciphertext,updated_at=now() where request_id=r.id;
  if not found then raise exception 'CONSULTATION_PRIVATE_INPUT_UNAVAILABLE'; end if;
  update public.consultation_requests set status='SUBMITTED',missing_fields='[]'::jsonb,hold_until=null,updated_at=now() where id=r.id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key)
    values(r.id,r.user_id,'SUPPLEMENTED',p_user_id,'supplement:'||r.id||':'||r.updated_at::text);
  return r;
end $$;

create or replace function public.purge_consultation_private_data(p_request_id uuid,p_user_id uuid)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests;
begin
  select * into r from public.consultation_requests where id=p_request_id and user_id=p_user_id and status in ('APPROVED','REJECTED','CANCELLED','SYSTEM_FAILED','INFO_EXPIRED','PURGE_PENDING','PURGED') for update;
  if not found then raise exception 'CONSULTATION_PURGE_NOT_ALLOWED'; end if;
  if r.status='PURGED' then return r; end if;
  update public.consultation_requests set status='PURGE_PENDING',purge_requested_at=coalesce(purge_requested_at,now()),updated_at=now() where id=r.id;
  delete from public.consultation_response_versions where request_id=r.id;
  delete from public.consultation_private_payloads where request_id=r.id;
  update public.consultation_requests set status='PURGED',purged_at=now(),updated_at=now() where id=r.id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key)
    values(r.id,r.user_id,'PURGED',p_user_id,'purge:'||r.id) on conflict(idempotency_key) do nothing;
  return r;
end $$;

create or replace function public.release_consultation_request(p_request_id uuid,p_actor_id uuid,p_expected text[],p_target text,p_reason text)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests;
begin
  select * into r from public.consultation_requests where id=p_request_id for update;
  if not found then raise exception 'CONSULTATION_REQUEST_NOT_FOUND'; end if;
  if not (r.status=any(p_expected)) or r.status in ('APPROVED','REJECTED','CANCELLED','SYSTEM_FAILED','INFO_EXPIRED','PURGED') then raise exception 'CONSULTATION_RELEASE_CONFLICT'; end if;
  if p_target not in ('REJECTED','CANCELLED','SYSTEM_FAILED','INFO_EXPIRED') then raise exception 'INVALID_RELEASE_TARGET'; end if;
  if p_target='CANCELLED' and p_actor_id<>r.user_id then raise exception 'REQUEST_OWNER_MISMATCH'; end if;
  update public.consultation_quota_grants set quota_available=quota_available+1,quota_reserved=quota_reserved-1 where id=r.grant_id and quota_reserved>0;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  insert into public.consultation_quota_ledger(grant_id,request_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(r.grant_id,r.id,'RELEASE',1,-1,0,'release:'||r.id) on conflict(idempotency_key) do nothing;
  update public.consultation_requests set status=p_target,updated_at=now() where id=r.id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key,metadata)
    values(r.id,r.user_id,p_target,p_actor_id,'status:'||r.id||':'||p_target,jsonb_build_object('reason',left(p_reason,500))) on conflict(idempotency_key) do nothing;
  return r;
end $$;

create or replace function public.expire_consultation_info_holds(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare item record; count_released integer:=0;
begin
  for item in select id from public.consultation_requests where user_id=p_user_id and status='NEEDS_INFO' and hold_until<=now() for update skip locked loop
    perform public.release_consultation_request(item.id,p_user_id,array['NEEDS_INFO'],'INFO_EXPIRED','NEEDS_INFO_HOLD_EXPIRED'); count_released:=count_released+1;
  end loop;
  return count_released;
end $$;

create or replace function public.approve_consultation_request(p_request_id uuid,p_reviewer_id uuid,p_version integer,p_content_hash text,p_diff_hash text)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests; v public.consultation_response_versions;
begin
  select * into r from public.consultation_requests where id=p_request_id for update;
  if not found then raise exception 'CONSULTATION_REQUEST_NOT_FOUND'; end if;
  if r.status='APPROVED' then return r; end if;
  if r.status not in ('DRAFT_READY','HUMAN_REVIEW') then raise exception 'REQUEST_NOT_APPROVABLE'; end if;
  select * into v from public.consultation_response_versions where request_id=r.id and version=p_version and author_kind='PRIMARY_REVIEWER_FINAL' and author_id=p_reviewer_id;
  if not found then raise exception 'FINAL_VERSION_NOT_FOUND'; end if;
  if v.content_hash<>p_content_hash or v.diff_hash<>p_diff_hash then raise exception 'FINAL_VERSION_HASH_MISMATCH'; end if;
  update public.consultation_quota_grants set quota_reserved=quota_reserved-1,quota_consumed=quota_consumed+1 where id=r.grant_id and quota_reserved>0;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  insert into public.consultation_quota_ledger(grant_id,request_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(r.grant_id,r.id,'CONSUME',0,-1,1,'consume:'||r.id) on conflict(idempotency_key) do nothing;
  update public.consultation_requests set status='APPROVED',quota_consumed=true,reviewer_id=p_reviewer_id,reviewer_display_name='易老师',reviewed_at=now(),current_version=p_version,final_content_hash=v.content_hash,final_diff_hash=v.diff_hash,updated_at=now() where id=r.id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key,metadata)
    values(r.id,r.user_id,'APPROVED',p_reviewer_id,'approve:'||r.id,jsonb_build_object('version',p_version,'contentHash',v.content_hash,'diffHash',v.diff_hash)) on conflict(idempotency_key) do nothing;
  return r;
end $$;

revoke all on function public.grant_consultation_quota_for_paid_order(uuid) from public,anon,authenticated;
revoke all on function public.reserve_consultation_request(uuid,uuid,text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.transition_consultation_request(uuid,uuid,text[],text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.supplement_consultation_request(uuid,uuid,text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.purge_consultation_private_data(uuid,uuid) from public,anon,authenticated;
revoke all on function public.release_consultation_request(uuid,uuid,text[],text,text) from public,anon,authenticated;
revoke all on function public.approve_consultation_request(uuid,uuid,integer,text,text) from public,anon,authenticated;
revoke all on function public.expire_consultation_info_holds(uuid) from public,anon,authenticated;
grant execute on function public.grant_consultation_quota_for_paid_order(uuid) to service_role;
grant execute on function public.reserve_consultation_request(uuid,uuid,text,integer,text,text,text) to service_role;
grant execute on function public.transition_consultation_request(uuid,uuid,text[],text,jsonb,timestamptz) to service_role;
grant execute on function public.supplement_consultation_request(uuid,uuid,text,integer,text,text,text) to service_role;
grant execute on function public.purge_consultation_private_data(uuid,uuid) to service_role;
grant execute on function public.release_consultation_request(uuid,uuid,text[],text,text) to service_role;
grant execute on function public.approve_consultation_request(uuid,uuid,integer,text,text) to service_role;
grant execute on function public.expire_consultation_info_holds(uuid) to service_role;
