
CREATE OR REPLACE FUNCTION public.increment_player_score(p_room_id uuid, p_session_id text, p_delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE room_players
  SET score = score + p_delta
  WHERE room_id = p_room_id AND session_id = p_session_id;
$$;
