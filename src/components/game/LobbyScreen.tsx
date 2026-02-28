import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Copy, Crown, LogOut, Play, User, Wifi, Settings, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

function SettingControl({ label, value, onChange, min, max, step = 1, suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="font-display font-bold text-accent min-w-[48px] text-center">
          {value}{suffix}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function LobbyScreen() {
  const { room, players, isHost, language, sessionId, startGame, updateSettings, leaveRoom, loading } = useGame();
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!room) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = isHost && players.filter(p => p.is_online).length >= room.min_players;

  const handleSettingChange = (key: string, value: number) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 safe-area-top safe-area-bottom relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-vignette" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={leaveRoom} className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple">{t('lobby.title', language)}</h2>
          {isHost ? (
            <button onClick={() => setShowSettings(!showSettings)} className={`w-10 h-10 rounded-lg spooky-inner border flex items-center justify-center transition-colors ${showSettings ? 'border-accent text-accent' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
              <Settings className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Room code panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="spooky-panel spider-corner p-4 text-center mb-4"
        >
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-widest font-display">{t('lobby.code', language)}</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg spooky-inner border border-border hover:border-accent/40 transition-all"
          >
            <span className="font-display text-3xl font-bold text-accent tracking-[0.3em] text-glow-gold">
              {room.code}
            </span>
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
          {copied && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-accent text-xs mt-1 font-display">
              Copied!
            </motion.p>
          )}
        </motion.div>

        {/* Settings panel (host only) */}
        {isHost && showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 spooky-panel p-4"
          >
            <h3 className="font-display font-bold text-accent text-sm mb-2 flex items-center gap-2 uppercase tracking-wider">
              <Settings className="w-4 h-4" />
              {t('lobby.settings', language)}
            </h3>
            <SettingControl
              label={t('lobby.rounds', language)}
              value={room.total_rounds}
              onChange={(v) => handleSettingChange('total_rounds', v)}
              min={1} max={10}
            />
            <SettingControl
              label={t('lobby.votingTime', language)}
              value={room.voting_time}
              onChange={(v) => handleSettingChange('voting_time', v)}
              min={15} max={120} step={5} suffix="s"
            />
          </motion.div>
        )}

        {/* Settings summary */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {[
            { label: t('lobby.rounds', language), value: room.total_rounds },
            { label: t('lobby.votingTime', language), value: `${room.voting_time}s` },
          ].map((s, i) => (
            <div key={i} className="px-3 py-1.5 rounded-lg spooky-inner border border-border text-xs">
              <span className="text-muted-foreground">{s.label}: </span>
              <span className="text-accent font-bold">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Players */}
        <div className="flex-1 spooky-panel p-4 scratched-texture">
          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-3 font-display">
            {t('lobby.players', language)} ({players.length}/{room.max_players})
          </p>
          <div className="space-y-2">
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  player.session_id === sessionId
                    ? 'spooky-inner border-primary/40 shadow-[0_0_12px_hsl(280_75%_55%/0.15)]'
                    : 'spooky-inner border-border'
                }`}
              >
                <div className="w-8 h-8 rounded-full spooky-inner border border-border flex items-center justify-center">
                  {player.is_host ? (
                    <Crown className="w-4 h-4 text-accent" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 font-medium text-foreground text-sm">
                  {player.nickname}
                  {player.session_id === sessionId && (
                    <span className="text-primary text-xs ml-1">({t('game.you', language)})</span>
                  )}
                </span>
                <Wifi className={`w-3 h-3 ${player.is_online ? 'text-neon-green' : 'text-destructive'}`} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div className="mt-4">
          {isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart || loading}
              className="w-full py-4 spooky-btn-gold spooky-btn text-base glow-gold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {canStart ? t('lobby.start', language) : t('lobby.minPlayers', language, { min: room.min_players })}
            </button>
          ) : (
            <div className="w-full py-4 rounded-xl spooky-inner border border-border text-muted-foreground font-display font-medium text-center text-sm uppercase tracking-wider animate-pulse">
              {t('lobby.waiting', language)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
