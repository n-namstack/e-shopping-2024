import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, NetInfo, Platform } from 'react-native';
import { ToastProvider, useToast } from 'react-native-toast-notifications';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, Entypo, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import {
  Home,
  Cart,
  ProductInfo,
  Shop,
  ShopInfo,
  ShopPublic,
  Profile,
  HomeScreen,
  EditProfileScreen,
  MyOrdersScreen,
  ShippingAddressScreen,
  PaymentMethodsScreen,
  HelpCenterScreen,
  TermsPrivacyScreen,
  OrderDetailsScreen,
  OrderTrackingScreen,
  SellerRegisterScreen,
} from './app/screens';

import AuthStack from './app/navigation/AuthStack';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import COLORS from './constants/colors';
import FONT_SIZE from './constants/fontSize';

// Import the mock mode flag from AuthContext
// This should match the USE_MOCK_API setting in AuthContext.js
const USE_MOCK_API = false;
// For Android emulator, use 10.0.2.2 to access your computer's localhost
// For iOS simulator or physical device on same network, use localhost
const SERVER_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:3000/api`;

const Stack = createNativeStackNavigator();

const NavBar = ({ currentScreen, setCurrentScreen }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // Check if user is a seller
  const isSeller = user && user.role === 'seller';

  const handleNavigate = (screenName, route) => {
    setCurrentScreen(screenName);
    navigation.navigate(route);
  };

  return (
    <View>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => handleNavigate('Home', 'Home')}
          style={{ alignItems: 'center' }}
        >
          <Ionicons
            name="home"
            size={24}
            style={currentScreen === 'Home' ? styles.activeTab : styles.tab}
          />
          <Text
            style={
              currentScreen === 'Home'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Home
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        
        {/* Only show Shops tab for sellers */}
        {isSeller ? (
          <>
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              onPress={() => handleNavigate('Shops', 'ShopPublic')}
            >
              <Entypo
                name="shop"
                style={currentScreen === 'Shops' ? styles.activeTab : styles.tab}
              />
              <Text
                style={
                  currentScreen === 'Shops'
                    ? styles.activeNavText
                    : styles.navBarText
                }
              >
                Shops
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        ) : null}

        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => handleNavigate('Cart', 'Cart')}
        >
          <Ionicons
            name="cart"
            style={currentScreen === 'Cart' ? styles.activeTab : styles.tab}
          />
          <Text
            style={
              currentScreen === 'Cart'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Cart
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => handleNavigate('Profile', 'Profile')}
        >
          <Ionicons
            name="person"
            size={24}
            style={currentScreen === 'Profile' ? styles.activeTab : styles.tab}
          />
          <Text
            style={
              currentScreen === 'Profile'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ConnectionErrorScreen = ({ retry }) => {
  return (
    <View style={styles.errorContainer}>
      <MaterialIcons name="wifi-off" size={80} color={COLORS.darkBlue} />
      <Text style={styles.errorTitle}>No Connection</Text>
      <Text style={styles.errorText}>
        Unable to connect to the server. Please check your internet connection and try again.
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={retry}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const SellerApprovalScreen = () => {
  const { logout, checkApprovalStatus } = useAuth();
  const [checking, setChecking] = useState(false);
  const toast = useToast();
  
  const checkStatus = async () => {
    setChecking(true);
    try {
      const isApproved = await checkApprovalStatus();
      if (isApproved) {
        toast.show('Your account has been approved!', {
          type: 'success',
          placement: 'top',
          duration: 3000,
        });
      } else {
        toast.show('Your account is still pending approval', {
          type: 'info',
          placement: 'top',
          duration: 3000,
        });
      }
    } catch (error) {
      toast.show('Failed to check approval status', {
        type: 'error',
        placement: 'top',
        duration: 3000,
      });
    } finally {
      setChecking(false);
    }
  };
  
  return (
    <View style={styles.approvalContainer}>
      <Ionicons name="time-outline" size={80} color={COLORS.darkBlue} />
      <Text style={styles.approvalTitle}>Account Pending Approval</Text>
      <Text style={styles.approvalText}>
        Your seller account is currently under review. This process may take up to 48 hours.
        We'll notify you once your account has been approved.
      </Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.checkButton}
          onPress={checkStatus}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Check Status</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Navigation = () => {
  const { user, loading, checkApprovalStatus } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [connectionError, setConnectionError] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Check connection to the server
    const checkServerConnection = async () => {
      // If using mock API, always return true
      if (USE_MOCK_API) {
        setConnectionError(false);
        return true;
      }
      
      try {
        const response = await fetch(`${SERVER_URL}/health`, {
          method: 'GET',
          timeout: 5000, // 5 second timeout
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        if (response.ok) {
          setConnectionError(false);
          return true;
        } else {
          setConnectionError(true);
          return false;
        }
      } catch (error) {
        console.error('Server connection error:', error);
        setConnectionError(true);
        return false;
      }
    };

    checkServerConnection();
    
    // Set up interval to check connection periodically (only if not using mock API)
    let connectionInterval;
    if (!USE_MOCK_API) {
      // Check less frequently to reduce error messages
      connectionInterval = setInterval(checkServerConnection, 300000); // Check every 5 minutes
    }
    
    return () => {
      if (connectionInterval) clearInterval(connectionInterval);
    };
  }, []);
  
  // Periodically check approval status for sellers
  useEffect(() => {
    if (user && user.role === 'seller' && !user.approved) {
      const statusCheck = setInterval(() => {
        checkApprovalStatus();
      }, 300000); // Check every 5 minutes
      
      return () => clearInterval(statusCheck);
    }
  }, [user, checkApprovalStatus]);

  useEffect(() => {
    // Show welcome message when user logs in or registers
    if (user && !loading) {
      // Log user data for debugging
      console.log('User data in App.js:', user);
      console.log('User fields available:', Object.keys(user));
      
      // Get the user's name for the welcome message using various potential field names
      const userName = user.name || user.fullName || user.username || user.email || 'User';
      console.log('Using name for welcome message:', userName);
      
      // Don't show toast for sellers with pending approval
      if (!(user.role === 'seller' && !user.approved)) {
        toast.show(`Welcome, ${userName}!`, {
          type: "success",
          placement: "top",
          duration: 3000,
        });
      }
    }
  }, [user, loading, toast]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.darkBlue} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  if (connectionError && user) {
    return (
      <ConnectionErrorScreen 
        retry={() => setConnectionError(false)} 
      />
    );
  }

  // Check if user is a seller with pending approval
  const isPendingApproval = user && user.role === 'seller' && !user.approved;

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth stack
          <Stack.Screen 
            name="Auth" 
            component={AuthStack}
            options={{ headerShown: false }}
          />
        ) : isPendingApproval ? (
          // Seller with pending approval
          <Stack.Screen name="SellerApproval" component={SellerApprovalScreen} />
        ) : (
          // Authenticated stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Shops" component={Shop} />
            <Stack.Screen name="Cart" component={Cart} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="ProductInfo" component={ProductInfo} />
            <Stack.Screen name="ShopInfo" component={ShopInfo} />
            <Stack.Screen name="ShopPublic" component={ShopPublic} />
            
            {/* Profile Related Screens */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
            <Stack.Screen name="ShippingAddress" component={ShippingAddressScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
            <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
          </>
        )}
      </Stack.Navigator>
      {user && !isPendingApproval && (
        <NavBar
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer>
          <Navigation />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.darkBlue,
  },
  screen: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: '100%',
    width: 1,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 10,
  },
  tab: {
    fontSize: 24,
    color: COLORS.darkBlue,
  },
  navBarText: {
    fontSize: FONT_SIZE.username,
  },
  activeNavText: {
    color: COLORS.gold,
    fontSize: FONT_SIZE.username,
  },
  activeTab: {
    color: COLORS.gold,
    fontWeight: 'bold',
    fontSize: 24,
  },
  approvalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  approvalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
    marginTop: 20,
    marginBottom: 10,
  },
  approvalText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
  },
  logoutButton: {
    backgroundColor: COLORS.darkBlue,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkBlue,
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: COLORS.darkBlue,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
