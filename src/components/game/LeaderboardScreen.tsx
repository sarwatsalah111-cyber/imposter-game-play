import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Trophy, Crown, Wifi, WifiOff, Medal, Star } from 'lucide-react';

interface LeaderboardPlayer {
  session_id: string;
  nickname: string;
  score: number;
  is_host: boolean;
  is_online: boolean;
  joined_at: string;
}

interface LatestPoints {
  player_id: string;
  delta: number;
  reason: string;
  round_index: number;
}

interface LeaderboardData {
  players: LeaderboardPlayer[];
  round_results: unknown[];
  latest_points: LatestPoints[];
  current_round: number;
}

export function LeaderboardScreen() {
  const { room, sessionId, language, isHost } = useGame();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();
  const prevScoresRef = useRef<Record<string, number>>({});

  const fetchLeaderboard = async () => {
    if (!room) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: result, error: err } = await supabase.functions.invoke('game-engine', {
        body: { action: 'get-leaderboard', room_id: room.id },
      });
      if (err) { setError(true); return; }
      if (result?.error) { setError(true); return; }
      setData(result as LeaderboardData);
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    pollRef.current = setInterval(fetchLeaderboard, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [room?.id]);

  // Track score changes for animation
  const pointDeltas: Record<string, number> = {};
  if (data) {
    data.latest_points.forEach(lp => {
      pointDeltas[lp.player_id] = (pointDeltas[lp.player_id] || 0) + lp.delta;
    });
  }

  // Sort: score desc, then earliest join
  const sortedPlayers = data?.players
    ? [...data.players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      })
    : [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 fill-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 fill-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>;
  };

  if (!data && !error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse font-display uppercase tracking-wider text-sm">
          {t('game.loadingLeaderboard', language)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <WifiOff className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground text-sm font-display uppercase tracking-wider">
          {t('game.reconnecting', language)}
        </p>
        <button
          onClick={fetchLeaderboard}
          className="px-6 py-3 spooky-btn text-sm"
        >
          {t('game.retry', language)}
        </button>
      </div>
    );
  }

  if (sortedPlayers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm font-display uppercase tracking-wider animate-pulse">
          {t('game.waitingPlayers', language)}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col gap-3 px-4 pt-2 pb-4"
    >
      {/* Header */}
      <div className="text-center">
        <Trophy className="w-9 h-9 text-accent mx-auto mb-1" />
        <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider text-glow-gold">
          {t('game.leaderboard', language)}
        </h2>
        {data && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('game.round', language)} {data.current_round}
          </p>
        )}
      </div>

      {/* Player list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        <AnimatePresence>
          {sortedPlayers.map((player, i) => {
            const rank = i + 1;
            const isMe = player.session_id === sessionId;
            const delta = pointDeltas[player.session_id];
            const isTop3 = rank <= 3;

            return (
              <motion.div
                key={player.session_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all relative ${
                  isMe
                    ? 'spooky-panel border-accent/50 shadow-[0_0_14px_hsl(var(--accent)/0.2)]'
                    : isTop3
                      ? 'spooky-panel border-primary/30'
                      : 'spooky-inner border-border'
                }`}
              >
                {/* Rank */}
                <div className="flex-shrink-0">{getRankIcon(rank)}</div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium text-sm truncate ${isMe ? 'text-accent font-bold' : 'text-foreground'}`}>
                      {player.nickname}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-accent font-display uppercase tracking-wider">
                        ({t('game.you', language)})
                      </span>
                    )}
                    {player.is_host && (
                      <Star className="w-3.5 h-3.5 text-accent fill-accent flex-shrink-0" />
                    )}
                    {!player.is_online && (
                      <WifiOff className="w-3 h-3 text-destructive flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-1.5">
                  <span className={`font-display font-bold text-lg ${
                    isTop3 ? 'text-accent text-glow-gold' : 'text-foreground'
                  }`}>
                    {player.score}
                  </span>

                  {/* Point delta animation */}
                  {delta && delta > 0 && (
                    <motion.span
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -20 }}
                      transition={{ duration: 2, delay: 0.5 }}
                      className="absolute right-3 -top-1 text-accent font-display font-bold text-sm"
                    >
                      +{delta}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tie rule info */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground/70 font-display uppercase tracking-wider">
          {t('game.tieRule', language)}
        </p>
      </div>
    </motion.div>
  );
}
