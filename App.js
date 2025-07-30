import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './app/navigation';
import TrackingPermissionManager from './app/components/TrackingPermissionManager';

export default function App() {
  return (
    <SafeAreaProvider>
      <TrackingPermissionManager>
          <Navigation />
      <StatusBar style="auto" />
      </TrackingPermissionManager>
    </SafeAreaProvider>
  );
}
