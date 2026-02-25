import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Eye, EyeOff, MessageCircle, Vote, Trophy, Timer, ArrowRight, Home, Crown, CheckCircle, Target, Mic, MicOff } from 'lucide-react';

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
    <div className="flex items-center gap-2">
      <Timer className={`w-4 h-4 ${isLow ? 'text-destructive animate-pulse' : 'text-primary'}`} />
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-destructive' : 'bg-primary'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className={`font-display text-sm font-bold min-w-[50px] text-right ${isLow ? 'text-destructive' : 'text-foreground'}`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function RevealPhase() {
  const { reveal, language, room, isHost, advancePhase } = useGame();
  const isImposter = reveal?.role === 'imposter';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center justify-center gap-6 px-4"
    >
      <div className="text-center">
        <p className="text-muted-foreground text-sm mb-2 uppercase tracking-wider">
          {t('game.round', language)} {room?.current_round}/{room?.total_rounds}
        </p>
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">{t('game.reveal', language)}</h2>
      </div>

      <motion.div
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className={`w-full max-w-xs p-8 rounded-2xl border-2 text-center ${
          isImposter
            ? 'bg-destructive/10 border-destructive/40 glow-red'
            : 'bg-primary/10 border-primary/40 glow-green'
        }`}
      >
        {isImposter ? (
          <>
            <EyeOff className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="font-display text-xl font-bold text-destructive">{t('game.youAreImposter', language)}</p>
          </>
        ) : (
          <>
            <Eye className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="font-display text-lg font-bold text-foreground mb-3">{t('game.youAreNormal', language)}</p>
            <p className="text-muted-foreground text-xs mb-1">{t('game.secretWord', language)}</p>
            <p className="font-display text-3xl font-bold text-primary text-glow-green">{reveal?.word}</p>
          </>
        )}
      </motion.div>

      <p className="text-muted-foreground text-xs animate-pulse">{t('game.memorize', language)}</p>

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
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold glow-green hover:opacity-90 transition-all flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {t('game.speakingQueue', language)}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

function SpeakingQueuePhase() {
  const { room, players, language, sessionId, isHost, advancePhase, markSpoke, spokenPlayers } = useGame();
  const activePlayers = players.filter(p => p.is_online && !p.is_eliminated);
  const allSpoken = activePlayers.length > 0 && activePlayers.every(p => spokenPlayers.includes(p.session_id));
  const hasMeSpoken = spokenPlayers.includes(sessionId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col gap-4 px-4"
    >
      <div className="text-center pt-4">
        <MessageCircle className="w-10 h-10 text-accent mx-auto mb-2" />
        <h2 className="font-display text-xl font-bold text-foreground">{t('game.speakingQueue', language)}</h2>
        <p className="text-muted-foreground text-xs mt-1">{t('game.speakingHint', language)}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-1 py-2">
        <span className="text-sm text-muted-foreground">
          {spokenPlayers.length}/{activePlayers.length} {t('game.spoke', language)}
        </span>
      </div>

      {/* Player list with spoke status */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {activePlayers.map((player, i) => {
          const hasSpoken = spokenPlayers.includes(player.session_id);
          const isMe = player.session_id === sessionId;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                hasSpoken
                  ? 'bg-muted/50 border-border opacity-60'
                  : isMe
                    ? 'bg-accent/10 border-accent/30'
                    : 'bg-card border-border'
              }`}
            >
              {hasSpoken ? (
                <MicOff className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-accent" />
              )}
              <span className={`flex-1 font-medium text-sm ${hasSpoken ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {player.nickname}
                {isMe && <span className="text-primary text-xs ml-1">(you)</span>}
              </span>
              {hasSpoken && (
                <CheckCircle className="w-4 h-4 text-primary" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* My "I spoke" button */}
      {!hasMeSpoken ? (
        <motion.button
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          onClick={markSpoke}
          className="w-full py-4 rounded-xl bg-accent text-accent-foreground font-display font-bold text-lg glow-purple hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Mic className="w-5 h-5" />
          {t('game.iSpoke', language)}
        </motion.button>
      ) : (
        <div className="w-full py-4 rounded-xl bg-muted text-muted-foreground font-display font-medium text-center">
          <MicOff className="w-5 h-5 inline mr-2" />
          {t('game.youSpoke', language)}
        </div>
      )}

      {/* Host advance button - show when all spoken or as override */}
      {isHost && (
        <button
          onClick={() => advancePhase('voting')}
          className={`w-full py-3 rounded-xl font-display font-bold transition-all flex items-center justify-center gap-2 ${
            allSpoken
              ? 'bg-primary text-primary-foreground glow-green'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm'
          }`}
        >
          <Vote className="w-4 h-4" />
          {t('game.voting', language)}
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
      className="flex-1 flex flex-col gap-4 px-4"
    >
      <div className="text-center pt-4">
        <Vote className="w-10 h-10 text-neon-orange mx-auto mb-2" />
        <h2 className="font-display text-xl font-bold text-foreground">{t('game.voting', language)}</h2>
        <p className="text-muted-foreground text-xs mt-1">{t('game.voteHint', language)}</p>
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
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-3" />
            <p className="font-display text-lg font-bold text-primary">{t('game.voted', language)}</p>
            <p className="text-muted-foreground text-sm mt-1">{t('game.waitingVotes', language)}</p>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {activePlayers.map((player, i) => (
            <motion.button
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => vote(player.session_id)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-card border border-border hover:border-destructive/50 hover:bg-destructive/5 transition-all active:scale-[0.98]"
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
          className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-display font-medium hover:bg-secondary/80 transition-all text-sm"
        >
          {t('game.results', language)} →
        </button>
      )}
    </motion.div>
  );
}

function ResultsPhase() {
  const { results, players, room, language, isHost, startGame, goHome, finishGame } = useGame();
  if (!results) return <div className="flex-1 flex items-center justify-center"><div className="text-muted-foreground animate-pulse">Loading...</div></div>;

  const imposter = players.find(p => p.session_id === results.imposter_session_id);
  const isLastRound = room && room.current_round >= room.total_rounds;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center gap-6 px-4"
    >
      <Trophy className={`w-14 h-14 ${results.caught ? 'text-primary' : 'text-destructive'}`} />

      <h2 className="font-display text-2xl font-bold text-foreground text-center">
        {results.caught ? t('game.imposterCaught', language) : results.isTie ? t('game.tie', language) : t('game.imposterWins', language)}
      </h2>

      <div className="p-6 rounded-2xl bg-card border border-border text-center w-full max-w-xs">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">{t('game.imposterWas', language)}</p>
        <p className="font-display text-xl font-bold text-destructive">{imposter?.nickname || '???'}</p>
        <p className="text-muted-foreground text-xs mt-3">{t('game.secretWord', language)}</p>
        <p className="font-display text-lg font-bold text-primary">{results.secret_word}</p>
      </div>

      <div className="w-full max-w-xs space-y-1">
        {Object.entries(results.votes).map(([sid, count]) => {
          const player = players.find(p => p.session_id === sid);
          return (
            <div key={sid} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-foreground">{player?.nickname || sid.slice(0, 8)}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-neon-orange" />
                ))}
              </div>
              <span className="text-muted-foreground text-xs w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {isHost && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          {!isLastRound && (
            <button
              onClick={startGame}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold glow-green hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {t('game.nextRound', language)} <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={isLastRound ? finishGame : goHome}
            className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-display font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            {isLastRound ? t('game.finish', language) : t('game.backHome', language)}
          </button>
        </div>
      )}

      {!isHost && (
        <p className="text-muted-foreground text-sm animate-pulse-glow">{t('lobby.waiting', language)}</p>
      )}
    </motion.div>
  );
}

export function GameScreen() {
  const { phase, room, language } = useGame();

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
      {room && (
        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {t('game.round', language)} {room.current_round}/{room.total_rounds}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'reveal' && <RevealPhase key="reveal" />}
        {phase === 'discussion' && <SpeakingQueuePhase key="discussion" />}
        {phase === 'voting' && <VotingPhase key="voting" />}
        {phase === 'results' && <ResultsPhase key="results" />}
      </AnimatePresence>
    </div>
  );
}
