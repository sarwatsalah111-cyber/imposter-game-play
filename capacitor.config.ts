import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sarwat.theimposter',
  appName: 'The Imposter',
  webDir: 'dist',
  // Store builds MUST bundle `dist` — never load a remote URL.
  // For local live-reload during development only, temporarily uncomment:
  // server: {
  //   url: 'https://5a29bced-b2ac-4fa4-9c28-a94c3e543109.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  backgroundColor: '#0a0a0f',
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: '#0a0a0f',
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
