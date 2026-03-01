import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t, LANGUAGES, type Language } from '@/lib/i18n';
import { Eye, Users, Globe, Skull, HelpCircle, Info, X, ChevronRight } from 'lucide-react';
import { startAmbient, stopAmbient, playClick } from '@/lib/sounds';

function HowToPlayModal({ language, onClose }: { language: Language; onClose: () => void }) {
  const steps = [
    { icon: '👥', title: t('howto.step1Title', language), desc: t('howto.step1Desc', language) },
    { icon: '🔍', title: t('howto.step2Title', language), desc: t('howto.step2Desc', language) },
    { icon: '🗣️', title: t('howto.step3Title', language), desc: t('howto.step3Desc', language) },
    { icon: '🗳️', title: t('howto.step4Title', language), desc: t('howto.step4Desc', language) },
    { icon: '🏆', title: t('howto.step5Title', language), desc: t('howto.step5Desc', language) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm spooky-panel p-5 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            {t('howto.title', language)}
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-3 p-3 rounded-lg spooky-inner border border-border"
            >
              <span className="text-2xl flex-shrink-0">{step.icon}</span>
              <div>
                <p className="font-display font-bold text-accent text-sm uppercase tracking-wider">{step.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AboutModal({ language, onClose }: { language: Language; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm spooky-panel p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            {t('about.title', language)}
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Skull className="w-10 h-10 text-primary" />
            <Eye className="w-7 h-7 text-accent animate-pulse" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider text-glow-purple">
            {t('app.title', language)}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('about.description', language)}
          </p>
          <div className="spooky-inner border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-display mb-1">
              {t('about.developedBy', language)}
            </p>
            <p className="font-display text-xl font-bold text-accent text-glow-gold uppercase tracking-wider">
              Saro
            </p>
          </div>
          <p className="text-muted-foreground/50 text-xs font-display">v1.0</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HomeScreen() {
  const { nickname, setNickname, language, setLanguage, createRoom, joinRoom, loading, error, clearError } = useGame();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Start ambient sound on mount, stop on unmount
  useEffect(() => {
    const startSound = () => {
      startAmbient();
      document.removeEventListener('click', startSound);
    };
    document.addEventListener('click', startSound);
    return () => {
      document.removeEventListener('click', startSound);
      stopAmbient();
    };
  }, []);

  const handleCreate = async () => {
    if (!nickname.trim()) return;
    await createRoom();
  };

  const handleJoin = async () => {
    if (!nickname.trim() || roomCode.length !== 6) return;
    await joinRoom(roomCode);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-area-top safe-area-bottom relative">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-vignette" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Top-right menu buttons */}
      <div className="fixed top-4 right-4 z-20 flex gap-2 safe-area-top">
        <button
          onClick={() => { playClick(); setShowHowTo(true); }}
          className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          title={t('howto.title', language)}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <button
          onClick={() => { playClick(); setShowAbout(true); }}
          className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
          title={t('about.title', language)}
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Skull className="w-9 h-9 text-primary" />
            <Eye className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground text-glow-purple tracking-wide uppercase">
            {t('app.title', language)}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm italic">
            {t('app.subtitle', language)}
          </p>
        </motion.div>

        {/* Language selector */}
        <div className="flex gap-2 flex-wrap justify-center">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { playClick(); setLanguage(lang.code); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all uppercase tracking-wider ${
                language === lang.code
                  ? 'spooky-btn-gold'
                  : 'spooky-inner border border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Main panel */}
        <div className="w-full spooky-panel spider-corner p-5 scratched-texture">
          {/* Nickname input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('home.nickname', language)}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 spooky-input text-center font-semibold"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm text-center cursor-pointer"
              onClick={clearError}
            >
              {error}
            </motion.div>
          )}

          {mode === 'home' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => { playClick(); if (nickname.trim()) setMode('create'); }}
                disabled={!nickname.trim()}
                className="w-full py-4 spooky-btn text-base flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                {t('home.create', language)}
              </button>
              <button
                onClick={() => { playClick(); if (nickname.trim()) setMode('join'); }}
                disabled={!nickname.trim()}
                className="w-full py-4 spooky-btn-gold spooky-btn text-base flex items-center justify-center gap-2"
              >
                <Globe className="w-5 h-5" />
                {t('home.join', language)}
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => { playClick(); handleCreate(); }}
                disabled={loading || !nickname.trim()}
                className="w-full py-4 spooky-btn text-base glow-purple"
              >
                {loading ? '...' : t('home.create', language)}
              </button>
              <button
                onClick={() => { playClick(); setMode('home'); }}
                className="text-muted-foreground text-sm hover:text-foreground transition-colors font-display uppercase tracking-wider"
              >
                ← {t('lobby.leave', language)}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('home.enterCode', language)}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-3 spooky-input text-center font-display text-2xl tracking-[0.5em]"
              />
              <button
                onClick={() => { playClick(); handleJoin(); }}
                disabled={loading || roomCode.length !== 6}
                className="w-full py-4 spooky-btn text-base glow-purple"
              >
                {loading ? '...' : t('home.join', language)}
              </button>
              <button
                onClick={() => { playClick(); setMode('home'); setRoomCode(''); }}
                className="text-muted-foreground text-sm hover:text-foreground transition-colors font-display uppercase tracking-wider"
              >
                ← {t('lobby.leave', language)}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showHowTo && <HowToPlayModal language={language} onClose={() => setShowHowTo(false)} />}
        {showAbout && <AboutModal language={language} onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </div>
  );
}
