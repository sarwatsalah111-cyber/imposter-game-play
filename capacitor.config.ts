import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sarwat.theimposter',
  appName: 'imposter-game-play',
  webDir: 'dist',
  server: {
    url: 'https://5a29bced-b2ac-4fa4-9c28-a94c3e543109.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
