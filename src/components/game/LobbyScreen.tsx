import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Copy, Crown, LogOut, Play, User, Wifi, Settings, Minus, Plus, Volume2, VolumeX, Vibrate, UserX, AlertTriangle, RefreshCw, X, Shuffle, Share2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { playClick, isSoundEnabled, setSoundEnabled, isVibrationEnabled, setVibrationEnabled } from '@/lib/sounds';
import { supabase } from '@/integrations/supabase/client';

function SettingControl({ label, value, onChange, min, max, step = 1, suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClick(); onChange(Math.max(min, value - step)); }}
          className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="font-display font-bold text-accent min-w-[48px] text-center">
          {value}{suffix}
        </span>
        <button
          onClick={() => { playClick(); onChange(Math.min(max, value + step)); }}
          className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({ label, icon: Icon, enabled, onToggle }: {
  label: string; icon: React.ComponentType<{ className?: string }>; enabled: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <button
        onClick={() => { playClick(); onToggle(); }}
        className={`w-12 h-7 rounded-full transition-all relative ${
          enabled ? 'bg-accent' : 'bg-muted border border-border'
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-foreground absolute top-1 transition-all ${
          enabled ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

export function LobbyScreen() {
  const { room, players, isHost, language, sessionId, startGame, updateSettings, leaveRoom, kickPlayer, shufflePlayers, loading, error, clearError, retryConnection, recoverStart } = useGame();
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [vibrationOn, setVibrationOn] = useState(isVibrationEnabled());
  const [isStuck, setIsStuck] = useState(false);
  const [startingTimeout, setStartingTimeout] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const startingTimerRef = useRef<NodeJS.Timeout>();

  // ─── Debounced settings: batch changes and send once after 400ms idle ───
  const pendingSettingsRef = useRef<Record<string, unknown>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const flushSettings = useCallback(() => {
    const pending = pendingSettingsRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingSettingsRef.current = {};
    updateSettings(pending);
  }, [updateSettings]);

  const handleSettingChange = useCallback((key: string, value: unknown) => {
    pendingSettingsRef.current = { ...pendingSettingsRef.current, [key]: value };
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushSettings, 400);
  }, [flushSettings]);

  // Stuck detection: mounted >10s with no players
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - mountTimeRef.current;
      setIsStuck(elapsed > 10000 && players.length === 0);
    }, 3000);
    return () => clearInterval(timer);
  }, [players.length]);

  // ── Starting status watchdog: 10s timeout ──
  useEffect(() => {
    if (room?.status === 'starting') {
      setStartingTimeout(false);
      startingTimerRef.current = setTimeout(() => {
        setStartingTimeout(true);
      }, 10000);
    } else {
      setStartingTimeout(false);
      if (startingTimerRef.current) clearTimeout(startingTimerRef.current);
    }
    return () => {
      if (startingTimerRef.current) clearTimeout(startingTimerRef.current);
    };
  }, [room?.status]);


  // Flush pending settings on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      flushSettings();
    };
  }, [flushSettings]);

  if (!room) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const url = `${window.location.origin}/?join=${room.code}`;
    if (navigator.share) {
      navigator.share({ title: 'Join my game!', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    playClick();
  };


  const onlinePlayers = players.filter(p => p.is_online);
  const canStart = isHost && onlinePlayers.length >= room.min_players;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 safe-area-top safe-area-bottom relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-vignette" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { playClick(); leaveRoom(); }} className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple">{t('lobby.title', language)}</h2>
          <button onClick={() => { playClick(); setShowSettings(!showSettings); }} className={`w-10 h-10 rounded-lg spooky-inner border flex items-center justify-center transition-colors ${showSettings ? 'border-accent text-accent' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg border border-destructive/40 bg-destructive/10 flex items-center gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive flex-1">{error}</span>
            <button onClick={() => { playClick(); clearError(); }} className="text-destructive/60 hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Stuck detection */}
        {isStuck && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg border border-accent/40 bg-accent/10 flex items-center gap-3"
          >
            <RefreshCw className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm text-accent flex-1">Connection issue — no players loaded</span>
            <button
              onClick={() => { playClick(); retryConnection(); }}
              className="px-3 py-1 rounded-md text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Starting overlay */}
        {room.status === 'starting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 spooky-panel p-6 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              {!startingTimeout ? (
                <>
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="font-display font-bold text-accent text-sm uppercase tracking-wider">
                    Starting match...
                  </p>
                  <div className="w-full max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 10, ease: 'linear' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <p className="font-display font-bold text-destructive text-sm uppercase tracking-wider">
                    Start failed
                  </p>
                  <button
                    onClick={() => { playClick(); isHost ? startGame() : recoverStart(); }}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                  >
                    {isHost ? 'Retry Start' : 'Reconnect'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Room code panel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="spooky-panel spider-corner p-4 text-center mb-4"
        >
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-widest font-display">{t('lobby.code', language)}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => { playClick(); copyCode(); }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg spooky-inner border border-border hover:border-accent/40 transition-all"
            >
              <span className="font-display text-3xl font-bold text-accent tracking-[0.3em] text-glow-gold">
                {room.code}
              </span>
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={shareLink}
              className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
              title={t('lobby.share', language)}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          {copied && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-accent text-xs mt-1 font-display">
              {t('lobby.copied', language)}
            </motion.p>
          )}
        </motion.div>

        {/* Settings panel */}
        {showSettings && (
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

            {/* Game settings (host only) */}
            {isHost && (
              <>
                <SettingControl
                  label={t('lobby.maxPlayers', language)}
                  value={room.max_players}
                  onChange={(v) => handleSettingChange('max_players', v)}
                  min={3} max={22}
                />
                <SettingControl
                  label={t('lobby.rounds', language)}
                  value={room.total_rounds}
                  onChange={(v) => handleSettingChange('total_rounds', v)}
                  min={1} max={10}
                />
                <SettingControl
                  label={t('lobby.spokeRounds', language)}
                  value={room.spoke_rounds ?? 2}
                  onChange={(v) => handleSettingChange('spoke_rounds', v)}
                  min={1} max={5}
                />
                <SettingControl
                  label={t('lobby.votingTime', language)}
                  value={room.voting_time}
                  onChange={(v) => handleSettingChange('voting_time', v)}
                  min={15} max={120} step={5} suffix="s"
                />
                <SettingControl
                  label={t('lobby.revealTime', language)}
                  value={room.reveal_time}
                  onChange={(v) => handleSettingChange('reveal_time', v)}
                  min={5} max={30} step={5} suffix="s"
                />
                <div className="border-t border-border my-2" />
              </>
            )}

            {/* Personal settings (everyone) */}
            <ToggleSetting
              label={t('settings.sound', language)}
              icon={soundOn ? Volume2 : VolumeX}
              enabled={soundOn}
              onToggle={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
              }}
            />
            <ToggleSetting
              label={t('settings.vibration', language)}
              icon={Vibrate}
              enabled={vibrationOn}
              onToggle={() => {
                const next = !vibrationOn;
                setVibrationOn(next);
                setVibrationEnabled(next);
              }}
            />
          </motion.div>
        )}

        {/* Settings summary */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {[
            { label: t('lobby.maxPlayers', language), value: room.max_players },
            { label: t('lobby.rounds', language), value: room.total_rounds },
            { label: t('lobby.spokeRounds', language), value: room.spoke_rounds ?? 2 },
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-display">
              {t('lobby.players', language)} ({onlinePlayers.length}/{room.max_players})
            </p>
            {isHost && (
              <button
                onClick={() => { playClick(); shufflePlayers(); }}
                disabled={players.length < 2}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg spooky-inner border border-accent/40 text-accent hover:bg-accent/10 transition-all text-xs font-display font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none"
              >
                <Shuffle className="w-3.5 h-3.5" />
                {t('lobby.shuffle', language)}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {players.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
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
                {isHost && !player.is_host && player.session_id !== sessionId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); playClick(); kickPlayer(player.session_id); }}
                    className="w-7 h-7 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                    title={t('lobby.kick', language)}
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
                <Wifi className={`w-3 h-3 ${player.is_online ? 'text-neon-green' : 'text-destructive'}`} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div className="mt-4">
          {isHost ? (
            <button
              onClick={() => { playClick(); startGame(); }}
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
