import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Network } from '@capacitor/network';
import { useGame } from '@/contexts/GameContext';
import { t } from '@/lib/i18n';

export function OfflineBanner() {
  const { language } = useGame();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    Network.getStatus()
      .then(s => setOffline(!s.connected))
      .catch(() => setOffline(!navigator.onLine));
    Network.addListener('networkStatusChange', s => setOffline(!s.connected))
      .then(h => { handle = h; })
      .catch(() => {});

    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      handle?.remove();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-destructive-foreground text-xs font-display uppercase tracking-wider"
      style={{ top: 'env(safe-area-inset-top)' }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      {t('offline.banner', language)}
    </div>
  );
}