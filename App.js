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
  ShopDetail,
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
// const SERVER_URL = `http://192.168.178.24:3000/api`;
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
    <View style={styles.navBarContainer}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => handleNavigate('Home', 'Home')}
          style={[
            styles.navItem,
            currentScreen === 'Home' && styles.activeNavItem
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="home"
              size={24}
              style={[
                styles.navIcon,
                currentScreen === 'Home' && styles.activeNavIcon
              ]}
            />
            {currentScreen === 'Home' && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text
            style={[
              styles.navBarText,
              currentScreen === 'Home' && styles.activeNavText
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>
        
        {/* Show Shops tab for all users */}
        <TouchableOpacity
          style={[
            styles.navItem,
            currentScreen === 'Shops' && styles.activeNavItem
          ]}
          onPress={() => handleNavigate('Shops', 'ShopPublic')}
        >
          <View style={styles.iconContainer}>
            <Entypo
              name="shop"
              size={24}
              style={[
                styles.navIcon,
                currentScreen === 'Shops' && styles.activeNavIcon
              ]}
            />
            {currentScreen === 'Shops' && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text
            style={[
              styles.navBarText,
              currentScreen === 'Shops' && styles.activeNavText
            ]}
          >
            Shops
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            currentScreen === 'Cart' && styles.activeNavItem
          ]}
          onPress={() => handleNavigate('Cart', 'Cart')}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="cart"
              size={24}
              style={[
                styles.navIcon,
                currentScreen === 'Cart' && styles.activeNavIcon
              ]}
            />
            {currentScreen === 'Cart' && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text
            style={[
              styles.navBarText,
              currentScreen === 'Cart' && styles.activeNavText
            ]}
          >
            Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            currentScreen === 'Profile' && styles.activeNavItem
          ]}
          onPress={() => handleNavigate('Profile', 'Profile')}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="person"
              size={24}
              style={[
                styles.navIcon,
                currentScreen === 'Profile' && styles.activeNavIcon
              ]}
            />
            {currentScreen === 'Profile' && (
              <View style={styles.activeDot} />
            )}
          </View>
          <Text
            style={[
              styles.navBarText,
              currentScreen === 'Profile' && styles.activeNavText
            ]}
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
    <View style={styles.container}>
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
            <Stack.Screen name="ShopDetail" component={ShopDetail} />
            
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
        <>
          {/* Extra bottom space to prevent content from being hidden behind nav bar */}
          <View style={styles.navBarSpacer} />
          
          <NavBar
            currentScreen={currentScreen}
            setCurrentScreen={setCurrentScreen}
          />
        </>
      )}
    </View>
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
  navBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 5, // Extra padding for iOS devices with home indicator
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 16,
  },
  divider: {
    height: '100%',
    width: 1,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  navIcon: {
    fontSize: 24,
    color: '#64748b', // Lighter color for inactive icons
    opacity: 0.8,
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 187, 0, 0.1)', // Semi-transparent gold for active item background
  },
  activeNavIcon: {
    color: COLORS.gold,
    opacity: 1,
    transform: [{ scale: 1.1 }], // Slightly larger active icon
  },
  navBarText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  activeNavText: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.gold,
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
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
  navBarSpacer: {
    height: 70, // Height of the bottom navigation bar plus a bit extra
    width: '100%',
  },
});
