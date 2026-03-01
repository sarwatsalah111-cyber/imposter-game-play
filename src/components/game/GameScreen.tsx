import { useEffect, useState, useRef, useCallback } from 'react';
import { playVictory, playGameOver, playClick, vibrate } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Eye, EyeOff, MessageCircle, Vote, Trophy, Timer, ArrowRight, Home, CheckCircle, Target, Mic, MicOff, Skull, Star, Loader2, LogOut, Zap, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { LeaderboardScreen } from './LeaderboardScreen';

function CountdownTimer({ seconds, onComplete }: { seconds: number; onComplete?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const completedRef = useRef(false);

  useEffect(() => {
    setTimeLeft(seconds);
    completedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = (timeLeft / seconds) * 100;
  const isLow = timeLeft <= 10;

  return (
    <div className="flex items-center gap-2 spooky-inner border border-border rounded-lg p-2">
      <Timer className={`w-4 h-4 ${isLow ? 'text-destructive animate-pulse' : 'text-accent'}`} />
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-destructive' : 'bg-accent'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className={`font-display text-sm font-bold min-w-[50px] text-right ${isLow ? 'text-destructive' : 'text-accent'}`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function RevealPhase() {
  const { reveal, language, room, isHost, advancePhase } = useGame();
  const isImposter = reveal?.role === 'imposter';
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <motion.div
        key="round-splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col items-center justify-center gap-4 px-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, type: 'spring', stiffness: 250, damping: 18 }}
          className="relative"
        >
          <div className="w-28 h-28 rounded-full border-2 border-primary/40 bg-primary/10 flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, duration: 0.25, type: 'spring', stiffness: 300 }}
              className="font-display text-5xl font-black text-primary text-glow-purple"
            >
              {room?.current_round}
            </motion.span>
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="font-display text-xl font-bold text-foreground uppercase tracking-[0.2em] text-glow-purple"
        >
          {t('game.round', language)} {room?.current_round}
        </motion.p>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '6rem' }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col items-center justify-center gap-6 px-4"
    >
      <div className="text-center">
        <p className="text-muted-foreground text-xs mb-2 uppercase tracking-widest font-display">
          {t('game.round', language)} {room?.current_round}
        </p>
        <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider text-glow-purple">{t('game.reveal', language)}</h2>
      </div>

      <motion.div
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
        className={`w-full max-w-xs p-8 spooky-panel spider-corner text-center ${
          isImposter ? 'glow-red' : 'glow-purple'
        }`}
      >
        {isImposter ? (
          <>
            <Skull className="w-14 h-14 text-destructive mx-auto mb-4" />
            <p className="font-display text-lg font-bold text-destructive uppercase tracking-wider">{t('game.youAreImposter', language)}</p>
          </>
        ) : (
          <>
            <Eye className="w-14 h-14 text-primary mx-auto mb-4" />
            <p className="font-display text-base font-bold text-foreground mb-4 uppercase tracking-wider">{t('game.youAreNormal', language)}</p>
            <div className="spooky-inner border border-border rounded-lg p-4">
              <p className="text-muted-foreground text-xs mb-1 font-display uppercase tracking-widest">{t('game.secretWord', language)}</p>
              <p className="font-display text-2xl font-bold text-accent text-glow-gold">{reveal?.word}</p>
            </div>
          </>
        )}
      </motion.div>

      <p className="text-muted-foreground text-xs animate-pulse italic">{t('game.memorize', language)}</p>

      {isHost && room && (
        <div className="w-full max-w-xs">
          <CountdownTimer
            seconds={room.reveal_time}
            onComplete={() => advancePhase('discussion')}
          />
        </div>
      )}

      {isHost && (
        <button
          onClick={() => advancePhase('discussion')}
          className="px-6 py-3 spooky-btn text-sm glow-purple flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {t('game.speakingQueue', language)}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

function ImposterGuessPanel() {
  const { room, language, sessionId, reveal, imposterGuess } = useGame();
  const [showGuess, setShowGuess] = useState(false);
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guessUsed, setGuessUsed] = useState(false);

  // Only show for imposter
  if (!reveal || reveal.role !== 'imposter' || guessUsed) return null;

  const handleSubmit = async () => {
    if (!guess.trim() || submitting) return;
    setSubmitting(true);
    vibrate(50);
    try {
      const result = await imposterGuess(guess.trim());
      if (result.correct) {
        playVictory();
        vibrate([50, 100, 50, 100, 50]);
        toast({ title: t('game.guessCorrect', language) });
      } else {
        playClick();
        toast({ title: t('game.guessWrong', language), variant: 'destructive' });
        setGuessUsed(true);
      }
    } catch {
      toast({ title: t('error.generic', language), variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setGuess('');
      setShowGuess(false);
    }
  };

  return (
    <div className="w-full">
      {!showGuess ? (
        <button
          onClick={() => { playClick(); setShowGuess(true); }}
          className="w-full py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-display font-bold text-sm uppercase tracking-wider hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {t('game.imposterGuessBtn', language)}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="spooky-panel p-3 space-y-2"
        >
          <p className="text-xs text-muted-foreground text-center">{t('game.imposterGuessHint', language)}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              placeholder={t('game.enterGuess', language)}
              className="flex-1 px-3 py-2 rounded-lg spooky-inner border border-border text-foreground text-sm bg-transparent font-display"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !guess.trim()}
              className="px-4 py-2 spooky-btn text-sm glow-red flex items-center gap-1 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setShowGuess(false)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </div>
  );
}

function SpeakingQueuePhase() {
  const { room, players, language, sessionId, isHost, advancePhase, markSpoke, spokeStatus } = useGame();
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
    // Anti-spam: debounce 2s
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
            <motion.div
              key={sid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02, duration: 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
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
              {/* Spoke status badge */}
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
            </motion.div>
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
            return (
              <div className="w-full py-3 rounded-xl spooky-inner border border-border text-muted-foreground font-display font-medium text-center text-sm uppercase tracking-wider">
                {cp ? `${cp.nickname} ${t('game.isSpeaking', language)}...` : t('game.waitingTurn', language)}
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

function VotingPhase() {
  const { room, players, language, sessionId, vote, hasVoted, isHost, advancePhase } = useGame();
  const activePlayers = players.filter(p => p.session_id !== sessionId && p.is_online && !p.is_eliminated);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="flex-1 flex flex-col gap-4 px-4 will-change-[opacity]"
    >
      <div className="text-center pt-4">
        <Vote className="w-10 h-10 text-accent mx-auto mb-2" />
        <h2 className="font-display text-xl font-bold text-foreground uppercase tracking-wider text-glow-gold">{t('game.voting', language)}</h2>
        <p className="text-muted-foreground text-xs mt-1 italic">{t('game.voteHint', language)}</p>
      </div>

      {room && (
        <div className="max-w-xs mx-auto w-full">
          <CountdownTimer
            seconds={room.voting_time}
            onComplete={isHost ? () => advancePhase('results') : undefined}
          />
        </div>
      )}

      {hasVoted ? (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex-1 flex items-center justify-center"
        >
          <div className="text-center spooky-panel p-8">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-3" />
            <p className="font-display text-lg font-bold text-accent uppercase tracking-wider">{t('game.voted', language)}</p>
            <p className="text-muted-foreground text-sm mt-1 italic">{t('game.waitingVotes', language)}</p>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {activePlayers.map((player, i) => (
            <motion.button
              key={player.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02, duration: 0.1 }}
              onClick={() => vote(player.session_id)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg spooky-inner border border-border hover:border-destructive/50 hover:shadow-[0_0_12px_hsl(0_85%_55%/0.15)] transition-all active:scale-[0.98]"
            >
              <Target className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 font-medium text-foreground text-left">{player.nickname}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      )}

      {isHost && (
        <button
          onClick={() => advancePhase('results')}
          className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2"
        >
          {t('game.results', language)}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

function ResultsPhase() {
  const { results, players, room, language, isHost, sessionId, startGame, goHome, finishGame, resetScores } = useGame();
  const soundPlayedRef = useRef(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const onlinePlayersCount = players.filter(p => p.is_online).length;
  const canStartNextRound = !!room && onlinePlayersCount >= room.min_players;

  useEffect(() => {
    if (results && !soundPlayedRef.current) {
      soundPlayedRef.current = true;
      if (results.caught) {
        playVictory();
      } else {
        playGameOver();
      }
    }
  }, [results]);

  if (!results) return <div className="flex-1 flex items-center justify-center"><div className="text-muted-foreground animate-pulse font-display uppercase tracking-wider">Loading...</div></div>;

  if (showLeaderboard) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col"
      >
        <LeaderboardScreen />
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={() => setShowLeaderboard(false)}
            className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            {t('game.results', language)}
          </button>
          {isHost && (
            <>
              <button
                onClick={() => { if (canStartNextRound) startGame(); }}
                disabled={!canStartNextRound}
                className="w-full py-3 spooky-btn-gold spooky-btn text-sm glow-gold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {canStartNextRound ? t('game.nextRound', language) : t('lobby.minPlayers', language, { min: room?.min_players ?? 3 })} <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={finishGame}
                className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> {t('game.finish', language)}
              </button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  const imposter = players.find(p => p.session_id === results.imposter_session_id);
  const outcomeLabel = results.outcome === 'IMPOSTER_GUESS_WIN'
    ? t('game.imposterGuessedWord', language)
    : results.caught
      ? t('game.imposterCaught', language)
      : results.isTie
        ? t('game.tie', language)
        : t('game.imposterWins', language);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="flex-1 flex flex-col items-center gap-4 px-4 pt-2 overflow-y-auto pb-4 will-change-[opacity]"
    >
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <Star key={i} className={`w-7 h-7 ${results.caught && i <= 2 ? 'text-accent fill-accent' : !results.caught && i === 2 ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
        ))}
      </div>

      <h2 className="font-display text-lg font-bold text-foreground text-center uppercase tracking-wider text-glow-purple">
        {outcomeLabel}
      </h2>

      <div className="spooky-panel spider-corner p-5 text-center w-full max-w-xs scratched-texture">
        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2 font-display">{t('game.imposterWas', language)}</p>
        <p className="font-display text-xl font-bold text-destructive uppercase">{imposter?.nickname || '???'}</p>
        <div className="mt-3 spooky-inner border border-border rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-display uppercase tracking-widest">{t('game.secretWord', language)}</p>
          <p className="font-display text-lg font-bold text-accent text-glow-gold mt-1">{results.secret_word}</p>
        </div>
      </div>

      {/* Points awarded this round */}
      {results?.points_awarded && Object.keys(results.points_awarded).length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest text-center mb-2">{t('game.pointsAwarded', language)}</p>
          <div className="space-y-1.5">
            {Object.entries(results.points_awarded).map(([sid, pts]) => {
              const player = players.find(p => p.session_id === sid);
              return (
                <motion.div
                  key={sid}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm spooky-inner border border-accent/30 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 text-foreground font-medium">{player?.nickname || sid.slice(0, 8)}</span>
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-accent font-display font-bold text-base"
                  >
                    +{pts}
                  </motion.span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vote tally */}
      {Object.keys(results.votes).length > 0 && (
        <div className="w-full max-w-xs space-y-1.5">
          {Object.entries(results.votes).map(([sid, count]) => {
            const player = players.find(p => p.session_id === sid);
            return (
              <div key={sid} className="flex items-center gap-2 text-sm spooky-inner border border-border rounded-lg px-3 py-2">
                <span className="flex-1 text-foreground font-medium">{player?.nickname || sid.slice(0, 8)}</span>
                <div className="flex gap-1">
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-accent" />
                  ))}
                </div>
                <span className="text-accent text-xs w-6 text-right font-display font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard button */}
      <button
        onClick={() => { playClick(); setShowLeaderboard(true); }}
        className="w-full max-w-xs py-3 spooky-btn text-sm flex items-center justify-center gap-2"
      >
        <Trophy className="w-4 h-4" />
        {t('game.leaderboard', language)}
      </button>

      {isHost && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <button
            onClick={() => { if (canStartNextRound) startGame(); }}
            disabled={!canStartNextRound}
            className="w-full py-3 spooky-btn-gold spooky-btn text-sm glow-gold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {canStartNextRound ? t('game.nextRound', language) : t('lobby.minPlayers', language, { min: room?.min_players ?? 3 })} <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={finishGame}
            className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            {t('game.finish', language)}
          </button>
        </div>
      )}

      {!isHost && (
        <p className="text-muted-foreground text-sm animate-pulse font-display uppercase tracking-wider">{t('lobby.waiting', language)}</p>
      )}
    </motion.div>
  );
}

export function GameScreen() {
  const { phase, room, language, leaveRoom } = useGame();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-vignette" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {room && (
          <div className="flex items-center justify-between gap-2 pt-4 pb-2 px-4">
            <button
              onClick={() => { playClick(); setShowLeaveConfirm(true); }}
              className="w-9 h-9 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-accent uppercase tracking-widest font-display font-bold">
              {t('game.round', language)} {room.current_round}
            </span>
            <div className="w-9" />
          </div>
        )}

        {/* Leave confirmation modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="spooky-panel p-6 max-w-xs w-full text-center space-y-4"
            >
              <p className="font-display font-bold text-foreground uppercase tracking-wider">Leave Game?</p>
              <p className="text-muted-foreground text-sm">You'll lose your progress in this round.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { playClick(); setShowLeaveConfirm(false); }}
                  className="flex-1 py-3 spooky-btn text-sm"
                >
                  Stay
                </button>
                <button
                  onClick={() => { playClick(); leaveRoom(); }}
                  className="flex-1 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-display font-bold text-sm uppercase tracking-wider hover:bg-destructive/20 transition-colors"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {phase === 'reveal' && <RevealPhase key="reveal" />}
          {phase === 'discussion' && <SpeakingQueuePhase key="discussion" />}
          {phase === 'voting' && <VotingPhase key="voting" />}
          {phase === 'results' && <ResultsPhase key="results" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
