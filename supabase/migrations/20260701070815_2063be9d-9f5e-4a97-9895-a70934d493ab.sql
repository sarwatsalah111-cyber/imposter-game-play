-- Enforce single vote per (room, round, voter)
DELETE FROM public.votes v USING public.votes v2
  WHERE v.ctid < v2.ctid
    AND v.room_id = v2.room_id
    AND v.round = v2.round
    AND v.voter_session_id = v2.voter_session_id;

CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_per_round
  ON public.votes(room_id, round, voter_session_id);