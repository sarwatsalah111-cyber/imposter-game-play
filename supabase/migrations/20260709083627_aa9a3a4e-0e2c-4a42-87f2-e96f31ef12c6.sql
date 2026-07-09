
-- 1) Restrict column-level SELECT on rooms: hide secret_word and imposter_session_id from clients
REVOKE SELECT ON public.rooms FROM anon, authenticated;
GRANT SELECT (
  id, code, host_session_id, language, phase, status,
  current_round, total_rounds, max_players, min_players,
  discussion_time, voting_time, reveal_time, spoke_rounds,
  categories, match_id, created_at, updated_at, closed_at
) ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;

-- 2) Restrict column-level SELECT on round_results: hide secret_word from clients
REVOKE SELECT ON public.round_results FROM anon, authenticated;
GRANT SELECT (
  id, room_id, match_id, round_index, imposter_player_id,
  outcome, votes, points_awarded, created_at
) ON public.round_results TO anon, authenticated;
GRANT ALL ON public.round_results TO service_role;

-- 3) Remove overly permissive UPDATE policy on room_players.
-- All writes flow through server-side edge functions (service_role bypasses RLS).
DROP POLICY IF EXISTS "Anyone can update players" ON public.room_players;
REVOKE INSERT, UPDATE, DELETE ON public.room_players FROM anon, authenticated;
GRANT ALL ON public.room_players TO service_role;

-- 4) Ensure Realtime publication does not broadcast the sensitive columns.
DO $$
DECLARE
  pub_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') INTO pub_exists;
  IF pub_exists THEN
    -- rooms: re-add with explicit column list excluding secret_word, imposter_session_id
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.rooms';
    END IF;
    EXECUTE $sql$
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms (
        id, code, host_session_id, language, phase, status,
        current_round, total_rounds, max_players, min_players,
        discussion_time, voting_time, reveal_time, spoke_rounds,
        categories, match_id, created_at, updated_at, closed_at
      )
    $sql$;

    -- round_results: re-add without secret_word
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'round_results'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.round_results';
    END IF;
    EXECUTE $sql$
      ALTER PUBLICATION supabase_realtime ADD TABLE public.round_results (
        id, room_id, match_id, round_index, imposter_player_id,
        outcome, votes, points_awarded, created_at
      )
    $sql$;
  END IF;
END $$;
