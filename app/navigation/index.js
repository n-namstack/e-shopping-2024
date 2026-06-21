import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { useAppTheme } from "../constants/themeContext";
import { createStackNavigator } from "@react-navigation/stack";

import AuthNavigator from "./AuthNavigator";
import BuyerNavigator from "./BuyerNavigator";
import SellerNavigator from "./SellerNavigator";
import SocialProfileCompleteScreen from "../screens/authentication/SocialProfileCompleteScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";
import useAuthStore from "../store/authStore";
import AssistantButton from "../components/AssistantButton";
import usePushNotifications from "../hooks/usePushNotifications";
import supabase from "../lib/supabase";

const Stack = createStackNavigator();

const Navigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const { user, profile, checkSession, needsProfileCompletion } =
    useAuthStore();
  const navigationRef = useRef(null);
  const { isDarkMode } = useAppTheme();

  usePushNotifications(navigationRef);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkSession();
      } catch (error) {
        console.error("Failed to check auth session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    // Show a loading screen or splash screen
    return null;
  }

  return (
    <View style={styles.container}>
      <NavigationContainer
        ref={navigationRef}
        theme={isDarkMode ? DarkTheme : DefaultTheme}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isPasswordRecovery ? (
            <Stack.Screen name="ResetPassword">
              {() => <ResetPasswordScreen onComplete={() => setIsPasswordRecovery(false)} />}
            </Stack.Screen>
          ) : user ? (
            needsProfileCompletion ? (
              <Stack.Screen
                name="SocialProfileComplete"
                component={SocialProfileCompleteScreen}
                options={{ gestureEnabled: false }}
              />
            ) : profile?.role === "seller" || profile?.role === "admin" ? (
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

      {/* Virtual Shopping Assistant Button - only show if user is logged in and profile is complete */}
      {user && !needsProfileCompletion && (
        <AssistantButton
          navigation={{
            navigate: (name, params) =>
              navigationRef.current?.navigate(name, params),
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
