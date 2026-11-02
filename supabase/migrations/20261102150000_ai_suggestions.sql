-- L1-29: the suggestions of the assistant (SPEC-V2 section 12): a reply
-- suggested to a seller in the messaging, a description of a listing drafted
-- for the price step. Each is a call of the model logged like the
-- conversation with the assistant (ai_conversations, ai_messages: CLAUDE.md
-- section 8, kept for the admin to read again), with its own kind: the panel
-- of the assistant reopens the last conversation of the person, never one of
-- these.
--
-- Rights unchanged: the person opens their own (RLS of L1-05, the property
-- theirs when one is given) and chooses its kind among these three.

alter table public.ai_conversations
  add column kind text not null default 'chat'
    check (kind in ('chat', 'reply_suggestion', 'listing_description'));

grant insert (kind) on public.ai_conversations to authenticated;
