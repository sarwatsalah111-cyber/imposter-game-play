import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { MessageCircle, Vote, ArrowRight, CheckCircle, Mic, MicOff, Loader2, SkipForward } from 'lucide-react';
import { playClick, vibrate } from '@/lib/sounds';
import { toast } from '@/hooks/use-toast';
import { ImposterGuessPanel } from './ImposterGuessPanel';

export function SpeakingQueuePhase() {
  const { room, players, language, sessionId, isHost, advancePhase, markSpoke, spokeStatus, skipTurn } = useGame();
  const activePlayers = players.filter(p => p.is_online && !p.is_eliminated);
  const [speaking, setSpeaking] = useState(false);
  const [justSpoke, setJustSpoke] = useState(false);
  const lastSpokeRef = useRef(0);

  const playerOrder = spokeStatus?.player_order || activePlayers.map(p => p.session_id);
  const currentTurnIndex = spokeStatus?.current_turn_index ?? 0;
  const totalTurns = spokeStatus?.total_turns ?? (playerOrder.length * (room?.total_rounds || 1));
  const currentTurnPlayer = spokeStatus?.current_turn_player || null;
  const spokeCounts = spokeStatus?.spoke_counts || {};
  const totalRounds = spokeStatus?.total_rounds || room?.total_rounds || 1;
  const allDone = currentTurnIndex >= totalTurns;

  const currentSpeakingRound = Math.floor(currentTurnIndex / playerOrder.length) + 1;
  const isMyTurn = currentTurnPlayer === sessionId;

  const handleSpoke = useCallback(async () => {
    const now = Date.now();
    if (now - lastSpokeRef.current < 2000) return;
    if (speaking) return;

    lastSpokeRef.current = now;
    setSpeaking(true);
    vibrate(50);
    playClick();

    try {
      await markSpoke();
      setJustSpoke(true);
      vibrate([30, 50, 30]);
      setTimeout(() => setJustSpoke(false), 1200);
    } catch (e: unknown) {
      const msg = (e as Error).message || '';
      toast({
        title: msg.includes('Not your turn')
          ? t('game.notYourTurn', language)
          : msg.includes('all your speaking')
            ? t('game.youSpoke', language)
            : t('error.generic', language),
        description: msg.includes('Not your turn') || msg.includes('all your speaking')
          ? undefined
          : t('game.retrying', language),
        variant: 'destructive',
      });
    } finally {
      setSpeaking(false);
    }
  }, [markSpoke, speaking, language]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="flex-1 flex flex-col gap-4 px-4 will-change-[opacity]"
    >
      <div className="text-center pt-4">
        <MessageCircle className="w-10 h-10 text-primary mx-auto mb-2" />
        <h2 className="font-display text-xl font-bold text-foreground uppercase tracking-wider text-glow-purple">{t('game.speakingQueue', language)}</h2>
        <p className="text-muted-foreground text-xs mt-1 italic">{t('game.speakingHint', language)}</p>
      </div>

      {/* Turn status chip */}
      {!allDone && (
        <motion.div
          key={currentTurnPlayer}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mx-auto px-4 py-2 rounded-full border font-display font-bold text-sm uppercase tracking-wider text-center ${
            isMyTurn
              ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)] animate-pulse'
              : 'border-border bg-muted/50 text-muted-foreground'
          }`}
        >
          {isMyTurn ? (
            <span className="flex items-center gap-2 justify-center">
              <Mic className="w-4 h-4" />
              {t('game.yourTurn', language)}
            </span>
          ) : (() => {
            const cp = activePlayers.find(p => p.session_id === currentTurnPlayer);
            return cp ? `⏳ ${t('game.waitingFor', language)} ${cp.nickname}` : t('game.waitingTurn', language);
          })()}
        </motion.div>
      )}

      <div className="spooky-panel p-3 flex flex-col items-center gap-2">
        <span className="text-sm font-display font-bold text-accent uppercase tracking-wider">
          {t('game.speakingRound', language)} {Math.min(currentSpeakingRound, totalRounds)}/{totalRounds}
        </span>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${(currentTurnIndex / totalTurns) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {currentTurnIndex}/{totalTurns} {t('game.turnsComplete', language)}
        </span>
      </div>

      {/* Player queue list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {playerOrder.map((sid, i) => {
          const player = activePlayers.find(p => p.session_id === sid);
          if (!player) return null;
          const count = spokeCounts[sid] || 0;
          const isDone = count >= totalRounds;
          const isCurrent = sid === currentTurnPlayer;
          const isMe = sid === sessionId;

          return (
            <div
              key={sid}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                isCurrent
                  ? 'spooky-panel border-primary/60 shadow-[0_0_16px_hsl(280_75%_55%/0.25)]'
                  : isDone
                    ? 'spooky-inner border-border opacity-50'
                    : 'spooky-inner border-border'
              }`}
            >
              {isCurrent ? (
                <Mic className="w-5 h-5 text-primary animate-pulse" />
              ) : isDone ? (
                <CheckCircle className="w-5 h-5 text-accent" />
              ) : (
                <Mic className="w-5 h-5 text-muted-foreground" />
              )}
              <span className={`flex-1 font-medium text-sm ${
                isCurrent ? 'text-primary font-bold' : isDone ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {player.nickname}
                {isMe && <span className="text-accent text-xs ml-1">({t('game.you', language)})</span>}
              </span>
              {isDone ? (
                <span className="text-xs text-accent font-display uppercase tracking-wider">✅</span>
              ) : (
                <div className="flex gap-1">
                  {Array.from({ length: totalRounds }).map((_, j) => (
                    <div
                      key={j}
                      className={`w-2.5 h-2.5 rounded-full border ${
                        j < count ? 'bg-accent border-accent' : 'bg-muted border-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action area */}
      {!allDone ? (
        <div className="space-y-2">
          <motion.button
            key="speak-btn"
            initial={{ scale: 0.95 }}
            animate={isMyTurn && justSpoke
              ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0px hsl(var(--primary) / 0)', '0 0 30px hsl(var(--primary) / 0.6)', '0 0 0px hsl(var(--primary) / 0)'] }
              : isMyTurn
                ? { scale: [1, 1.03, 1] }
                : { scale: 1 }
            }
            transition={isMyTurn
              ? (justSpoke ? { duration: 0.6 } : { repeat: Infinity, duration: 1.5 })
              : { duration: 0.2 }
            }
            onClick={handleSpoke}
            disabled={!isMyTurn || speaking}
            className="w-full py-4 spooky-btn text-base glow-purple flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {speaking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isMyTurn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
            {isMyTurn
              ? (speaking ? '...' : t('game.iSpoke', language))
              : t('game.waitingTurn', language)}
          </motion.button>

          {!isMyTurn && currentTurnPlayer && (() => {
            const cp = activePlayers.find(p => p.session_id === currentTurnPlayer);
            const isOffline = cp ? !players.find(p => p.session_id === currentTurnPlayer)?.is_online : false;
            return (
              <div className="space-y-2">
                <div className="w-full py-3 rounded-xl spooky-inner border border-border text-muted-foreground font-display font-medium text-center text-sm uppercase tracking-wider">
                  {cp ? `${cp.nickname} ${t('game.isSpeaking', language)}...` : t('game.waitingTurn', language)}
                </div>
                {isHost && isOffline && (
                  <button
                    onClick={() => { playClick(); skipTurn(currentTurnPlayer); }}
                    className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2 border-destructive/50"
                  >
                    <SkipForward className="w-4 h-4" />
                    {t('game.skipTurn', language)} ({cp?.nickname})
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="w-full py-4 spooky-panel text-accent font-display font-medium text-center text-sm uppercase tracking-wider animate-pulse">
          {t('game.allSpoken', language)}
        </div>
      )}

      {/* Imposter guess panel */}
      <ImposterGuessPanel />

      {/* Host override */}
      {isHost && !allDone && (
        <button
          onClick={() => advancePhase('voting')}
          className="w-full py-3 spooky-btn-gold spooky-btn text-sm flex items-center justify-center gap-2"
        >
          <Vote className="w-4 h-4" />
          {t('game.skipToVoting', language)}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
