import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  delta: number;
  reason: string;
  onDone?: () => void;
}

export function PointsPopup({ delta, reason, onDone }: Props) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone?.(); }, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const positive = delta > 0;
  const big = Math.abs(delta) >= 4;
  const color = positive
    ? big ? 'text-accent' : 'text-emerald-400'
    : 'text-destructive';
  const label = positive ? `+${delta}` : `${delta}`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0, y: 20 }}
          animate={{ scale: big ? [0.3, 1.4, 1] : [0.3, 1.15, 1], opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ duration: 0.5 }}
          className={`inline-flex items-center justify-center font-display font-black ${color} ${big ? 'text-3xl drop-shadow-[0_0_18px_hsl(var(--accent)/0.7)]' : 'text-xl'}`}
          data-reason={reason}
        >
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  );
}