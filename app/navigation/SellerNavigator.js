import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Import screens
import DashboardScreen from '../screens/Seller/DashboardScreen';
import ProductsScreen from '../screens/Seller/ProductsScreen';
import AddProductScreen from '../screens/Seller/AddProductScreen';
import EditProductScreen from '../screens/Seller/EditProductScreen';
import OrdersScreen from '../screens/Seller/OrdersScreen';
import OrderDetailsScreen from '../screens/Seller/OrderDetailsScreen';
import ProfileScreen from '../screens/Seller/ProfileScreen';
import ShopsScreen from '../screens/Seller/ShopsScreen';
import ShopDetailsScreen from '../screens/Seller/ShopDetailsScreen';
import CreateShopScreen from '../screens/Seller/CreateShopScreen';
import VerificationScreen from '../screens/Seller/VerificationScreen';
import AnalyticsScreen from '../screens/Seller/AnalyticsScreen';

// Import missing profile screens
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ShippingAddressScreen from '../screens/profile/ShippingAddressScreen';
import PaymentMethodsScreen from '../screens/profile/PaymentMethodsScreen';
import HelpCenterScreen from '../screens/profile/HelpCenterScreen';
import TermsPrivacyScreen from '../screens/profile/TermsPrivacyScreen';
import SellerRegisterScreen from '../screens/profile/SellerRegisterScreen';

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
    </Stack.Navigator>
  );
};

// Main tab navigator
const SellerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'DashboardTab') {
            iconName = focused ? 'dashboard' : 'dashboard-outline';
            return <MaterialIcons name="dashboard" size={size} color={color} />;
          } else if (route.name === 'ProductsTab') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'OrdersTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ShopsTab') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardStack} 
        options={{ tabBarLabel: 'Dashboard' }} 
      />
      <Tab.Screen 
        name="ProductsTab" 
        component={ProductsStack} 
        options={{ tabBarLabel: 'Products' }} 
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStack} 
        options={{ tabBarLabel: 'Orders' }} 
      />
      <Tab.Screen 
        name="ShopsTab" 
        component={ShopsStack} 
        options={{ tabBarLabel: 'Shops' }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack} 
        options={{ tabBarLabel: 'Profile' }} 
      />
    </Tab.Navigator>
  );
};

export default SellerNavigator; 