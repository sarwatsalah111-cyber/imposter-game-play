import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Copy, Crown, LogOut, Play, User, Wifi } from 'lucide-react';
import { useState } from 'react';

export function LobbyScreen() {
  const { room, players, isHost, language, sessionId, startGame, leaveRoom, loading, error } = useGame();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = isHost && players.filter(p => p.is_online).length >= room.min_players;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={leaveRoom} className="text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
        <h2 className="font-display font-bold text-foreground text-lg">{t('lobby.title', language)}</h2>
        <div className="w-5" />
      </div>

      {/* Room code */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">{t('lobby.code', language)}</p>
        <button
          onClick={copyCode}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
        >
          <span className="font-display text-3xl font-bold text-primary tracking-[0.3em] text-glow-green">
            {room.code}
          </span>
          <Copy className="w-4 h-4 text-muted-foreground" />
        </button>
        {copied && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary text-xs mt-1">
            Copied!
          </motion.p>
        )}
      </motion.div>

      {/* Settings summary */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {[
          { label: t('lobby.rounds', language), value: room.total_rounds },
          { label: t('lobby.discussionTime', language), value: `${room.discussion_time}s` },
          { label: t('lobby.votingTime', language), value: `${room.voting_time}s` },
        ].map((s, i) => (
          <div key={i} className="px-3 py-1.5 rounded-lg bg-secondary text-xs">
            <span className="text-muted-foreground">{s.label}: </span>
            <span className="text-foreground font-medium">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Players */}
      <div className="flex-1">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">
          {t('lobby.players', language)} ({players.length}/{room.max_players})
        </p>
        <div className="space-y-2">
          {players.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                player.session_id === sessionId
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                {player.is_host ? (
                  <Crown className="w-4 h-4 text-neon-orange" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="flex-1 font-medium text-foreground text-sm">
                {player.nickname}
                {player.session_id === sessionId && (
                  <span className="text-primary text-xs ml-1">(you)</span>
                )}
              </span>
              <Wifi className={`w-3 h-3 ${player.is_online ? 'text-primary' : 'text-destructive'}`} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <div className="mt-6">
        {isHost ? (
          <button
            onClick={startGame}
            disabled={!canStart || loading}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg glow-green hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {canStart ? t('lobby.start', language) : t('lobby.minPlayers', language, { min: room.min_players })}
          </button>
        ) : (
          <div className="w-full py-4 rounded-xl bg-secondary text-muted-foreground font-display font-medium text-center animate-pulse-glow">
            {t('lobby.waiting', language)}
          </div>
        )}
      </div>
    </div>
  );
}
