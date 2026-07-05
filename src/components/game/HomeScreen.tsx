import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { t, LANGUAGES, type Language } from '@/lib/i18n';
import { Users, Globe, HelpCircle, Info, X, ChevronRight, Settings, Minus, Plus, Volume2, VolumeX, Vibrate, BookOpen, ChevronDown, Type, Radar, Sliders, Music2, Gamepad2 } from 'lucide-react';
import { RadarNearby } from './RadarNearby';
import { SpyLogo } from './SpyLogo';
import spyLogo from '@/assets/spy-logo.mp4.asset.json';
import { startAmbient, stopAmbient, playClick, isSoundEnabled, setSoundEnabled, isVibrationEnabled, setVibrationEnabled } from '@/lib/sounds';
import { getDefaultSettings, saveDefaultSettings, type DefaultGameSettings, getSoraniFont, setSoraniFont as saveSoraniFont, type SoraniFont } from '@/lib/session';
import { WordBankModal } from './WordBankManager';

function HowToPlaySection({ language }: { language: Language }) {
  const steps = [
    { icon: '👥', title: t('howto.step1Title', language), desc: t('howto.step1Desc', language) },
    { icon: '🔍', title: t('howto.step2Title', language), desc: t('howto.step2Desc', language) },
    { icon: '🗣️', title: t('howto.step3Title', language), desc: t('howto.step3Desc', language) },
    { icon: '🗳️', title: t('howto.step4Title', language), desc: t('howto.step4Desc', language) },
    { icon: '🏆', title: t('howto.step5Title', language), desc: t('howto.step5Desc', language) },
    { icon: '💀', title: t('howto.step6Title', language), desc: t('howto.step6Desc', language) },
  ];
  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex gap-3 p-3 rounded-lg spooky-inner border border-border"
        >
          <span className="text-2xl flex-shrink-0 leading-none">{step.icon}</span>
          <div className="min-w-0">
            <p className="font-display font-bold text-accent text-sm uppercase tracking-wider">{step.title}</p>
            <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{step.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AboutSection({ language }: { language: Language }) {
  return (
    <div className="text-center space-y-4 py-2">
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
  const [section, setSection] = useState<'game' | 'audio' | 'font' | 'words' | 'howto' | 'about'>('game');
  const [showWordBank, setShowWordBank] = useState(false);

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

  const NAV = [
    { id: 'game' as const, label: t('settings.nav.game', language), icon: Gamepad2 },
    { id: 'audio' as const, label: t('settings.nav.audio', language), icon: Music2 },
    { id: 'font' as const, label: t('settings.nav.font', language), icon: Type },
    { id: 'words' as const, label: t('settings.nav.words', language), icon: BookOpen },
    { id: 'howto' as const, label: t('settings.nav.howto', language), icon: HelpCircle },
    { id: 'about' as const, label: t('settings.nav.about', language), icon: Info },
  ];

  const showSaveBar = section === 'game' || section === 'audio' || section === 'font';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain modal-safe-inset bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-lg md:max-w-2xl spooky-panel p-3 sm:p-5 flex flex-col modal-max-h"
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4 shrink-0">
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {t('settings.title', language)}
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section navigation */}
        <div className="relative -mx-1 mb-3 sm:mb-4 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex gap-1.5 px-1 pb-2 min-w-max">
            {NAV.map(n => {
              const active = section === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { playClick(); setSection(n.id); }}
                  className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-display font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'spooky-btn-gold text-background'
                      : 'spooky-inner border border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  }`}
                >
                  <n.icon className="w-3.5 h-3.5" />
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 -mr-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {section === 'game' && (
                <div className="space-y-1">
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
              )}

              {section === 'audio' && (
                <div className="space-y-1">
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
              )}

              {section === 'font' && (
                <div>
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
                className={`group relative py-2 px-2 rounded-lg border text-xs transition-all ${
                  soraniFont === font.key
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border spooky-inner text-muted-foreground hover:border-primary/40'
                }`}
              >
                <span className={`font-sorani-${font.key}`}>{font.label}</span>
                {/* Hover preview tooltip */}
                <div className={`pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 rounded-xl border border-primary/30 bg-card shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-sorani-${font.key}`}>
                  <p className="text-base text-accent leading-relaxed text-center" dir="rtl">
                    جاسوسەکەی نێوانتان بدۆزەوە، یان هەمویان هەڵبخەڵەتێنە
                  </p>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">{font.label}</p>
                </div>
              </button>
            ))}
          </div>
          {/* Selected font live preview */}
          <div className={`mt-3 p-3 rounded-xl spooky-inner border border-border font-sorani-${soraniFont}`} dir="rtl">
            <p className="text-lg text-accent text-center leading-relaxed">فێڵباز — نموونە</p>
            <p className="text-sm text-foreground/80 text-center mt-1 leading-relaxed">جاسوسەکەی نێوانتان بدۆزەوە، یان هەمویان هەڵبخەڵەتێنە</p>
            <p className="text-xs text-muted-foreground text-center mt-1">١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠ — ئابجد</p>
          </div>
                </div>
              )}

              {section === 'words' && (
                <div className="space-y-3 py-2 text-center">
                  <BookOpen className="w-10 h-10 text-primary mx-auto" />
                  <h3 className="font-display font-bold text-foreground text-base uppercase tracking-wider text-glow-purple">
                    {t('wordbank.title', language)}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                    {t('settings.wordsHint', language)}
                  </p>
                  <button
                    onClick={() => { playClick(); setShowWordBank(true); }}
                    className="w-full py-3 spooky-btn-gold spooky-btn text-sm flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    {t('settings.manageWords', language)}
                  </button>
                </div>
              )}

              {section === 'howto' && <HowToPlaySection language={language} />}
              {section === 'about' && <AboutSection language={language} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {showSaveBar && (
          <div className="flex gap-2 mt-3 sm:mt-4 pt-3 border-t border-border shrink-0">
            <button onClick={handleReset} className="flex-1 py-2.5 spooky-btn text-xs">
              {t('settings.reset', language)}
            </button>
            <button onClick={() => { playClick(); handleSave(); }} className="flex-1 py-2.5 spooky-btn-gold spooky-btn text-xs">
              {saved ? '✓ ' + t('settings.saved', language) : t('settings.save', language)}
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showWordBank && (
          <WordBankModal language={language} uiLang={language} onClose={() => setShowWordBank(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HomeScreen() {
  const { nickname, setNickname, language, setLanguage, createRoom, joinRoom, loading, error, clearError } = useGame();
  const [searchParams, setSearchParams] = useSearchParams();
  const joinCode = searchParams.get('join') || '';

  const [mode, setMode] = useState<'home' | 'create' | 'join'>(joinCode ? 'join' : 'home');
  const [roomCode, setRoomCode] = useState(joinCode);
  const [showSettings, setShowSettings] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showRadar, setShowRadar] = useState(false);

  // Logo video autoplay (iOS-safe): try play() on mount + on first user interaction.
  const logoVideoRef = useRef<HTMLVideoElement>(null);
  const [logoNeedsTap, setLogoNeedsTap] = useState(false);
  useEffect(() => {
    const v = logoVideoRef.current;
    if (!v) return;
    v.muted = true;
    (v as any).playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => setLogoNeedsTap(false)).catch(() => setLogoNeedsTap(true));
      }
    };
    tryPlay();
    const onInteract = () => {
      tryPlay();
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('click', onInteract);
    };
    window.addEventListener('touchstart', onInteract, { passive: true, once: true });
    window.addEventListener('click', onInteract, { once: true });
    const onVis = () => { if (document.visibilityState === 'visible') tryPlay(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('click', onInteract);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

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
          onClick={() => { playClick(); setShowSettings(true); }}
          className="w-10 h-10 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          title={t('settings.title', language)}
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => { playClick(); setShowRadar(true); }}
          className="w-10 h-10 rounded-lg spooky-inner border border-emerald-500/40 flex items-center justify-center text-emerald-300 hover:text-emerald-200 hover:border-emerald-400/70 transition-colors shadow-[0_0_10px_hsl(150_90%_45%/0.35)]"
          title={t('home.radar', language)}
        >
          <Radar className="w-5 h-5" />
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
            <button
              type="button"
              onClick={() => {
                const v = logoVideoRef.current;
                if (!v) return;
                const p = v.play();
                if (p && typeof p.then === 'function') {
                  p.then(() => setLogoNeedsTap(false)).catch(() => {});
                }
              }}
              aria-label="Play logo animation"
              className="relative p-0 bg-transparent border-0 cursor-pointer"
              style={{ width: 96, height: 96 }}
            >
              <video
                ref={logoVideoRef}
                src={spyLogo.url}
                autoPlay
                loop
                muted
                playsInline
                // @ts-ignore — iOS Safari attribute
                webkit-playsinline="true"
                preload="auto"
                aria-hidden="true"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  WebkitMaskImage:
                    'radial-gradient(circle at center, black 38%, rgba(0,0,0,0.7) 55%, transparent 78%)',
                  maskImage:
                    'radial-gradient(circle at center, black 38%, rgba(0,0,0,0.7) 55%, transparent 78%)',
                  filter: 'drop-shadow(0 0 18px hsl(var(--primary) / 0.55))',
                }}
              />
              {logoNeedsTap && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-background/40 backdrop-blur-sm text-foreground text-xs font-display uppercase tracking-widest animate-pulse"
                >
                  Tap
                </span>
              )}
            </button>
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
                onClick={() => { playClick(); if (nickname.trim()) setMode('join'); }}
                disabled={!nickname.trim()}
                className="w-full py-4 spooky-btn-gold spooky-btn text-base flex items-center justify-center gap-2"
              >
                <Globe className="w-5 h-5" />
                {t('home.join', language)}
              </button>
              <button
                onClick={() => { playClick(); setShowSettings(true); }}
                className="w-full py-3 spooky-btn text-sm flex items-center justify-center gap-2 opacity-90"
              >
                <Sliders className="w-4 h-4" />
                {t('settings.title', language)}
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
        {showRadar && <RadarNearby onClose={() => setShowRadar(false)} />}
        {showSettings && <SettingsModal language={language} onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}
