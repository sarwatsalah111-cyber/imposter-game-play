import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Zap, Loader2, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { playClick, playVictory, vibrate } from '@/lib/sounds';

export function ImposterGuessPanel() {
  const { room, language, sessionId, reveal, imposterGuess } = useGame();
  const [showGuess, setShowGuess] = useState(false);
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guessUsed, setGuessUsed] = useState(false);

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
            {t('game.cancel', language)}
          </button>
        </motion.div>
      )}
    </div>
  );
}
