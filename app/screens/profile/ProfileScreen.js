import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout: authLogout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Debug: Log the user object to see what fields are available
  useEffect(() => {
    console.log('User data in ProfileScreen:', user);
  }, [user]);

  // Helper function to get user display name
  const getUserName = () => {
    if (!user) return 'User';
    return user.name || user.fullName || user.username || user.email || 'User';
  };

  // Helper function to get user email
  const getUserEmail = () => {
    if (!user) return 'email@example.com';
    return user.email || '';
  };

  const handleLogout = async () => {
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
          style: 'destructive',
          onPress: async () => {
            try {
              await authLogout();
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
    navigation.navigate('EditProfile');
  };

  const handleCreateShop = () => {
    navigation.navigate('SellerRegister');
  };

  const handleMyOrders = () => {
    navigation.navigate('MyOrders');
  };

  const handleShippingAddress = () => {
    navigation.navigate('ShippingAddress');
  };

  const handlePaymentMethods = () => {
    navigation.navigate('PaymentMethods');
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{ uri: `https://ui-avatars.com/api/?name=${getUserName().replace(/\s+/g, '+')}&background=f1f5f9&color=94a3b8&size=200` }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{getUserName()}</Text>
          <Text style={styles.email}>{getUserEmail()}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

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
        {(user?.role !== 'seller') && renderSettingItem({
          icon: 'storefront-outline',
          title: 'Create Shop',
          onPress: handleCreateShop,
        })}
      </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        {renderSettingItem({
          icon: 'help-circle-outline',
          title: 'Help Center',
          onPress: () => navigation.navigate('HelpCenter'),
        })}
        {renderSettingItem({
          icon: 'document-text-outline',
          title: 'Terms & Privacy Policy',
          onPress: () => navigation.navigate('TermsPrivacy'),
        })}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profileSection: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
  },
  profileInfo: {
    marginLeft: 20,
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
  editButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  },
});

export default ProfileScreen; 