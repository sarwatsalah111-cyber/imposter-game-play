import { useGame, GameProvider } from '@/contexts/GameContext';
import { HomeScreen } from '@/components/game/HomeScreen';
import { LobbyScreen } from '@/components/game/LobbyScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { getDir } from '@/lib/i18n';

function GameContent() {
  const { room, phase, language } = useGame();
  const dir = getDir(language);

  const isSorani = language === 'KU_CENTRAL';

  return (
    <div dir={dir} className={`min-h-screen bg-background ${isSorani ? 'font-sorani' : ''}`}>
      {!room && <HomeScreen />}
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
