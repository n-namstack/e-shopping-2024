import { useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { registerForPushNotifications, savePushToken, Notifications } from '../services/PushNotificationService';
import useAuthStore from '../store/authStore';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function usePushNotifications(navigationRef) {
  const user = useAuthStore((state) => state.user);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user?.id || isExpoGo || !Notifications) return;

    // Always re-register on mount so reinstalls pick up a fresh token
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log('[push] Registering token for user:', user.id);
        savePushToken(user.id, token);
      } else {
        console.warn('[push] Token registration returned null — permissions denied or emulator?');
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Handled by setNotificationHandler in PushNotificationService
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const nav = navigationRef?.current;
      if (!nav || !data?.orderId) return;

      if (data.screen === 'SellerOrderDetails') {
        nav.navigate('Seller', { screen: 'SellerOrderDetails', params: { orderId: data.orderId } });
      } else {
        nav.navigate('Buyer', { screen: 'OrderDetails', params: { orderId: data.orderId } });
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);
}
