WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY room_id, lower(btrim(nickname)) ORDER BY joined_at) AS rn
  FROM public.room_players
)
UPDATE public.room_players p
SET nickname = p.nickname || ' (' || r.rn || ')'
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS room_players_unique_nickname_per_room
ON public.room_players (room_id, lower(btrim(nickname)));