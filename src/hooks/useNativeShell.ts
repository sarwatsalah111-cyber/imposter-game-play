import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { isNative, isAndroid, isIOS } from '@/lib/native';

/**
 * Boots the native shell: status bar theming, splash hide, keyboard mode,
 * Android hardware back button and foreground re-sync.
 * No-ops entirely on the web build.
 */
export function NativeShell() {
  useEffect(() => {
    if (!isNative()) return;
    document.documentElement.classList.add('is-native');

    (async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (isAndroid()) {
          await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch {}
      try {
        if (isIOS()) await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
      } catch {}
      try {
        await SplashScreen.hide();
      } catch {}
    })();

    // Android hardware back button: close top-most overlay, else confirm exit.
    let backHandle: { remove: () => void } | undefined;
    CapApp.addListener('backButton', () => {
      const openOverlay = document.querySelector<HTMLElement>(
        '[data-native-back="close"], [role="dialog"][data-state="open"]',
      );
      if (openOverlay) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        openOverlay.dispatchEvent(new CustomEvent('native-back', { bubbles: true }));
        return;
      }
      const handled = !window.dispatchEvent(new CustomEvent('native-back', { cancelable: true }));
      if (!handled) CapApp.minimizeApp?.();
    }).then(h => { backHandle = h; });

    // Re-sync realtime game state whenever the app returns to the foreground.
    let stateHandle: { remove: () => void } | undefined;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) window.dispatchEvent(new CustomEvent('native-resume'));
    }).then(h => { stateHandle = h; });

    return () => {
      backHandle?.remove();
      stateHandle?.remove();
    };
  }, []);

  return null;
}