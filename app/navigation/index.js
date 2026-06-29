import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet } from "react-native";
import AnimatedSplash from "../components/AnimatedSplash";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useAppTheme } from "../constants/themeContext";
import { createStackNavigator } from "@react-navigation/stack";

import AuthNavigator from "./AuthNavigator";
import BuyerNavigator from "./BuyerNavigator";
import SellerNavigator from "./SellerNavigator";
import ServiceProviderNavigator from "./ServiceProviderNavigator";
import SocialProfileCompleteScreen from "../screens/authentication/SocialProfileCompleteScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";
import useAuthStore from "../store/authStore";
import AssistantButton from "../components/AssistantButton";
import usePushNotifications from "../hooks/usePushNotifications";
import supabase from "../lib/supabase";

const Stack = createStackNavigator();

const Navigation = () => {
  const [isLoading,          setIsLoading]          = useState(true);
  const [minTimeReady,       setMinTimeReady]        = useState(false);
  const [splashDone,         setSplashDone]          = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery]  = useState(false);
  const { user, profile, checkSession, needsProfileCompletion } =
    useAuthStore();
  const navigationRef = useRef(null);
  const { isDarkMode } = useAppTheme();

  usePushNotifications(navigationRef);

  useEffect(() => {
    // Parse a deep link URL and establish a password-recovery session
    const handleUrl = async (url) => {
      if (!url) return;
      try {
        // PKCE flow: the URL contains ?code=xxx
        const codeMatch = url.match(/[?&]code=([^&#]+)/);
        if (codeMatch) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            decodeURIComponent(codeMatch[1])
          );
          if (!error) setIsPasswordRecovery(true);
          return;
        }

        // Implicit flow: tokens arrive in the hash fragment
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const params = Object.fromEntries(
            new URLSearchParams(url.slice(hashIndex + 1))
          );
          if (params.type === 'recovery' && params.access_token) {
            const { error } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
            if (!error) setIsPasswordRecovery(true);
          }
        }
      } catch (err) {
        console.warn('[deepLink]', err.message);
      }
    };

    const initializeAuth = async () => {
      try {
        // Run session check and initial URL read in parallel
        const [, initialUrl] = await Promise.all([
          checkSession(),
          Linking.getInitialURL(),
        ]);
        if (initialUrl) await handleUrl(initialUrl);
      } catch (error) {
        console.error("Failed to check auth session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Minimum splash display time — lets animations play fully
    const minTimer = setTimeout(() => setMinTimeReady(true), 2500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    // Handle deep links while the app is already open (foreground)
    const urlSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      clearTimeout(minTimer);
      subscription.unsubscribe();
      urlSub.remove();
    };
  }, []);

  const splashReady = !isLoading && minTimeReady;

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
            ) : profile?.role === "service_provider" ? (
              <Stack.Screen name="ServiceProvider" component={ServiceProviderNavigator} />
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
      {user && !needsProfileCompletion && splashDone && (
        <AssistantButton
          navigation={{
            navigate: (name, params) =>
              navigationRef.current?.navigate(name, params),
          }}
        />
      )}

      {/* Animated splash overlay — sits on top until ready */}
      {!splashDone && (
        <AnimatedSplash
          isReady={splashReady}
          onHide={() => setSplashDone(true)}
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
