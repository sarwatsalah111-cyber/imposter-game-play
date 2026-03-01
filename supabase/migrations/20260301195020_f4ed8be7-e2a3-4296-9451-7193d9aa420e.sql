
-- Add score and match_id columns to room_players
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS match_id uuid NOT NULL DEFAULT gen_random_uuid();

-- Add match_id to rooms for tracking replays
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS match_id uuid NOT NULL DEFAULT gen_random_uuid();

-- Create round_results table (immutable snapshot per round)
CREATE TABLE public.round_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  match_id uuid NOT NULL,
  round_index integer NOT NULL,
  imposter_player_id text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('IMPOSTER_ESCAPED', 'IMPOSTER_CAUGHT', 'IMPOSTER_GUESS_WIN')),
  votes jsonb DEFAULT '{}'::jsonb,
  points_awarded jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_word text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (room_id, match_id, round_index)
);

ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read round_results" ON public.round_results
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert round_results" ON public.round_results
  FOR INSERT WITH CHECK (true);

-- Create score_events table (append-only audit log)
CREATE TABLE public.score_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  match_id uuid NOT NULL,
  round_index integer NOT NULL,
  player_id text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('ESCAPE', 'CORRECT_VOTE', 'GUESS_WIN')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read score_events" ON public.score_events
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert score_events" ON public.score_events
  FOR INSERT WITH CHECK (true);

-- Enable realtime for score updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_events;
