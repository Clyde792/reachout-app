import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// EAS project id (from app.json > expo.extra.eas.projectId). Hardcoded so we
// don't depend on expo-constants being present.
const PROJECT_ID = 'd6c2af81-6845-4d25-9055-f0cfb26ba597';

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Ask for permission and return this device's Expo push token, or null.
 * Returns null on web and in Expo Go (SDK 53+ can't get a remote push token
 * there) — a development/EAS build is required for real push delivery.
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return tokenResp?.data ?? null;
  } catch (e) {
    console.error('Push registration error:', e);
    return null;
  }
}
