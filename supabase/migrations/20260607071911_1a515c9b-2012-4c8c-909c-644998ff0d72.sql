
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.room_players TO service_role;
GRANT ALL ON public.room_events TO service_role;
GRANT ALL ON public.votes TO service_role;
GRANT ALL ON public.round_results TO service_role;
GRANT ALL ON public.score_events TO service_role;
GRANT ALL ON public.word_bank TO service_role;

GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT SELECT, UPDATE ON public.room_players TO anon, authenticated;
GRANT SELECT ON public.room_events TO anon, authenticated;
GRANT SELECT ON public.votes TO anon, authenticated;
GRANT SELECT ON public.round_results TO anon, authenticated;
GRANT SELECT ON public.score_events TO anon, authenticated;
GRANT SELECT ON public.word_bank TO anon, authenticated;
