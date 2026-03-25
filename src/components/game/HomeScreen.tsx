import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t, LANGUAGES, type Language } from '@/lib/i18n';
import { Users, Globe, HelpCircle, Info, X, ChevronRight, Settings, Minus, Plus, Volume2, VolumeX, Vibrate, BookOpen, ChevronDown, Type } from 'lucide-react';
import { SpyLogo } from './SpyLogo';
import { startAmbient, stopAmbient, playClick, isSoundEnabled, setSoundEnabled, isVibrationEnabled, setVibrationEnabled } from '@/lib/sounds';
import { getDefaultSettings, saveDefaultSettings, type DefaultGameSettings, getSoraniFont, setSoraniFont as saveSoraniFont, type SoraniFont } from '@/lib/session';
import { WordBankModal } from './WordBankManager';

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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 py-[env(safe-area-inset-top,1rem)] bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm spooky-panel p-5 my-auto"
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 py-[env(safe-area-inset-top,1rem)] bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm spooky-panel p-5 my-auto"
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
          <div className="flex items-center justify-center">
            <SpyLogo size={56} className="text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.4)]" />
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

function SettingRow({ label, value, onChange, min, max, step = 1, suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClick(); onChange(Math.max(min, value - step)); }}
          className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="font-display font-bold text-accent min-w-[48px] text-center">
          {value}{suffix}
        </span>
        <button
          onClick={() => { playClick(); onChange(Math.min(max, value + step)); }}
          className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function SettingsModal({ language, onClose }: { language: Language; onClose: () => void }) {
  const [settings, setSettings] = useState<DefaultGameSettings>(getDefaultSettings());
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [vibrationOn, setVibrationOn] = useState(isVibrationEnabled());
  const [soraniFont, setSoraniFontState] = useState<SoraniFont>(getSoraniFont());
  const [saved, setSaved] = useState(false);

  const updateSetting = (key: keyof DefaultGameSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveDefaultSettings(settings);
    setSoundEnabled(soundOn);
    setVibrationEnabled(vibrationOn);
    saveSoraniFont(soraniFont);
    window.dispatchEvent(new Event('sorani-font-changed'));
    if (!soundOn) stopAmbient();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => {
    const defaults: DefaultGameSettings = { max_players: 12, total_rounds: 5, spoke_rounds: 2, voting_time: 30, discussion_time: 90 };
    setSettings(defaults);
    playClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 py-[env(safe-area-inset-top,1rem)] bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm spooky-panel p-5 my-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {t('settings.title', language)}
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 mb-4">
          <SettingRow
            label={t('lobby.maxPlayers', language)}
            value={settings.max_players}
            onChange={v => updateSetting('max_players', v)}
            min={3} max={22}
          />
          <SettingRow
            label={t('lobby.rounds', language)}
            value={settings.total_rounds}
            onChange={v => updateSetting('total_rounds', v)}
            min={1} max={10}
          />
          <SettingRow
            label={t('lobby.spokeRounds', language)}
            value={settings.spoke_rounds}
            onChange={v => updateSetting('spoke_rounds', v)}
            min={1} max={5}
          />
          <SettingRow
            label={t('lobby.votingTime', language)}
            value={settings.voting_time}
            onChange={v => updateSetting('voting_time', v)}
            min={15} max={120} step={5} suffix="s"
          />
          <SettingRow
            label={t('lobby.discussionTime', language)}
            value={settings.discussion_time}
            onChange={v => updateSetting('discussion_time', v)}
            min={30} max={300} step={10} suffix="s"
          />
        </div>

        <div className="border-t border-border pt-3 mb-4 space-y-1">
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {t('settings.sound', language)}
            </span>
            <button
              onClick={() => { playClick(); setSoundOn(!soundOn); }}
              className={`w-12 h-7 rounded-full transition-all relative ${soundOn ? 'bg-accent' : 'bg-muted border border-border'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-foreground absolute top-1 transition-all ${soundOn ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Vibrate className="w-4 h-4" />
              {t('settings.vibration', language)}
            </span>
            <button
              onClick={() => { playClick(); setVibrationOn(!vibrationOn); }}
              className={`w-12 h-7 rounded-full transition-all relative ${vibrationOn ? 'bg-accent' : 'bg-muted border border-border'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-foreground absolute top-1 transition-all ${vibrationOn ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Sorani Font Selector */}
        <div className="border-t border-border pt-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('settings.soraniFont', language)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'peshang' as SoraniFont, label: 'Peshang Des' },
              { key: 'zana' as SoraniFont, label: 'UniQaidar Zana' },
              { key: 'k24' as SoraniFont, label: 'K24 Kurdish' },
              { key: 'kobane' as SoraniFont, label: 'Nizar Kobane' },
              { key: 'peshmerge' as SoraniFont, label: 'Nizar Peshmerge' },
              { key: 'rabar017' as SoraniFont, label: 'Rabar 017' },
              { key: 'rabar018' as SoraniFont, label: 'Rabar 018' },
              { key: 'rabar026' as SoraniFont, label: 'Rabar 026' },
              { key: 'rabar032' as SoraniFont, label: 'Rabar 032' },
              { key: 'mahansaria' as SoraniFont, label: 'Mahan Saria' },
            ]).map(font => (
              <button
                key={font.key}
                onClick={() => { playClick(); setSoraniFontState(font.key); }}
                className={`py-2 px-2 rounded-lg border text-xs transition-all ${
                  soraniFont === font.key
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border spooky-inner text-muted-foreground hover:border-primary/40'
                }`}
              >
                <span className={`font-sorani-${font.key}`}>{font.label}</span>
              </button>
            ))}
          </div>
          <p className={`text-center text-lg mt-2 text-accent font-sorani-${soraniFont}`}>
            فێڵباز — نموونە
          </p>
          <button onClick={handleReset} className="flex-1 py-2.5 spooky-btn text-xs">
            {t('settings.reset', language)}
          </button>
          <button onClick={() => { playClick(); handleSave(); }} className="flex-1 py-2.5 spooky-btn-gold spooky-btn text-xs">
            {saved ? '✓ ' + t('settings.saved', language) : t('settings.save', language)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HomeScreen() {
  const { nickname, setNickname, language, setLanguage, createRoom, joinRoom, loading, error, clearError } = useGame();
  const [searchParams, setSearchParams] = useSearchParams();
  const joinCode = searchParams.get('join') || '';

  const [mode, setMode] = useState<'home' | 'create' | 'join'>(joinCode ? 'join' : 'home');
  const [roomCode, setRoomCode] = useState(joinCode);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWordBank, setShowWordBank] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Clear URL param after reading
  useEffect(() => {
    if (joinCode) {
      setSearchParams({}, { replace: true });
    }
  }, []);

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
    await createRoom({ ...getDefaultSettings() } as Record<string, unknown>);
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
        {/* Language dropdown */}
        <div className="relative">
          <button
            onClick={() => { playClick(); setShowLangMenu(!showLangMenu); }}
            className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            title={t('home.language', language)}
          >
            <Globe className="w-5 h-5" />
          </button>
          <div
            className={`absolute right-0 top-12 spooky-panel border border-border rounded-lg p-1.5 min-w-[140px] z-30 transition-all duration-150 origin-top-right ${
              showLangMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => { playClick(); setLanguage(lang.code); setShowLangMenu(false); }}
                className={`w-full px-3 py-2 rounded-md text-xs font-semibold transition-all text-left ${
                  language === lang.code
                    ? 'spooky-btn-gold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {showLangMenu && <div className="fixed inset-0 z-20" onClick={() => setShowLangMenu(false)} />}
        </div>
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-3">
            <SpyLogo size={52} className="text-primary drop-shadow-[0_0_16px_hsl(var(--primary)/0.5)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground text-glow-purple tracking-wide uppercase">
            {t('app.title', language)}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm italic">
            {t('app.subtitle', language)}
          </p>
        </motion.div>

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
              transition={{ duration: 0.2 }}
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
                onClick={() => { playClick(); setShowSettings(true); }}
                className="w-full py-4 spooky-btn text-base flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                {t('settings.title', language)}
              </button>
              <button
                onClick={() => { playClick(); setShowWordBank(true); }}
                className="w-full py-4 spooky-btn text-base flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                {t('wordbank.title', language)}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
        {showSettings && <SettingsModal language={language} onClose={() => setShowSettings(false)} />}
        {showWordBank && <WordBankModal language={language} uiLang={language} onClose={() => setShowWordBank(false)} />}
      </AnimatePresence>
    </div>
  );
}
