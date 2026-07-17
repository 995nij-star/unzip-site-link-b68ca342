import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  // Immersive status bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a1a' });
  } catch (e) {
    console.log('[Capacitor] StatusBar not available:', e);
  }

  // Push notifications
  try {
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive === 'granted') {
      await PushNotifications.register();
    }

    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Token:', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Action:', notification);
      const url = notification.notification.data?.url;
      if (url) window.location.href = url;
    });
  } catch (e) {
    console.log('[Capacitor] PushNotifications not available:', e);
  }
}
