import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, refreshSession } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchProfileAndShopInfo();
  }, []);

  const fetchProfileAndShopInfo = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);
      
      // If user is a seller, fetch shop data
      if (profileData.role === 'seller') {
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .single();
        
        if (!shopError) {
          setShopInfo(shopData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile and shop info:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error.message);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchToBuyer = async () => {
    Alert.alert(
      'Switch to Buyer',
      'Are you sure you want to switch to Buyer mode?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              setIsLoading(true);
              // Update the user's role to buyer in the profiles table
              const { error } = await supabase
                .from('profiles')
                .update({ role: 'buyer' })
                .eq('id', user.id);
              
              if (error) throw error;
              
              // Update the user metadata as well
              const { error: metadataError } = await supabase.auth.updateUser({
                data: { role: 'buyer' }
              });
              
              if (metadataError) throw metadataError;
              
              // Refresh session to get updated user data
              await refreshSession();
              
              // Alert user of success
              Alert.alert('Success', 'You are now in Buyer mode', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to the BuyerNavigator
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Auth' }]
                    });
                  }
                }
              ]);
            } catch (error) {
              console.error('Error switching to buyer:', error.message);
              Alert.alert('Error', 'Failed to switch to Buyer mode');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchToSeller = async () => {
    // Check if the user already has a seller profile
    try {
      const { data: existingShop, error: shopCheckError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id);
      
      if (shopCheckError) throw shopCheckError;
      
      if (existingShop && existingShop.length > 0) {
        // User already has a shop, just switch roles
        switchToSellerRole();
      } else {
        // User needs to create a shop first
        navigation.navigate('ProfileTab', { screen: 'SellerRegister' });
      }
    } catch (error) {
      console.error('Error checking shop existence:', error.message);
      Alert.alert('Error', 'Failed to check seller status');
    }
  };

  const switchToSellerRole = async () => {
    try {
      setIsLoading(true);
      // Update the user's role to seller in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'seller' })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update the user metadata as well
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role: 'seller' }
      });
      
      if (metadataError) throw metadataError;
      
      // Refresh session to get updated user data
      await refreshSession();
      
      // Alert user of success
      Alert.alert('Success', 'You are now in Seller mode', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to the SellerNavigator
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }]
            });
          }
        }
      ]);
    } catch (error) {
      console.error('Error switching to seller:', error.message);
      Alert.alert('Error', 'Failed to switch to Seller mode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('ProfileTab', { screen: 'EditProfile' });
  };

  const handleMyOrders = () => {
    // For both buyer and seller, navigate to their respective Orders screen
    if (profile?.role === 'seller') {
      navigation.navigate('OrdersTab', { screen: 'Orders' });
    } else {
      navigation.navigate('OrdersTab', { screen: 'Orders' });
    }
  };

  const handleShippingAddress = () => {
    navigation.navigate('ProfileTab', { screen: 'ShippingAddress' });
  };

  const handlePaymentMethods = () => {
    navigation.navigate('ProfileTab', { screen: 'PaymentMethods' });
  };

  const renderSettingItem = ({ icon, title, value, onPress, isSwitch = false }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#0f172a" />
        <Text style={styles.settingText}>{title}</Text>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={value ? '#0f172a' : '#f3f4f6'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={24} color="#64748b" />
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {profile?.role === 'seller' ? 'Seller Profile' : 'Profile'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userInfoSection}>
          <View style={styles.profileImageContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.defaultProfileImage]}>
                <Text style={styles.defaultProfileImageText}>
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || (profile?.role === 'seller' ? 'S' : 'U')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{profile?.full_name || profile?.firstname + ' ' + profile?.lastname || 'User'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {shopInfo && profile?.role === 'seller' && (
              <View style={styles.shopBadge}>
                <Ionicons name="storefront" size={14} color="#fff" />
                <Text style={styles.shopName}>{shopInfo.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Common Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderSettingItem({
            icon: 'person-circle-outline',
            title: 'Personal Information',
            onPress: handleEditProfile,
          })}
          {renderSettingItem({
            icon: 'cart-outline',
            title: 'My Orders',
            onPress: handleMyOrders,
          })}
          {renderSettingItem({
            icon: 'location-outline',
            title: 'Shipping Address',
            onPress: handleShippingAddress,
          })}
          {renderSettingItem({
            icon: 'card-outline',
            title: 'Payment Methods',
            onPress: handlePaymentMethods,
          })}
        </View>

        {/* Role Switching Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Type</Text>
          {profile?.role === 'buyer' ? (
            renderSettingItem({
              icon: 'storefront-outline',
              title: 'Become a Seller',
              onPress: handleSwitchToSeller,
            })
          ) : (
            renderSettingItem({
              icon: 'person-outline',
              title: 'Switch to Buyer Mode',
              onPress: handleSwitchToBuyer,
            })
          )}
        </View>

        {/* Seller-Specific Section */}
        {profile?.role === 'seller' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Management</Text>
            {renderSettingItem({
              icon: 'storefront-outline',
              title: 'Manage Shop',
              onPress: () => navigation.navigate('ShopsTab', { screen: 'ShopDetails' }),
            })}
            {renderSettingItem({
              icon: 'cube-outline',
              title: 'Products',
              onPress: () => navigation.navigate('ProductsTab', { screen: 'Products' }),
            })}
            {renderSettingItem({
              icon: 'list-outline',
              title: 'Orders',
              onPress: () => navigation.navigate('OrdersTab', { screen: 'Orders' }),
            })}
            {renderSettingItem({
              icon: 'card-outline',
              title: 'Bank Details',
              onPress: () => navigation.navigate('ProfileTab', { screen: 'BankDetails' }),
            })}
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {renderSettingItem({
            icon: 'notifications-outline',
            title: 'Notifications',
            value: notificationsEnabled,
            onPress: () => setNotificationsEnabled(!notificationsEnabled),
            isSwitch: true,
          })}
          {renderSettingItem({
            icon: 'moon-outline',
            title: 'Dark Mode',
            value: darkMode,
            onPress: () => setDarkMode(!darkMode),
            isSwitch: true,
          })}
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {renderSettingItem({
            icon: 'help-circle-outline',
            title: 'Help Center',
            onPress: () => navigation.navigate('ProfileTab', { screen: 'HelpCenter' }),
          })}
          {renderSettingItem({
            icon: 'document-text-outline',
            title: 'Terms & Privacy Policy',
            onPress: () => navigation.navigate('ProfileTab', { screen: 'TermsPrivacy' }),
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  userInfoSection: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
  },
  defaultProfileImage: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileImageText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  shopName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#0f172a',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    marginBottom: 15,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 30,
  },
});

export default ProfileScreen; 