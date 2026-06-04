import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Trophy, ArrowRight, Home, Star, RotateCcw } from 'lucide-react';
import { playVictory, playGameOver, playClick } from '@/lib/sounds';
import { LeaderboardScreen } from './LeaderboardScreen';
import sadImposter from '@/assets/sad-imposter.mp4.asset.json';

function SuspenseCountdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-8xl font-black text-primary text-glow-purple"
        >
          {count > 0 ? count : '?'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ResultsPhase() {
  const { results, players, room, language, isHost, sessionId, goHome, startGame, playAgain } = useGame();
  const soundPlayedRef = useRef(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSuspense, setShowSuspense] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (results && !soundPlayedRef.current && revealed) {
      soundPlayedRef.current = true;
      if (results.caught) {
        playVictory();
      } else {
        playGameOver();
      }
    }
  }, [results, revealed]);

  if (!results) return <div className="flex-1 flex items-center justify-center"><div className="text-muted-foreground animate-pulse font-display uppercase tracking-wider">{t('game.loadingLeaderboard', language)}</div></div>;

  if (showSuspense && !revealed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center"
      >
        <p className="text-muted-foreground font-display text-lg uppercase tracking-widest mb-8 animate-pulse">
          {t('game.revealing', language)}
        </p>
        <SuspenseCountdown onComplete={() => { setShowSuspense(false); setRevealed(true); }} />
      </motion.div>
    );
  }

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
          <button
            onClick={() => { playClick(); goHome(); }}
            className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> {t('game.finish', language)}
          </button>
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

      {results.caught && (
        <div className="flex flex-col items-center gap-2">
          <video
            src={sadImposter.url}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className="w-40 h-40 object-cover rounded-full"
            style={{
              WebkitMaskImage: 'radial-gradient(circle at center, black 32%, rgba(0,0,0,0.7) 55%, transparent 82%)',
              maskImage: 'radial-gradient(circle at center, black 32%, rgba(0,0,0,0.7) 55%, transparent 82%)',
              filter: 'drop-shadow(0 0 22px hsl(var(--destructive) / 0.55))',
            }}
          />
          <p className="font-display text-sm font-bold text-destructive uppercase tracking-widest text-center">
            {t('game.imposterCaught', language)}
          </p>
        </div>
      )}

      <motion.div
        initial={{ rotateY: 90 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="spooky-panel spider-corner p-5 text-center w-full max-w-xs scratched-texture"
      >
        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2 font-display">{t('game.imposterWas', language)}</p>
        <p className="font-display text-xl font-bold text-destructive uppercase">{imposter?.nickname || '???'}</p>
        <div className="mt-3 spooky-inner border border-border rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-display uppercase tracking-widest">{t('game.secretWord', language)}</p>
          <p className="font-display text-lg font-bold text-accent text-glow-gold mt-1">{results.secret_word}</p>
        </div>
      </motion.div>

      {/* Vote attribution — who voted for whom */}
      {results?.vote_details && results.vote_details.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest text-center mb-2">
            {t('game.voting', language)}
          </p>
          <div className="space-y-1.5">
            {results.vote_details.map((vd, idx) => {
              const voter = players.find(p => p.session_id === vd.voter);
              const target = players.find(p => p.session_id === vd.target);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm spooky-inner border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-foreground font-medium">{voter?.nickname || '?'}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className={`font-medium ${vd.target === results.imposter_session_id ? 'text-destructive' : 'text-foreground'}`}>
                    {target?.nickname || '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Points awarded this round */}
      {results?.points_awarded && Object.keys(results.points_awarded).length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest text-center mb-2">{t('game.pointsAwarded', language)}</p>
          <div className="space-y-1.5">
            {Object.entries(results.points_awarded).map(([sid, pts]) => {
              const player = players.find(p => p.session_id === sid);
              return (
                <div
                  key={sid}
                  className="flex items-center gap-2 text-sm spooky-inner border border-accent/30 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 text-foreground font-medium">{player?.nickname || sid.slice(0, 8)}</span>
                  <span className="text-accent font-display font-bold text-base">
                    +{pts}
                  </span>
                </div>
              );
            })}
          </div>
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

      {/* Next Round button */}
      {isHost && room && room.current_round < room.total_rounds && (
        <button
          onClick={() => { playClick(); startGame(); }}
          className="w-full max-w-xs py-3 spooky-btn text-sm glow-purple flex items-center justify-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          {t('game.round', language)} {room.current_round + 1}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Play Again — only on final round */}
      {isHost && room && room.current_round >= room.total_rounds && (
        <button
          onClick={() => { playClick(); playAgain(); }}
          className="w-full max-w-xs py-3 spooky-btn text-sm glow-purple flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {t('game.playAgain', language)}
        </button>
      )}

      <button
        onClick={() => { playClick(); goHome(); }}
        className="w-full max-w-xs py-3 spooky-btn text-sm flex items-center justify-center gap-2"
      >
        <Home className="w-4 h-4" /> {t('game.finish', language)}
      </button>
    </motion.div>
  );
}
