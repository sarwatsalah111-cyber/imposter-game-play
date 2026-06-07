ALTER TABLE public.rooms REPLICA IDENTITY DEFAULT;

ALTER PUBLICATION supabase_realtime DROP TABLE public.rooms;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms (
  id,
  code,
  host_session_id,
  status,
  min_players,
  max_players,
  total_rounds,
  current_round,
  reveal_time,
  discussion_time,
  voting_time,
  language,
  phase,
  created_at,
  updated_at,
  closed_at,
  match_id,
  spoke_rounds,
  categories
);