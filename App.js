import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Navigation from "./app/navigation";
import TrackingPermissionManager from "./app/components/TrackingPermissionManager";
import { ThemeProvider } from "./app/constants/themeContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <TrackingPermissionManager>
        <ThemeProvider>
          <Navigation />
        </ThemeProvider>
        <StatusBar style="auto" />
      </TrackingPermissionManager>
    </SafeAreaProvider>
  );
}
