-- Supabase vergibt EXECUTE auf neue Funktionen im public-Schema
-- standardmäßig direkt an die Rollen anon/authenticated (nicht nur über
-- die PUBLIC-Pseudorolle) - "revoke ... from public" allein entzieht der
-- anon-Rolle das Ausführungsrecht deshalb nicht. Analog zu
-- current_company_id() (siehe restrict_current_company_id_execute)
-- schränken wir hier explizit auch auf die anon-Rolle ein.
revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- touch_conversation_on_message() ist ausschließlich als Trigger gedacht
-- (kein direkter RPC-Aufruf sinnvoll möglich, da "returns trigger"), wird
-- aber aus Konsistenzgründen genauso eingeschränkt.
revoke all on function public.touch_conversation_on_message() from public, anon;
grant execute on function public.touch_conversation_on_message() to authenticated;
