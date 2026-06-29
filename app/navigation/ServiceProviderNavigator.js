import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";
import { FONTS } from "../constants/theme";
import useAuthStore from "../store/authStore";
import useBookingStore from "../store/bookingStore";
import supabase from "../lib/supabase";

// Screens
import ServiceProviderDashboardScreen from "../screens/ServiceProvider/ServiceProviderDashboardScreen";
import ServiceProviderSetupScreen from "../screens/ServiceProvider/ServiceProviderSetupScreen";
import ManageServicesScreen from "../screens/ServiceProvider/ManageServicesScreen";
import ManageAvailabilityScreen from "../screens/ServiceProvider/ManageAvailabilityScreen";
import BookingManagementScreen from "../screens/ServiceProvider/BookingManagementScreen";

// Shared profile screens
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import HelpCenterScreen from "../screens/profile/HelpCenterScreen";
import TermsPrivacyScreen from "../screens/profile/TermsPrivacyScreen";
import AccountDeletionScreen from "../screens/profile/AccountDeletionScreen";
import MessagesScreen from "../screens/common/MessagesScreen";
import ChatDetailScreen from "../screens/common/ChatDetailScreen";

// Reuse Seller ProfileScreen for now (shows the shared profile)
import ProfileScreen from "../screens/Seller/ProfileScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SPDashboard" component={ServiceProviderDashboardScreen} />
    <Stack.Screen name="SPSetup" component={ServiceProviderSetupScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const BookingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SPBookings" component={BookingManagementScreen} />
  </Stack.Navigator>
);

const ServicesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SPServices" component={ManageServicesScreen} />
  </Stack.Navigator>
);

const AvailabilityStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SPAvailability" component={ManageAvailabilityScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SPProfile" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
    <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
    <Stack.Screen name="AccountDeletion" component={AccountDeletionScreen} />
  </Stack.Navigator>
);

const MessagesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MessagesList" component={MessagesScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true }} />
  </Stack.Navigator>
);

const ServiceProviderNavigator = () => {
  const { user } = useAuthStore();
  const { myProvider, fetchMyProvider, providerBookings, fetchProviderBookings } =
    useBookingStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_700Bold,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  useEffect(() => {
    if (!user) return;
    fetchMyProvider(user.id).then((prov) => {
      if (prov) fetchProviderBookings(prov.id);
    });
  }, [user?.id]);

  useEffect(() => {
    const count = providerBookings.filter((b) => b.status === "pending").length;
    setPendingCount(count);
  }, [providerBookings]);

  // Realtime badge update
  useEffect(() => {
    if (!myProvider) return;
    const sub = supabase
      .channel(`sp-nav-bookings-${myProvider.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `provider_id=eq.${myProvider.id}` },
        () => fetchProviderBookings(myProvider.id)
      )
      .subscribe();
    return () => sub.unsubscribe();
  }, [myProvider?.id]);

  if (!fontsLoaded) return null;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontFamily: FONTS.regular },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            SPDashboardTab: focused ? "grid" : "grid-outline",
            SPBookingsTab: focused ? "calendar" : "calendar-outline",
            SPServicesTab: focused ? "briefcase" : "briefcase-outline",
            SPAvailabilityTab: focused ? "time" : "time-outline",
            SPProfileTab: focused ? "person" : "person-outline",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="SPDashboardTab"
        component={DashboardStack}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="SPBookingsTab"
        component={BookingsStack}
        options={{
          tabBarLabel: "Bookings",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={size}
                color={color}
              />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SPServicesTab"
        component={ServicesStack}
        options={{ tabBarLabel: "Services" }}
      />
      <Tab.Screen
        name="SPAvailabilityTab"
        component={AvailabilityStack}
        options={{ tabBarLabel: "Hours" }}
      />
      <Tab.Screen
        name="SPProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
});

export default ServiceProviderNavigator;
