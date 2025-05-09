import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import useAuthStore from '../store/authStore';
import AssistantButton from '../components/AssistantButton';

const Stack = createStackNavigator();

const Navigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, checkSession } = useAuthStore();
  const navigationRef = useRef(null);

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
    <View style={styles.container}>
      <NavigationContainer ref={navigationRef}>
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
      
      {/* Virtual Shopping Assistant Button */}
      {user && (
        <AssistantButton 
          navigation={{
            navigate: (name, params) => navigationRef.current?.navigate(name, params)
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Navigation;