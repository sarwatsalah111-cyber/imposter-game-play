import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { LogOut } from 'lucide-react';
import { playClick } from '@/lib/sounds';
import { RevealPhase } from './RevealPhase';
import { SpeakingQueuePhase } from './SpeakingQueuePhase';
import { VotingPhase } from './VotingPhase';
import { ResultsPhase } from './ResultsPhase';

const MemoReveal = memo(RevealPhase);
const MemoSpeaking = memo(SpeakingQueuePhase);
const MemoVoting = memo(VotingPhase);
const MemoResults = memo(ResultsPhase);

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
              <p className="font-display font-bold text-foreground uppercase tracking-wider">{t('game.leaveTitle', language)}</p>
              <p className="text-muted-foreground text-sm">{t('game.leaveDesc', language)}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { playClick(); setShowLeaveConfirm(false); }}
                  className="flex-1 py-3 spooky-btn text-sm"
                >
                  {t('game.stay', language)}
                </button>
                <button
                  onClick={() => { playClick(); leaveRoom(); }}
                  className="flex-1 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-display font-bold text-sm uppercase tracking-wider hover:bg-destructive/20 transition-colors"
                >
                  {t('lobby.leave', language)}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {phase === 'reveal' && <MemoReveal />}
        {phase === 'discussion' && <MemoSpeaking />}
        {phase === 'voting' && <MemoVoting />}
        {phase === 'results' && <MemoResults />}
      </div>
    </div>
  );
}