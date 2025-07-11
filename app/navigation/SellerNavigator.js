import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import useAuthStore from '../store/authStore';
import supabase from '../lib/supabase';

// Import screens
import DashboardScreen from "../screens/Seller/DashboardScreen";
import ProductsScreen from "../screens/Seller/ProductsScreen";
import AddProductScreen from "../screens/Seller/AddProductScreen";
import EditProductScreen from "../screens/Seller/EditProductScreen";
import OrdersScreen from "../screens/Seller/OrdersScreen";
import OrderDetailsScreen from "../screens/Seller/OrderDetailsScreen";
import ProfileScreen from "../screens/Seller/ProfileScreen";
import ShopsScreen from "../screens/Seller/ShopsScreen";
import ShopDetailsScreen from "../screens/Seller/ShopDetailsScreen";
import CreateShopScreen from "../screens/Seller/CreateShopScreen";
import VerificationScreen from "../screens/Seller/VerificationScreen";
import AnalyticsScreen from "../screens/Seller/AnalyticsScreen";

// Import missing profile screens
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import ShippingAddressScreen from "../screens/profile/ShippingAddressScreen";
import PaymentMethodsScreen from "../screens/profile/PaymentMethodsScreen";
import HelpCenterScreen from "../screens/profile/HelpCenterScreen";
import TermsPrivacyScreen from "../screens/profile/TermsPrivacyScreen";
import SellerRegisterScreen from "../screens/profile/SellerRegisterScreen";
import AccountDeletionScreen from "../screens/profile/AccountDeletionScreen";
import { FONTS } from "../constants/theme";
import MessagesScreen from '../screens/common/MessagesScreen';
import ChatDetailScreen from '../screens/common/ChatDetailScreen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold
} from "@expo-google-fonts/poppins";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigators for each tab
const DashboardStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
};

const ProductsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProduct" component={EditProductScreen} />
    </Stack.Navigator>
  );
};

const OrdersStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
};

const ShopsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Shops" component={ShopsScreen} />
      <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
      <Stack.Screen name="CreateShop" component={CreateShopScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ShippingAddress" component={ShippingAddressScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
      <Stack.Screen name="BankDetails" component={EditProfileScreen} />
      <Stack.Screen name="AccountDeletion" component={AccountDeletionScreen} />
    </Stack.Navigator>
  );
};

// Add a Messages stack navigator
const MessagesStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessagesList" component={MessagesScreen} />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen} 
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
};

// Add notification badge component
const NotificationBadge = ({ count }) => {
  if (!count || count <= 0) return null;
  
  return (
    <View style={styles.tabBadge}>
      <Text style={styles.tabBadgeText}>
        {count}
      </Text>
    </View>
  );
};

const SellerNavigator = () => {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user } = useAuthStore();
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold,Poppins_500Medium ,Poppins_600SemiBold});

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        // Get all shops owned by the user
        const { data: shops, error: shopError } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', user.id);
        
        if (shopError) throw shopError;
        
        if (!shops || shops.length === 0) {
          setUnreadNotifications(0);
          return;
        }
        
        const shopIds = shops.map(shop => shop.id);
        
        // Count unread notifications for orders in user's shops
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .in('shop_id', shopIds)
          .eq('read', false);

        if (!error) {
          setUnreadNotifications(count || 0);
        }
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time notifications for new orders
    const orderSubscription = supabase
      .channel('order-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders'
        },
        async (payload) => {
          try {
            // Check if the order belongs to one of the user's shops
            const { data: shops } = await supabase
              .from('shops')
              .select('id')
              .eq('owner_id', user.id);

            const shopIds = shops?.map(shop => shop.id) || [];
            
            if (shopIds.includes(payload.new.shop_id)) {
              // Create a notification for the new order
              const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                  shop_id: payload.new.shop_id,
                  order_id: payload.new.id,
                  read: false,
                  type: 'new_order',
                  message: `New order #${payload.new.id} received`
                });

              if (!notifError) {
                // Increment unread count when new order notification is created
                setUnreadNotifications(prev => prev + 1);
              }
            }
          } catch (error) {
            console.error('Error handling new order:', error);
          }
        }
      )
      .subscribe();

    // Subscribe to notification status changes
    const notificationSubscription = supabase
      .channel('notification-updates')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          try {
            // Check if the notification belongs to one of the user's shops
            const { data: shops } = await supabase
              .from('shops')
              .select('id')
              .eq('owner_id', user.id);

            const shopIds = shops?.map(shop => shop.id) || [];
            
            // If notification is marked as read and belongs to user's shop
            if (payload.new.read && !payload.old.read && shopIds.includes(payload.new.shop_id)) {
              setUnreadNotifications(prev => Math.max(0, prev - 1));
            }
          } catch (error) {
            console.error('Error handling notification update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      orderSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
    };
  }, [user?.id]);


  if (!fontsLoaded) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "DashboardTab") {
            iconName = focused ? "dashboard" : "dashboard-outline";
            return <MaterialIcons name="dashboard" size={size} color={color} />;
          } else if (route.name === "ProductsTab") {
            iconName = focused ? "cube" : "cube-outline";
          } else if (route.name === "OrdersTab") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "ShopsTab") {
            iconName = focused ? "storefront" : "storefront-outline";
          } else if (route.name === "ProfileTab") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "MessagesTab") {
            iconName = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle:{fontFamily: FONTS.regular}
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStack}
        options={{ tabBarLabel: "Products" }}
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStack} 
        options={{ 
          tabBarIcon: ({ color, size }) => (
            <View style={styles.tabIconContainer}>
              <MaterialIcons name="receipt-long" size={size} color={color} />
              {unreadNotifications > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: 'Orders' 
        }} 
      />
      <Tab.Screen
        name="ShopsTab"
        component={ShopsStack}
        options={{ tabBarLabel: "Shops" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    fontFamily: FONTS.bold
  },
});

export default SellerNavigator;
