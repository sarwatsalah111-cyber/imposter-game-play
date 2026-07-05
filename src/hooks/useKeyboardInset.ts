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

/**
 * Global handler: sets `--kb-inset` CSS variable on the <html> element and
 * scrolls the focused input into view when the on-screen keyboard opens.
 * Mount once at the app root.
 */
export function KeyboardInsetHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const root = document.documentElement;

    const setVar = (px: number) => {
      root.style.setProperty('--kb-inset', `${px}px`);
    };
    setVar(0);

    if (!vv) return;

    let last = 0;
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      const px = overlap > 40 ? Math.round(overlap) : 0;
      if (px === last) return;
      last = px;
      setVar(px);

      if (px > 0) {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return;
        const tag = el.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;
        window.setTimeout(() => {
          try {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          } catch {}
        }, 80);
      }
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    // Also react to focus so the scroll fires reliably on iOS.
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;
      window.setTimeout(() => {
        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {}
      }, 250);
    };
    document.addEventListener('focusin', onFocus);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', onFocus);
      root.style.removeProperty('--kb-inset');
    };
  }, []);

  return null;
}