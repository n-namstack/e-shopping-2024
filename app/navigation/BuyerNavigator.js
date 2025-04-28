import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import useCartStore from "../store/cartStore";
import useAuthStore from "../store/authStore";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

// Import screens
import BrowseProductsScreen from "../screens/Buyer/BrowseProductsScreen";
import ProductDetailsScreen from "../screens/Buyer/ProductDetailsScreen";
import CartScreen from "../screens/Buyer/CartScreen";
import CheckoutScreen from "../screens/Buyer/CheckoutScreen";
import OrdersScreen from "../screens/Buyer/OrdersScreen";
import OrderDetailsScreen from "../screens/Buyer/OrderDetailsScreen";
import ProfileScreen from "../screens/Buyer/ProfileScreen";
import ShopDetailsScreen from "../screens/Buyer/ShopDetailsScreen";
import PaymentScreen from "../screens/Buyer/PaymentScreen";
import OrderTrackingScreen from "../screens/Buyer/OrderTrackingScreen";
import OrderSuccessScreen from "../screens/Buyer/OrderSuccessScreen";
import ShopsScreen from "../screens/Buyer/ShopsScreen";
import FavoritesScreen from "../screens/Buyer/FavoritesScreen";
import AllProductsScreen from "../screens/Buyer/AllProductsScreen";

// Import missing profile screens
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import MyOrdersScreen from "../screens/profile/MyOrdersScreen";
import ShippingAddressScreen from "../screens/profile/ShippingAddressScreen";
import PaymentMethodsScreen from "../screens/profile/PaymentMethodsScreen";
import HelpCenterScreen from "../screens/profile/HelpCenterScreen";
import TermsPrivacyScreen from "../screens/profile/TermsPrivacyScreen";
import SellerRegisterScreen from "../screens/profile/SellerRegisterScreen";
import { COLORS, FONTS } from "../constants/theme";
import MessagesScreen from '../screens/common/MessagesScreen';
import ChatDetailScreen from '../screens/common/ChatDetailScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigators for each tab
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrowseProducts" component={BrowseProductsScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="AllProducts" component={AllProductsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

const CartStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    </Stack.Navigator>
  );
};

const OrdersStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
};

const ShopsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopsList" component={ShopsScreen} />
      <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
      <Stack.Screen name="BrowseProducts" component={BrowseProductsScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      <Stack.Screen name="ShippingAddress" component={ShippingAddressScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
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

// Main tab navigator
const BuyerNavigator = () => {
  const { totalItems } = useCartStore();
  const { user } = useAuthStore();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "ShopsTab") {
            iconName = focused ? "storefront" : "storefront-outline";
          } else if (route.name === "CartTab") {
            iconName = focused ? "cart" : "cart-outline";
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                {totalItems > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -10,
                      backgroundColor: "#FF6B6B",
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        // fontWeight: "600",
                        fontFamily: FONTS.semiBold,
                      }}
                    >
                      {totalItems}
                    </Text>
                  </View>
                )}
              </View>
            );
          } else if (route.name === "OrdersTab") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "ProfileTab") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Messages") {
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
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: "Browse" }}
      />
      <Tab.Screen
        name="Shops"
        component={ShopsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" color={color} size={size} />
          ),
        }}
      />
      {user && (
        <>
          <Tab.Screen
            name="CartTab"
            component={CartStack}
            options={{ tabBarLabel: "Cart" }}
          />
          <Tab.Screen
            name="OrdersTab"
            component={OrdersStack}
            options={{ tabBarLabel: "Orders" }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" color={color} size={size} />
              ),
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};

export default BuyerNavigator;

