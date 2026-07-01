import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useGameEngine } from '@/hooks/useGameEngine';
import { t } from '@/lib/i18n';
import { X, Radar } from 'lucide-react';
import { playClick, playRadarPing } from '@/lib/sounds';

interface OpenRoom {
  code: string;
  language: string;
  max_players: number;
  player_count: number;
  created_at: string;
}

function seededAngle(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return (h % 360) * (Math.PI / 180);
}

export function RadarNearby({ onClose }: { onClose: () => void }) {
  const { language, joinRoom } = useGame();
  const engine = useGameEngine();
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [ready, setReady] = useState(false);
  const pingTimerRef = useRef<number | null>(null);

  const fetchRooms = async () => {
    try {
      const res = await engine.listOpenRooms();
      setRooms(res.rooms || []);
      setReady(true);
    } catch {
      setReady(true);
    }
  };

  useEffect(() => {
    fetchRooms();
    const iv = setInterval(fetchRooms, 3500);
    // radar ping every ~3s
    const ping = () => { playRadarPing(); };
    pingTimerRef.current = window.setInterval(ping, 3000);
    ping();
    return () => {
      clearInterval(iv);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const R = 110; // radar radius in px
  const dots = rooms.map((r, i) => {
    const angle = seededAngle(r.code);
    // stable "distance" band from recency
    const dist = 0.35 + ((i % 5) * 0.12);
    return { r, x: Math.cos(angle) * R * dist, y: Math.sin(angle) * R * dist };
  });

  const autoJoin = () => {
    if (rooms.length === 0) return;
    playClick();
    joinRoom(rooms[0].code);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm spooky-panel p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-foreground text-lg uppercase tracking-wider text-glow-purple flex items-center gap-2">
            <Radar className="w-5 h-5 text-emerald-400" />
            {t('radar.title', language)}
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="w-8 h-8 rounded-lg spooky-inner border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mx-auto mb-4" style={{ width: R * 2 + 40, height: R * 2 + 40 }}>
          {/* Radar rings */}
          {[1, 0.66, 0.33].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-emerald-500/40"
              style={{
                width: R * 2 * s, height: R * 2 * s,
                left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                boxShadow: i === 0 ? '0 0 25px hsl(150 90% 45% / 0.35)' : undefined,
              }}
            />
          ))}
          {/* Cross */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-emerald-500/25" />
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-px bg-emerald-500/25" />

          {/* Sweeping line */}
          <motion.div
            className="absolute left-1/2 top-1/2 origin-left"
            style={{ width: R, height: 2 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(to right, hsl(150 90% 50% / 0.8), transparent)',
                boxShadow: '0 0 12px hsl(150 90% 45% / 0.9)',
              }}
            />
          </motion.div>

          {/* Room dots */}
          {dots.map((d, i) => (
            <motion.button
              key={d.r.code}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => { playClick(); joinRoom(d.r.code); }}
              className="absolute w-4 h-4 rounded-full bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_12px_hsl(150_90%_50%/0.9)]"
              style={{
                left: `calc(50% + ${d.x}px - 8px)`,
                top: `calc(50% + ${d.y}px - 8px)`,
              }}
              title={`${d.r.code} • ${d.r.player_count}/${d.r.max_players}`}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-display text-emerald-300 whitespace-nowrap">
                {d.r.code}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground mb-3">
          {!ready
            ? t('radar.scanning', language)
            : rooms.length === 0
              ? t('radar.empty', language)
              : `${rooms.length} ${t('radar.found', language)}`}
        </div>

        <button
          onClick={autoJoin}
          disabled={rooms.length === 0}
          className="w-full py-3 spooky-btn text-sm glow-purple disabled:opacity-40"
        >
          {t('radar.autoJoin', language)}
        </button>
      </motion.div>
    </motion.div>
  );
}