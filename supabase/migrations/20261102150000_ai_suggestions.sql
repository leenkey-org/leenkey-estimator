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

-- A message is marked as written from a suggestion of the assistant
-- (messages.ai_suggested, SPEC-V2 8.6) by its sender, who has that right
-- since L1-05; only the seller of the conversation gets suggestions: a mark
-- sent by anyone else (the buyer) is dropped, so that the count stays true.
create function public.messages_ai_suggested_by_seller() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ai_suggested and not exists (
    select 1 from public.conversations c
     where c.id = new.conversation_id and c.seller_id = new.sender_id
  ) then
    new.ai_suggested := false;
  end if;
  return new;
end;
$$;

create trigger messages_ai_suggested_by_seller before insert on public.messages
  for each row execute function public.messages_ai_suggested_by_seller();

revoke execute on function public.messages_ai_suggested_by_seller() from public, anon, authenticated;
