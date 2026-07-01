import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Vote, ArrowRight, CheckCircle, Target, X } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { playClick } from '@/lib/sounds';

export function VotingPhase() {
  const { room, players, language, sessionId, vote, hasVoted, isHost, advancePhase } = useGame();
  const activePlayers = players.filter(p => p.session_id !== sessionId && p.is_online && !p.is_eliminated);
  const [pending, setPending] = useState<{ sessionId: string; nickname: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirmVote = async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    playClick();
    try {
      await vote(pending.sessionId);
    } finally {
      setPending(null);
      // hasVoted flips through state; keep submitting true briefly to block double-taps
      setTimeout(() => setSubmitting(false), 800);
    }
  };

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
              onClick={() => { playClick(); setPending({ sessionId: player.session_id, nickname: player.nickname }); }}
              disabled={submitting}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg spooky-inner border border-border hover:border-destructive/50 hover:shadow-[0_0_12px_hsl(0_85%_55%/0.15)] transition-all active:scale-[0.98] disabled:opacity-40"
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

      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => !submitting && setPending(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs spooky-panel p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-foreground uppercase tracking-wider text-glow-purple">
                  {t('vote.confirmTitle', language)}
                </h3>
                <button
                  onClick={() => { playClick(); setPending(null); }}
                  disabled={submitting}
                  className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t('vote.confirmBody', language).replace('{name}', pending.nickname)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { playClick(); setPending(null); }}
                  disabled={submitting}
                  className="flex-1 py-3 spooky-btn text-sm"
                >
                  {t('vote.confirmNo', language)}
                </button>
                <button
                  onClick={confirmVote}
                  disabled={submitting}
                  className="flex-1 py-3 spooky-btn spooky-btn-gold text-sm disabled:opacity-60"
                >
                  {submitting ? '…' : t('vote.confirmYes', language)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
