import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4fa22035f0064da980ca8a96fedd5bc5',
  appName: 'Idexopn',
  webDir: 'dist',
  server: {
    url: 'https://4fa22035-f006-4da9-80ca-8a96fedd5bc5.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a1a',
      showSpinner: true,
      spinnerColor: '#3b82f6',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
  android: {
    backgroundColor: '#0a0a1a',
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
