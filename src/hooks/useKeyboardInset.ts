import { useEffect, useState } from 'react';

/**
 * Tracks the on-screen keyboard height on iOS/Android using visualViewport.
 * Returns the number of CSS pixels currently covered by the keyboard at the
 * bottom of the layout viewport (0 when the keyboard is closed).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Layout viewport height minus visible viewport bottom = keyboard overlap.
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setInset(overlap > 40 ? overlap : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return inset;
}