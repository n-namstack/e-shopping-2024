import Constants from 'expo-constants';
import { Platform } from 'react-native';
import supabase from '../lib/supabase';

const SUPABASE_URL = 'https://wwfhaxdvizqzaqrnusiz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZmhheGR2aXpxemFxcm51c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NTU4NjgsImV4cCI6MjA1OTAzMTg2OH0.q5Q7nPzd-IQfzo30c4MWSoJawF1KB4QBnUsLhNZUDsg';

// Expo Go does not include native modules for expo-notifications or expo-device
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Notifications = null;
let Device = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('Push notification modules not available:', e.message);
  }
}

export async function registerForPushNotifications() {
  if (!Notifications || !Device || !Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ShopIt Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '554a2849-c7ab-4329-a398-e4d7cec9962d',
    });
    return tokenData.data;
  } catch (error) {
    console.log('Error getting push token:', error);
    return null;
  }
}

export async function savePushToken(userId, token) {
  if (!userId || !token) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('expo_push_token')) {
        console.log('expo_push_token column not yet created — run the SQL migration');
      } else {
        console.error('Error saving push token:', error);
      }
    } else {
      console.log('Push token saved');
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

export async function sendPushNotification(targetUserId, title, body, data = {}) {
  if (!targetUserId) return;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', targetUserId)
      .single();

    if (error || !profile?.expo_push_token) return;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        pushToken: profile.expo_push_token,
        title,
        body,
        data,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.log('Push notification edge function error:', text);
    }
  } catch (error) {
    console.log('Push notification send failed (non-critical):', error.message);
  }
}

export { Notifications };
