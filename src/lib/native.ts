import { Capacitor } from '@capacitor/core';

/** True only inside the Capacitor iOS/Android shell (never in a browser). */
export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const nativePlatform = (): 'ios' | 'android' | 'web' => {
  try {
    const p = Capacitor.getPlatform();
    return p === 'ios' || p === 'android' ? p : 'web';
  } catch {
    return 'web';
  }
};

export const isIOS = () => nativePlatform() === 'ios';
export const isAndroid = () => nativePlatform() === 'android';