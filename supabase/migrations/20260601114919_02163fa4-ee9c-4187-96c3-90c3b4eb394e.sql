REVOKE EXECUTE ON FUNCTION public.increment_player_score(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_word_text(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.word_bank_normalize_trigger() FROM PUBLIC, anon, authenticated;