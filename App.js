import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './app/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
          <Navigation />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
