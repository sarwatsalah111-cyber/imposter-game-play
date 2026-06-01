REVOKE SELECT ON public.rooms FROM anon, authenticated;
GRANT SELECT (
  id, code, host_session_id, status, phase, language,
  current_round, total_rounds, reveal_time, voting_time,
  discussion_time, spoke_rounds, min_players, max_players,
  categories, match_id, created_at, updated_at, closed_at
) ON public.rooms TO anon, authenticated;

ALTER PUBLICATION supabase_realtime DROP TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms (
  id, code, host_session_id, status, phase, language,
  current_round, total_rounds, reveal_time, voting_time,
  discussion_time, spoke_rounds, min_players, max_players,
  categories, match_id, created_at, updated_at, closed_at
);

DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;

DROP POLICY IF EXISTS "Anyone can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.room_events;
DROP POLICY IF EXISTS "Anyone can insert score_events" ON public.score_events;
DROP POLICY IF EXISTS "Anyone can insert round_results" ON public.round_results;

DROP POLICY IF EXISTS "Anyone can insert players" ON public.room_players;
DROP POLICY IF EXISTS "Anyone can delete players" ON public.room_players;

DROP POLICY IF EXISTS "Anyone can insert words" ON public.word_bank;
DROP POLICY IF EXISTS "Anyone can update words" ON public.word_bank;
DROP POLICY IF EXISTS "Anyone can delete words" ON public.word_bank;

DROP VIEW IF EXISTS public.rooms_safe;