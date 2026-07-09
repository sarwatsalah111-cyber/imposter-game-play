import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Globe, User } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { t, LANGUAGES, getDir, type Language } from '@/lib/i18n';
import { setOnboardingComplete, setGender, type Gender } from '@/lib/session';
import { playClick } from '@/lib/sounds';

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const { language, setLanguage, nickname, setNickname } = useGame();
  const [step, setStep] = useState(0); // 0 lang, 1 name+gender, 2..6 howto (5 substeps)
  const [gender, setGenderState] = useState<Gender | null>(null);
  const [name, setName] = useState(nickname || '');
  const dir = getDir(language);

  const howToSteps = [
    { icon: '👥', title: t('howto.step1Title', language), desc: t('howto.step1Desc', language) },
    { icon: '🔍', title: t('howto.step2Title', language), desc: t('howto.step2Desc', language) },
    { icon: '🗣️', title: t('howto.step3Title', language), desc: t('howto.step3Desc', language) },
    { icon: '🗳️', title: t('howto.step4Title', language), desc: t('howto.step4Desc', language) },
    { icon: '🏆', title: t('howto.step5Title', language), desc: t('howto.step5Desc', language) },
  ];

  const totalSteps = 2 + howToSteps.length;
  const isLast = step === totalSteps - 1;
  const isHowTo = step >= 2;

  const canNext = step === 0
    ? !!language
    : step === 1
      ? name.trim().length > 0 && !!gender
      : true;

  const finish = () => {
    if (name.trim()) setNickname(name.trim());
    if (gender) setGender(gender);
    setOnboardingComplete();
    onComplete();
  };

  const handleNext = () => {
    playClick();
    if (isLast) return finish();
    setStep(s => s + 1);
  };

  const handlePrev = () => {
    playClick();
    if (step === 0) return;
    setStep(s => s - 1);
  };

  const handleSkip = () => {
    playClick();
    finish();
  };

  const genderOptions: { key: Gender; icon: string; label: string }[] = [
    { key: 'male', icon: '♂', label: t('onboarding.male', language) },
    { key: 'female', icon: '♀', label: t('onboarding.female', language) },
    { key: 'other', icon: '🧑', label: t('onboarding.other', language) },
  ];

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 bg-background flex flex-col px-5 overflow-y-auto"
      style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + var(--kb-inset, 0px)))',
      }}
    >
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6 pt-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-accent' : 'w-1.5 bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm spooky-panel p-6 pb-0"
          >
            {step === 0 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <Globe className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h2 className="font-display font-bold text-foreground text-xl uppercase tracking-wider text-glow-purple">
                    {t('onboarding.welcome', language)}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    {t('onboarding.chooseLanguage', language)}
                  </p>
                </div>
                <div className="space-y-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { playClick(); setLanguage(lang.code as Language); }}
                      className={`w-full py-3 px-4 rounded-lg border text-base font-medium transition-all ${
                        language === lang.code
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'border-border spooky-inner text-muted-foreground hover:border-primary/40'
                      }`}
                      dir={lang.dir}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center">
                  <User className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h2 className="font-display font-bold text-foreground text-xl uppercase tracking-wider text-glow-purple">
                    {t('onboarding.yourName', language)}
                  </h2>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('onboarding.namePlaceholder', language)}
                  maxLength={20}
                  className="w-full py-3 px-4 rounded-lg spooky-inner border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary text-base"
                />
                <div>
                  <p className="text-sm text-muted-foreground mb-2 text-center">
                    {t('onboarding.chooseGender', language)}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {genderOptions.map(g => (
                      <button
                        key={g.key}
                        onClick={() => { playClick(); setGenderState(g.key); }}
                        className={`py-4 px-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                          gender === g.key
                            ? 'border-primary bg-primary/15 text-foreground'
                            : 'border-border spooky-inner text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <span className="text-3xl leading-none">{g.icon}</span>
                        <span className="text-xs font-medium">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isHowTo && (() => {
              const idx = step - 2;
              const s = howToSteps[idx];
              return (
                <div className="space-y-4 text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-display">
                    {t('onboarding.howToTitle', language)} · {idx + 1}/{howToSteps.length}
                  </p>
                  <div className="text-6xl">{s.icon}</div>
                  <h2 className="font-display font-bold text-accent text-lg uppercase tracking-wider text-glow-gold">
                    {s.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed px-2">
                    {s.desc}
                  </p>
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="flex items-center gap-2 mt-6 pb-2">
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="flex items-center gap-1 py-3 px-4 rounded-lg spooky-inner border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">{t('onboarding.previous', language)}</span>
        </button>

        {isHowTo && !isLast && (
          <button
            onClick={handleSkip}
            className="py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            {t('onboarding.skip', language)}
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!canNext}
          className="flex-1 flex items-center justify-center gap-1 py-3 px-4 spooky-btn spooky-btn-gold disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-sm font-display font-bold uppercase tracking-wider">
            {isLast ? t('onboarding.start', language) : t('onboarding.next', language)}
          </span>
          {isLast ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}