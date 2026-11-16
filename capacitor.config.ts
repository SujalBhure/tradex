import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tradex.journal',
  appName: 'TradeX',
  webDir: 'dist',
  backgroundColor: '#0a0e14',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0a0e14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0a0e14',
      style: 'DARK',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0e14',
  },
};

export default config;
