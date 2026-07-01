import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';
import { Eye, MessageCircle, ArrowRight, Skull, HelpCircle, RefreshCw, ImageIcon } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { useDeviceTilt } from '@/hooks/useDeviceTilt';
import { useGameEngine } from '@/hooks/useGameEngine';
import revealLoop from '@/assets/reveal-loop.mp4.asset.json';
import imposterReveal from '@/assets/imposter-reveal.mp4.asset.json';

export function RevealPhase() {
  const { reveal, language, room, isHost, advancePhase, sessionId } = useGame();
  const isImposter = reveal?.role === 'imposter';
  const [showSplash, setShowSplash] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [wordImage, setWordImage] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const imposterVideoRef = useRef<HTMLVideoElement | null>(null);
  const engine = useGameEngine();
  const { tilt, needsPermission, requestPermission } = useDeviceTilt(12);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Reset flip on new round
  useEffect(() => {
    setFlipped(false);
    setWordImage(null);
    setImgError(null);
  }, [room?.current_round]);

  // Auto-flip after 3s if untouched (so timer stays honest)
  useEffect(() => {
    if (showSplash || flipped) return;
    const t = setTimeout(() => setFlipped(true), 3000);
    return () => clearTimeout(t);
  }, [showSplash, flipped]);

  // Reliably (re)start the imposter reveal video whenever it mounts/becomes visible
  useEffect(() => {
    if (showSplash || !isImposter || !flipped) return;
    const v = imposterVideoRef.current;
    if (!v) return;

    const tryPlay = () => {
      try {
        v.muted = true;
        v.setAttribute('muted', '');
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.currentTime = 0;
        const p = v.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      } catch {}
    };

    tryPlay();
    const onVisible = () => { if (document.visibilityState === 'visible') tryPlay(); };
    const onInteract = () => tryPlay();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('touchstart', onInteract, { passive: true, once: true });
    window.addEventListener('click', onInteract, { once: true });
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('click', onInteract);
    };
  }, [showSplash, isImposter, flipped, room?.current_round]);

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

  // Fit text size to word length so long words don't overflow
  const wordLen = primaryWord.length;
  const wordSizeClass =
    wordLen <= 8 ? 'text-4xl' :
    wordLen <= 14 ? 'text-3xl' :
    wordLen <= 20 ? 'text-2xl' :
    'text-xl';

  const generateImage = async () => {
    if (!room || !primaryWord || isImposter) return;
    setImgLoading(true);
    setImgError(null);
    try {
      const res = await engine.generateWordImage(sessionId, room.id, reveal?.word || primaryWord);
      setWordImage(res.image);
    } catch (e) {
      setImgError((e as Error).message);
    } finally {
      setImgLoading(false);
    }
  };

  const tiltStyle: React.CSSProperties = {
    transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transition: 'transform 60ms linear',
  };

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

      {/* Tap-to-reveal 3D card */}
      <div
        onClick={() => {
          if (!flipped) {
            setFlipped(true);
            if (needsPermission) requestPermission();
          }
        }}
        className="w-full max-w-xs cursor-pointer"
        style={{ perspective: '1200px' }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 120, damping: 18 }}
          className="relative w-full"
          style={{
            transformStyle: 'preserve-3d',
            minHeight: 340,
            ...tiltStyle,
          }}
        >
          {/* BACK (initial) */}
          <div
            className="absolute inset-0 p-8 spooky-panel spider-corner text-center flex flex-col items-center justify-center gap-4 glow-purple"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <HelpCircle className="w-20 h-20 text-primary animate-pulse" />
            <p className="font-display text-base font-bold text-foreground uppercase tracking-wider text-glow-purple">
              {t('reveal.tapToReveal', language)}
            </p>
          </div>

          {/* FRONT (revealed) */}
          <div
            className={`p-6 spooky-panel spider-corner text-center ${isImposter ? 'glow-red' : 'glow-purple'}`}
            style={{ backfaceVisibility: 'hidden' }}
          >
        {isImposter ? (
          <>
            <div className="relative mx-auto mb-4 flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <video
                key={`imposter-reveal-${room?.current_round ?? 0}`}
                ref={imposterVideoRef}
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
              <p className={`font-display ${wordSizeClass} font-bold text-accent text-glow-gold mt-2 break-words leading-tight`}>{primaryWord}</p>
              <p className="text-[11px] text-muted-foreground italic mt-2">{t('reveal.dontForget', language)}</p>
            </div>
            {/* AI image preview */}
            <div className="mt-3">
              {wordImage ? (
                <div className="relative rounded-lg overflow-hidden border border-accent/30">
                  <img src={wordImage} alt="" className="w-full h-40 object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); generateImage(); }}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/70 flex items-center justify-center text-foreground"
                    title={t('reveal.regenerate', language)}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${imgLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); generateImage(); }}
                  disabled={imgLoading}
                  className="w-full py-2 spooky-btn text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {imgLoading ? t('reveal.generating', language) : t('reveal.regenerate', language)}
                </button>
              )}
              {imgError && <p className="text-[10px] text-destructive mt-1">{imgError}</p>}
            </div>
          </>
        )}
          </div>
        </motion.div>
      </div>

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
