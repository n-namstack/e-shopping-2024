import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { registerForPushNotifications, savePushToken, Notifications } from '../services/PushNotificationService';
import useAuthStore from '../store/authStore';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function usePushNotifications(navigationRef) {
  const user = useAuthStore((state) => state.user);
  const notificationListener = useRef();
  const responseListener    = useRef();
  const appStateRef         = useRef(AppState.currentState);

  useEffect(() => {
    if (!user?.id || isExpoGo || !Notifications) return;

    const registerToken = async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          console.log('[push] Token registered for user:', user.id);
          await savePushToken(user.id, token);
        } else {
          console.warn('[push] Token registration returned null — permissions denied?');
        }
      } catch (err) {
        console.warn('[push] Registration error:', err.message);
      }
    };

    // Register immediately on mount
    registerToken();

    // Re-register every time the app comes to the foreground so reinstalls
    // always produce a fresh token that overwrites any stale one in the DB.
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        registerToken();
      }
      appStateRef.current = nextState;
    });

    // Foreground notification display
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // handled by setNotificationHandler in PushNotificationService
    });

    // Tap-to-navigate handler
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const nav  = navigationRef?.current;
      if (!nav) return;

      const orderId = data?.orderId;

      if (data?.screen === 'SellerOrderDetails') {
        // Navigate into the seller's OrdersTab → OrderDetails
        nav.navigate('Seller', {
          screen: 'OrdersTab',
          params: { screen: 'OrderDetails', params: { orderId } },
        });
      } else if (orderId) {
        // Navigate into the buyer's OrdersTab → OrderDetails
        nav.navigate('Buyer', {
          screen: 'OrdersTab',
          params: { screen: 'OrderDetails', params: { orderId } },
        });
      }
    });

    return () => {
      appStateSub.remove();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);
}
