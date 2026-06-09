// Game entry point
import { useGame, GameProvider } from '@/contexts/GameContext';
import { HomeScreen } from '@/components/game/HomeScreen';
import { LobbyScreen } from '@/components/game/LobbyScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { OnboardingFlow } from '@/components/game/OnboardingFlow';
import { getDir } from '@/lib/i18n';
import { getSoraniFont, isOnboardingComplete } from '@/lib/session';
import { useState, useEffect } from 'react';

function GameContent() {
  const { room, phase, language } = useGame();
  const dir = getDir(language);

  const isSorani = language === 'KU_CENTRAL';
  const [soraniFont, setSoraniFont] = useState(getSoraniFont());
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());

  // Listen for font changes via storage event or re-render
  useEffect(() => {
    const handler = () => setSoraniFont(getSoraniFont());
    window.addEventListener('sorani-font-changed', handler);
    return () => window.removeEventListener('sorani-font-changed', handler);
  }, []);

  const fontClass = isSorani ? `font-sorani-${soraniFont}` : '';

  return (
    <div dir={dir} className={`min-h-screen bg-background ${fontClass}`}>
      {showOnboarding && !room && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
      {!showOnboarding && !room && <HomeScreen />}
      {room && phase === 'lobby' && <LobbyScreen />}
      {room && phase !== 'lobby' && <GameScreen />}
    </div>
  );
}

export default function Index() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
