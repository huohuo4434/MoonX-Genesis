-- Production-safe fixture test: every test row is rolled back. No auth changes.
begin;
do $$
declare
  u uuid; p uuid := gen_random_uuid(); r uuid := gen_random_uuid();
  v timestamptz; original_v timestamptz; caught boolean;
begin
  select id into u from auth.users where not exists(select 1 from public.member_note_replies r where r.author_id=auth.users.id and r.created_at>now()-interval '10 seconds') order by created_at limit 1;
  if u is null then raise exception 'Test needs an existing author'; end if;
  assert not has_table_privilege('anon','public.member_notes','SELECT');
  assert not has_table_privilege('authenticated','public.member_note_replies','SELECT');
  assert not has_function_privilege('authenticated','public.member_note_save(uuid,uuid,text,text,text,text,text,boolean,timestamptz)','EXECUTE');
  assert not has_function_privilege('anon','public.member_note_add_reply(uuid,uuid,uuid,text,boolean)','EXECUTE');
  assert has_table_privilege('service_role','public.member_notes','INSERT');
  assert (select relrowsecurity from pg_class where oid='public.member_notes'::regclass);
  assert (select relrowsecurity from pg_class where oid='public.member_note_replies'::regclass);

  perform public.member_note_save(p,u,'TEST title',E'Opening line\nPRIVATE BODY','TEST EN',E'English opening\nPRIVATE EN','draft',true,null);
  assert (select preview='Opening line' and preview_en='English opening' from public.member_notes where id=p);
  select updated_at into original_v from public.member_notes where id=p;
  perform public.member_note_save(p,u,'TEST title',E'Opening line\nPRIVATE BODY','TEST EN',E'English opening\nPRIVATE EN','draft',true,null);
  assert (select updated_at=original_v from public.member_notes where id=p);
  perform public.member_note_save(p,u,'TEST title',E'Opening line\nPRIVATE BODY','TEST EN',E'English opening\nPRIVATE EN','published',true,original_v);
  select updated_at into v from public.member_notes where id=p;
  caught := false;
  begin
    perform public.member_note_save(p,u,'Stale overwrite','BAD','','','published',true,original_v);
  exception when others then
    if sqlerrm='EDIT_CONFLICT' then caught:=true; else raise; end if;
  end;
  assert caught;
  assert (select title='TEST title' from public.member_notes where id=p);

  -- Reuse the selected author only as a FK; never change auth or member records.
  perform public.member_note_add_reply(r,p,u,'Test reply',false);
  perform public.member_note_add_reply(r,p,u,'Test reply',false);
  assert (select count(*)=1 from public.member_note_replies where id=r);
  caught:=false;
  begin
    perform public.member_note_add_reply(gen_random_uuid(),p,u,'Spam reply',false);
  exception when others then
    if sqlerrm='REPLY_RATE_LIMIT' then caught:=true; else raise; end if;
  end;
  assert caught;
  update public.member_notes set status='archived', updated_at=clock_timestamp() where id=p;
  caught:=false;
  begin
    perform public.member_note_save(p,u,'TEST title',E'Opening line\nPRIVATE BODY','TEST EN',E'English opening\nPRIVATE EN','published',true,v);
  exception when others then
    if sqlerrm='EDIT_CONFLICT' then caught:=true; else raise; end if;
  end;
  assert caught;
  assert (select status='archived' from public.member_notes where id=p);
  caught:=false;
  begin
    perform public.member_note_add_reply(gen_random_uuid(),p,u,'Closed reply',false);
  exception when others then
    if sqlerrm='REPLIES_CLOSED' then caught:=true; else raise; end if;
  end;
  assert caught;
end $$;
rollback;
select 'MEMBER NOTES DATABASE TRANSACTION TESTS PASSED; FIXTURES ROLLED BACK' as result;
