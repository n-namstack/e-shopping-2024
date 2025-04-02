import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeWindStyleSheet } from 'nativewind';
import Navigation from './app/navigation';

// Initialize NativeWind
NativeWindStyleSheet.setOutput({
  default: 'native',
});

export default function App() {
  return (
    <SafeAreaProvider>
          <Navigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
