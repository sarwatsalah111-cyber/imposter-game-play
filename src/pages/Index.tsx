import { useGame, GameProvider } from '@/contexts/GameContext';
import { HomeScreen } from '@/components/game/HomeScreen';
import { LobbyScreen } from '@/components/game/LobbyScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { getDir } from '@/lib/i18n';

function GameRouter() {
  const { room, phase, language } = useGame();
  const dir = getDir(language);

  return (
    <div dir={dir} className="min-h-screen bg-background">
      {!room && <HomeScreen />}
      {room && phase === 'lobby' && <LobbyScreen />}
      {room && phase !== 'lobby' && <GameScreen />}
    </div>
  );
}

const Index = () => (
  <GameProvider>
    <GameRouter />
  </GameProvider>
);

export default Index;
