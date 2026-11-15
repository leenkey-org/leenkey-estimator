-- L2-06: the assistant of the buyer (SPEC-V2 section 12). Its tool
-- prefill_offer prepares the draft of an offer with the price the buyer said
-- in the conversation, once they have read it and confirmed
-- (ConfirmActionCard): the form of the offer then opens with it. Nothing is
-- sent: an offer leaves only through offer_submit, from its form, once the
-- buyer has filled its seven steps and ticked its declarations themselves.
--
-- ai_prefill_offer: the price of the draft and the result of the tool in the
-- log, in one transaction, with the rights of the buyer (security invoker:
-- RLS and column grants of offers and ai_messages). The draft changes only if
-- its result is logged, once (ai_messages_tool_result_idx): a call already
-- answered (cancelled, replaced by a new message, confirmed in another tab)
-- or a listing that takes no offer from this buyer (offer_can_draft) leaves
-- both as they were. The draft of the buyer on this listing is the one that
-- changes (offers_one_draft_idx); without one, it is created, as the first
-- step of the form does. Its declarations are unticked, as after any change
-- of a step: what was declared is no longer what is written.
--
-- No table, no policy. The file only adds.

create function public.ai_prefill_offer(
  p_conversation_id uuid,
  p_tool_use_id text,
  p_tool_name text,
  p_listing_id uuid,
  p_price_cents bigint
) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_offer uuid;
begin
  if p_tool_name is distinct from 'prefill_offer' then
    raise exception 'ai_prefill_offer: prefill_offer only' using errcode = '22023';
  end if;
  if p_price_cents is null or p_price_cents <= 0 or p_price_cents % 100 <> 0 then
    raise exception 'ai_prefill_offer: a price in whole euros' using errcode = '22023';
  end if;
  insert into public.ai_messages (conversation_id, role, content)
  values (p_conversation_id, 'tool', jsonb_build_object(
    'type', 'tool_result', 'tool_use_id', p_tool_use_id, 'name', p_tool_name,
    'status', 'confirmed', 'result', jsonb_build_object('prefilled', true)));
  update public.offers
     set price_cents = p_price_cents, declarations = '{}'
   where buyer_id = auth.uid() and listing_id = p_listing_id and status = 'draft'
  returning id into v_offer;
  if v_offer is null then
    insert into public.offers (listing_id, buyer_id, price_cents)
    values (p_listing_id, auth.uid(), p_price_cents)
    returning id into v_offer;
  end if;
  return v_offer;
end;
$$;

revoke execute on function public.ai_prefill_offer(uuid, text, text, uuid, bigint) from public, anon;
grant execute on function public.ai_prefill_offer(uuid, text, text, uuid, bigint) to authenticated;
