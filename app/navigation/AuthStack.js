import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import WelcomeScreen from '../screens/welcome/WelcomeScreen';
import LoginScreen from '../screens/authentication/login/LoginScreen';
import RegisterScreen from '../screens/authentication/signup/RegisterScreen';
import SellerRegisterScreen from '../screens/authentication/signup/SellerRegisterScreen';
import VerificationPending from '../screens/authentication/VerificationPending';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
      <Stack.Screen name="VerificationPending" component={VerificationPending} />
    </Stack.Navigator>
  );
};

export default AuthStack; 