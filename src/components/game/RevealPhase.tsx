import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Eye, MessageCircle, ArrowRight, Skull } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import revealLoop from '@/assets/reveal-loop.mp4.asset.json';
import imposterReveal from '@/assets/imposter-reveal.mp4.asset.json';

export function RevealPhase() {
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

  const translations = reveal?.translations || {};
  const langMap: Record<string, string> = {
    'KU_CENTRAL': reveal?.word || '',
    'EN': translations['EN'] || '',
    'AR': translations['AR'] || '',
    'KU_KURMANJI': translations['KU_KURMANJI'] || reveal?.word || '',
  };
  const roomLang = room?.language || 'KU_CENTRAL';
  const primaryWord = langMap[roomLang] || reveal?.word || '';

  const langLabels: Record<string, string> = {
    'KU_CENTRAL': 'کوردی سۆرانی',
    'KU_KURMANJI': 'Kurmancî',
    'EN': 'English',
    'AR': 'العربية',
  };
  const otherLangs = Object.entries(langLabels)
    .filter(([code]) => code !== roomLang)
    .map(([code, label]) => ({
      label,
      word: code === 'KU_CENTRAL' ? (reveal?.word || '') : (translations[code] || ''),
    }))
    .filter(e => e.word);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col items-center justify-center gap-6 px-4 relative overflow-hidden"
    >
      {/* Ambient reveal video — color-graded to match dark purple/gold theme */}
      <video
        src={revealLoop.url}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen"
        style={{
          filter: 'brightness(0.55) saturate(0.7) contrast(1.05) hue-rotate(-15deg)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.85) 75%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
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
            <div className="relative mx-auto mb-4 flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <video
                src={imposterReveal.url}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  WebkitMaskImage:
                    'radial-gradient(circle at center, black 32%, rgba(0,0,0,0.7) 55%, transparent 82%)',
                  maskImage:
                    'radial-gradient(circle at center, black 32%, rgba(0,0,0,0.7) 55%, transparent 82%)',
                  filter: 'drop-shadow(0 0 22px hsl(var(--destructive) / 0.55))',
                }}
              />
            </div>
            <p className="font-display text-lg font-bold text-destructive uppercase tracking-wider">{t('game.youAreImposter', language)}</p>
          </>
        ) : (
          <>
            <Eye className="w-14 h-14 text-primary mx-auto mb-4" />
            <p className="font-display text-base font-bold text-foreground mb-4 uppercase tracking-wider">{t('game.youAreNormal', language)}</p>
            <div className="spooky-inner border border-border rounded-lg p-4">
              <p className="text-muted-foreground text-xs mb-1 font-display uppercase tracking-widest">{t('game.secretWord', language)}</p>
              <p className="font-display text-3xl font-bold text-accent text-glow-gold mt-2">{primaryWord}</p>
              {otherLangs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                  {otherLangs.map(({ label, word }) => (
                    <p key={label} className="text-muted-foreground/60 text-sm font-display">
                      <span className="text-muted-foreground/40 text-xs">{label}:</span>{' '}
                      {word}
                    </p>
                  ))}
                </div>
              )}
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
      </div>
    </motion.div>
  );
}
