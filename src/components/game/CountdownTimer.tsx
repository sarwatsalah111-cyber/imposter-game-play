import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

export function CountdownTimer({ seconds, onComplete }: { seconds: number; onComplete?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const completedRef = useRef(false);

  useEffect(() => {
    setTimeLeft(seconds);
    completedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = (timeLeft / seconds) * 100;
  const isLow = timeLeft <= 10;

  return (
    <div className="flex items-center gap-2 spooky-inner border border-border rounded-lg p-2">
      <Timer className={`w-4 h-4 ${isLow ? 'text-destructive animate-pulse' : 'text-accent'}`} />
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-destructive' : 'bg-accent'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className={`font-display text-sm font-bold min-w-[50px] text-right ${isLow ? 'text-destructive' : 'text-accent'}`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
