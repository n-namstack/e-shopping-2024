import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';

import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';

import useAuthStore from '../store/authStore';

const Stack = createStackNavigator();

const Navigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, checkSession } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkSession();
      } catch (error) {
        console.error('Failed to check auth session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  if (isLoading) {
    // Show a loading screen or splash screen
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.user_metadata?.role === 'seller' ? (
            <Stack.Screen name="Seller" component={SellerNavigator} />
          ) : (
            <Stack.Screen name="Buyer" component={BuyerNavigator} />
          )
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="Buyer" component={BuyerNavigator} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation; 