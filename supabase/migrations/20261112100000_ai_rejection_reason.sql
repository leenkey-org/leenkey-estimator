-- L1-30d: « Rédiger avec l'assistant » in the refusal of a listing (SPEC-V2
-- section 17). The motive drafted for the team is a call of the model,
-- logged like the others (ai_conversations, ai_messages: CLAUDE.md section
-- 8) under its own kind, so that the panel of the assistant of the admin
-- never reopens it as a conversation. Only the team writes it (context
-- 'admin', which the insert policy of L1-05 keeps to is_admin()); no
-- property on the log: the policy accepts only a property of the person.

alter table public.ai_conversations
  drop constraint ai_conversations_kind_check;
alter table public.ai_conversations
  add constraint ai_conversations_kind_check
    check (kind in ('chat', 'reply_suggestion', 'listing_description', 'rejection_reason'));

alter table public.ai_conversations
  add constraint ai_conversations_rejection_reason_check
    check (kind <> 'rejection_reason' or context = 'admin');
