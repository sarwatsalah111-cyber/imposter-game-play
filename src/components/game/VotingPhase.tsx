import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Vote, ArrowRight, CheckCircle, Target } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

export function VotingPhase() {
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
