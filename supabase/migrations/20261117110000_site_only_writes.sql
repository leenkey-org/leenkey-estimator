-- P-01 (docs/SECURITE.md, « Fonctions appelables par un visiteur hors des
-- limites de débit du site », revue de L1-32): the count of views of a
-- listing and the record of a valuation are written only through this site's
-- server, which proves itself with the key derived from CRON_SECRET (as
-- rate_limit_hit, 20261108160000_rate_limits.sql). Until now anyone with the
-- public key could call them directly: views inflated, valuations added in
-- bulk. The functions of before stay (nothing dropped) but no longer answer a
-- visitor or an account: the new ones, with p_server, call them.

create function public.listing_view_increment(p_listing_id uuid, p_server text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.rate_limit_server(p_server);
  perform public.listing_view_increment(p_listing_id);
end;
$$;

-- The key first: the amounts and the email keep their defaults (an empty one
-- is left out of the call), and no call of the function of before matches.
create function public.estimation_record(
  p_server text, p_input jsonb, p_result jsonb,
  p_value_cents bigint default null, p_low_cents bigint default null,
  p_high_cents bigint default null, p_email text default null
) returns table (id uuid, claim_token text)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.rate_limit_server(p_server);
  return query select * from public.estimation_record(
    p_input, p_result, p_value_cents, p_low_cents, p_high_cents, p_email);
end;
$$;

revoke execute on function public.listing_view_increment(uuid) from public, anon, authenticated;
revoke execute on function public.estimation_record(jsonb, jsonb, bigint, bigint, bigint, text)
  from public, anon, authenticated;
revoke execute on function public.listing_view_increment(uuid, text) from public;
grant execute on function public.listing_view_increment(uuid, text) to anon, authenticated;
revoke execute on function public.estimation_record(text, jsonb, jsonb, bigint, bigint, bigint, text) from public;
grant execute on function public.estimation_record(text, jsonb, jsonb, bigint, bigint, bigint, text)
  to anon, authenticated;
