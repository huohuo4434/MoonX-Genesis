-- Personal member posts are independent of official forecast/verification tables.
create table public.member_notes (
  id uuid primary key,
  author_id uuid not null references auth.users(id),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 12000),
  title_en text not null default '' check (char_length(title_en) <= 160),
  body_en text not null default '' check (char_length(body_en) <= 12000),
  preview text generated always as (left(split_part(btrim(body), E'\n', 1), 120)) stored,
  preview_en text generated always as (left(split_part(btrim(body_en), E'\n', 1), 120)) stored,
  status text not null check (status in ('draft','published','archived')),
  comments_open boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index member_notes_feed_idx on public.member_notes(status, published_at desc, created_at desc, id desc);
create index member_notes_author_idx on public.member_notes(author_id);
create table public.member_note_replies (
  id uuid primary key,
  post_id uuid not null references public.member_notes(id),
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_teacher boolean not null default false,
  hidden_at timestamptz,
  moderated_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index member_note_replies_thread_idx on public.member_note_replies(post_id, created_at, id);
create index member_note_replies_author_idx on public.member_note_replies(author_id, created_at desc);
create index member_note_replies_moderator_idx on public.member_note_replies(moderated_by);
alter table public.member_notes enable row level security;
alter table public.member_note_replies enable row level security;
revoke all on public.member_notes, public.member_note_replies from public, anon, authenticated;
grant select, insert, update on public.member_notes, public.member_note_replies to service_role;

-- Server-only functions. User identity/role comes from the authenticated route,
-- never from the request payload. Invoker preserves service-role/RLS boundaries.
create function public.member_note_save(p_id uuid, p_author_id uuid, p_title text, p_body text, p_title_en text, p_body_en text, p_status text, p_comments_open boolean, p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare previous public.member_notes;
begin
  if p_status not in ('draft','published') then raise exception 'INVALID_INPUT'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 1910));
  select * into previous from public.member_notes where id=p_id for update;
  if found then
    if previous.title=p_title and previous.body=p_body and previous.title_en=p_title_en and previous.body_en=p_body_en and previous.status=p_status and previous.comments_open=p_comments_open then return; end if;
    if p_expected_updated_at is null or previous.updated_at <> p_expected_updated_at then raise exception 'EDIT_CONFLICT'; end if;
  elsif p_expected_updated_at is not null then raise exception 'EDIT_CONFLICT';
  end if;
  insert into public.member_notes(id, author_id, title, body, title_en, body_en, status, comments_open, published_at)
  values(p_id,p_author_id,p_title,p_body,p_title_en,p_body_en,p_status,p_comments_open,case when p_status='published' then now() else null end)
  on conflict(id) do update set title=excluded.title, body=excluded.body, title_en=excluded.title_en, body_en=excluded.body_en,
    status=excluded.status, comments_open=excluded.comments_open, updated_at=clock_timestamp(),
    published_at=coalesce(member_notes.published_at, excluded.published_at);
end $$;
create function public.member_note_add_reply(p_id uuid, p_post_id uuid, p_author_id uuid, p_body text, p_is_teacher boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare existing public.member_note_replies; target public.member_notes;
begin
  -- Cross-instance spam guard, and idempotent retries after network failures.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_author_id::text, 1909));
  select * into existing from public.member_note_replies where id=p_id;
  if found then
    if existing.author_id=p_author_id and existing.post_id=p_post_id and existing.body=p_body then return; end if;
    raise exception 'INVALID_INPUT';
  end if;
  select * into target from public.member_notes where id=p_post_id for share;
  if not found or target.status <> 'published' or not target.comments_open then raise exception 'REPLIES_CLOSED'; end if;
  if exists(select 1 from public.member_note_replies where author_id=p_author_id and created_at>now()-interval '10 seconds') then raise exception 'REPLY_RATE_LIMIT'; end if;
  insert into public.member_note_replies(id,post_id,author_id,body,is_teacher) values(p_id,p_post_id,p_author_id,p_body,p_is_teacher);
end $$;
revoke all on function public.member_note_save(uuid,uuid,text,text,text,text,text,boolean,timestamptz) from public, anon, authenticated;
revoke all on function public.member_note_add_reply(uuid,uuid,uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.member_note_save(uuid,uuid,text,text,text,text,text,boolean,timestamptz) to service_role;
grant execute on function public.member_note_add_reply(uuid,uuid,uuid,text,boolean) to service_role;
