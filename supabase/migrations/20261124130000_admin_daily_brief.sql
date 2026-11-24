-- L1-30b: « Résumé du jour » of the dashboard of the back office (SPEC-V2
-- section 17, outil admin_daily_brief of section 12): the assistant phrases,
-- in five lines at most, the facts the dashboard already reads (listings to
-- review, open cases and reports, proofs and identity documents to check,
-- interventions, offers, sign-ups and plans of the last 24 h). The facts are
-- read in code with the admin's session; the model only phrases them.
--
-- 1. admin_daily_briefs: the cache of the brief, one hour (generated when the
--    dashboard opens and no brief of less than an hour exists). One brief for
--    the whole team: the facts are the same for every member. Read and
--    written by the team only; never changed nor deleted by a client. A new
--    brief is refused within 5 minutes of the last one (« Régénérer » cannot
--    bill the model in a loop; two members opening the dashboard at the same
--    moment: the second brief is shown, not kept).
-- 2. ai_conversations.kind: 'daily_brief', logged like the other calls of
--    the model, in the context of the team only (as 'case_summary').

create table public.admin_daily_briefs (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 1200),
  -- The log of the call (ai_conversations, kind 'daily_brief').
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  generated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index admin_daily_briefs_created_idx on public.admin_daily_briefs (created_at desc);
create index admin_daily_briefs_conversation_idx on public.admin_daily_briefs (conversation_id)
  where conversation_id is not null;
create index admin_daily_briefs_generated_by_idx on public.admin_daily_briefs (generated_by)
  where generated_by is not null;
create trigger admin_daily_briefs_set_updated_at before update on public.admin_daily_briefs
  for each row execute function public.set_updated_at();

-- Whether a brief was written within the last 5 minutes (read as the owner:
-- the check of the insert policy does not depend on what the caller reads).
-- False for anyone but the team: it tells nothing of the briefs to others.
create function public.admin_daily_brief_recent() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
     and exists (select 1 from public.admin_daily_briefs
                  where created_at > now() - interval '5 minutes');
$$;

alter table public.admin_daily_briefs enable row level security;

create policy admin_daily_briefs_select_admin on public.admin_daily_briefs
  for select to authenticated
  using (public.is_admin());

create policy admin_daily_briefs_insert_admin on public.admin_daily_briefs
  for insert to authenticated
  with check (public.is_admin() and public.is_active_user()
              and generated_by = auth.uid()
              and not public.admin_daily_brief_recent());

-- No update, no delete: a brief is written once, then replaced by a newer one.
revoke all on public.admin_daily_briefs from anon, authenticated;
grant select (id, body, conversation_id, generated_by, created_at, updated_at)
  on public.admin_daily_briefs to authenticated;
grant insert (body, conversation_id) on public.admin_daily_briefs to authenticated;

revoke execute on function public.admin_daily_brief_recent() from public, anon;
grant execute on function public.admin_daily_brief_recent() to authenticated;

-- 2. The log ---------------------------------------------------------------
alter table public.ai_conversations
  drop constraint ai_conversations_kind_check;
alter table public.ai_conversations
  add constraint ai_conversations_kind_check
    check (kind in ('chat', 'reply_suggestion', 'listing_description', 'rejection_reason',
                    'case_summary', 'listing_summary', 'document_analysis', 'daily_brief'));

alter table public.ai_conversations
  drop constraint ai_conversations_team_kinds_check;
alter table public.ai_conversations
  add constraint ai_conversations_team_kinds_check
    check (kind not in ('rejection_reason', 'case_summary', 'daily_brief') or context = 'admin');
