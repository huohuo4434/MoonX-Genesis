-- Recover a failed consultation into manual review without losing the original
-- encrypted question or consuming a second entitlement.

create or replace function public.recover_failed_consultation_for_human_review(
  p_request_id uuid,
  p_actor_id uuid
)
returns public.consultation_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.consultation_requests;
begin
  select * into r from public.consultation_requests where id=p_request_id for update;
  if not found then raise exception 'CONSULTATION_REQUEST_NOT_FOUND'; end if;
  if r.status='HUMAN_REVIEW' and exists(
    select 1 from public.consultation_request_events
    where request_id=r.id and event_type='RECOVERED_FOR_HUMAN_REVIEW'
  ) then return r; end if;
  if r.status<>'SYSTEM_FAILED' or r.quota_consumed then
    raise exception 'CONSULTATION_RECOVERY_CONFLICT';
  end if;
  if exists(
    select 1 from public.consultation_request_events
    where request_id=r.id and event_type='RECOVERED_FOR_HUMAN_REVIEW'
  ) then raise exception 'CONSULTATION_RECOVERY_ALREADY_USED'; end if;

  update public.consultation_quota_grants
    set quota_available=quota_available-1, quota_reserved=quota_reserved+1
    where id=r.grant_id and quota_available>0;
  if not found then raise exception 'CONSULTATION_RECOVERY_QUOTA_UNAVAILABLE'; end if;

  insert into public.consultation_quota_ledger(
    grant_id,request_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key
  ) values (
    r.grant_id,r.id,'RESERVE',-1,1,0,'recover-reserve:'||r.id
  ) on conflict(idempotency_key) do nothing;

  update public.consultation_requests
    set status='HUMAN_REVIEW',missing_fields='[]'::jsonb,hold_until=null,updated_at=clock_timestamp()
    where id=r.id returning * into r;
  insert into public.consultation_request_events(
    request_id,user_id,event_type,actor_id,idempotency_key,metadata
  ) values (
    r.id,r.user_id,'RECOVERED_FOR_HUMAN_REVIEW',p_actor_id,
    'recover-human-review:'||r.id,
    jsonb_build_object('priorStatus','SYSTEM_FAILED','quotaConsumed',false)
  ) on conflict(idempotency_key) do nothing;
  return r;
end $$;

-- A recovered request is permanently manual-only. It may be approved or
-- rejected, but it must never enter another AI failure/recovery cycle.
create or replace function public.release_consultation_request(p_request_id uuid,p_actor_id uuid,p_expected text[],p_target text,p_reason text)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests;
begin
  select * into r from public.consultation_requests where id=p_request_id for update;
  if not found then raise exception 'CONSULTATION_REQUEST_NOT_FOUND'; end if;
  if r.status=p_target then return r; end if;
  if not (r.status=any(p_expected)) or r.status in ('APPROVED','REJECTED','CANCELLED','SYSTEM_FAILED','INFO_EXPIRED','PURGED') then raise exception 'CONSULTATION_RELEASE_CONFLICT'; end if;
  if p_target not in ('REJECTED','CANCELLED','SYSTEM_FAILED','INFO_EXPIRED') then raise exception 'INVALID_RELEASE_TARGET'; end if;
  if p_target='CANCELLED' and p_actor_id<>r.user_id then raise exception 'REQUEST_OWNER_MISMATCH'; end if;
  if p_target='SYSTEM_FAILED' and exists(
    select 1 from public.consultation_request_events
    where request_id=r.id and event_type='RECOVERED_FOR_HUMAN_REVIEW'
  ) then raise exception 'RECOVERED_CONSULTATION_IS_MANUAL_ONLY'; end if;
  update public.consultation_quota_grants set quota_available=quota_available+1,quota_reserved=quota_reserved-1 where id=r.grant_id and quota_reserved>0;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  insert into public.consultation_quota_ledger(grant_id,request_id,event_type,available_delta,reserved_delta,consumed_delta,idempotency_key)
    values(r.grant_id,r.id,'RELEASE',1,-1,0,'release:'||r.id||':'||p_target) on conflict(idempotency_key) do nothing;
  update public.consultation_requests set status=p_target,updated_at=now() where id=r.id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key,metadata)
    values(r.id,r.user_id,p_target,p_actor_id,'status:'||r.id||':'||p_target,jsonb_build_object('reason',left(p_reason,500))) on conflict(idempotency_key) do nothing;
  return r;
end $$;

create or replace function public.transition_consultation_request(p_request_id uuid,p_actor_id uuid,p_expected text[],p_target text,p_missing_fields jsonb,p_hold_until timestamptz)
returns public.consultation_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.consultation_requests; prior_status text;
begin
  if p_target not in ('SUBMITTED','AI_DRAFTING','DRAFT_READY','HUMAN_REVIEW','NEEDS_INFO') then raise exception 'INVALID_TRANSITION_TARGET'; end if;
  select * into r from public.consultation_requests where id=p_request_id for update;
  if not found or not (r.status=any(p_expected)) or r.status='APPROVED' then raise exception 'CONSULTATION_TRANSITION_CONFLICT'; end if;
  if r.status='SYSTEM_FAILED' then raise exception 'USE_FAILED_CONSULTATION_RECOVERY'; end if;
  if p_target='AI_DRAFTING' and exists(
    select 1 from public.consultation_request_events
    where request_id=r.id and event_type='RECOVERED_FOR_HUMAN_REVIEW'
  ) then raise exception 'RECOVERED_CONSULTATION_IS_MANUAL_ONLY'; end if;
  prior_status:=r.status;
  update public.consultation_requests set status=p_target,missing_fields=coalesce(p_missing_fields,'[]'::jsonb),hold_until=p_hold_until,updated_at=clock_timestamp()
    where id=p_request_id returning * into r;
  insert into public.consultation_request_events(request_id,user_id,event_type,actor_id,idempotency_key,metadata)
    values(r.id,r.user_id,p_target,p_actor_id,'transition:'||r.id||':'||prior_status||':'||p_target||':'||r.updated_at::text||':'||gen_random_uuid()::text,jsonb_build_object('expected',p_expected,'priorStatus',prior_status,'transitionedAt',r.updated_at));
  return r;
end $$;

revoke all on function public.recover_failed_consultation_for_human_review(uuid,uuid) from public,anon,authenticated;
grant execute on function public.recover_failed_consultation_for_human_review(uuid,uuid) to service_role;
revoke all on function public.release_consultation_request(uuid,uuid,text[],text,text) from public,anon,authenticated;
grant execute on function public.release_consultation_request(uuid,uuid,text[],text,text) to service_role;
revoke all on function public.transition_consultation_request(uuid,uuid,text[],text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.transition_consultation_request(uuid,uuid,text[],text,jsonb,timestamptz) to service_role;
