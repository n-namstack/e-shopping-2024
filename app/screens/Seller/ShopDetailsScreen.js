import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

const ShopDetailsScreen = ({ navigation, route }) => {
  const { shopId } = route.params;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop] = useState(null);
  const [stats, setStats] = useState({
    productCount: 0,
    orderCount: 0,
    pendingOrders: 0,
    totalSales: 0,
  });
  
  useEffect(() => {
    fetchShopDetails();
  }, []);
  
  const fetchShopDetails = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
        return;
      }
      
      setShop(data);
      
      // Fetch shop statistics
      await fetchShopStatistics(shopId);
    } catch (error) {
      console.error('Error fetching shop details:', error.message);
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const fetchShopStatistics = async (id) => {
    try {
      // Fetch product count
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('count')
        .eq('shop_id', id);
      
      if (productError) throw productError;
      
      // Fetch order count
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('count')
        .eq('shop_id', id);
      
      if (orderError) throw orderError;
      
      // Fetch pending orders count
      const { data: pendingOrderData, error: pendingOrderError } = await supabase
        .from('orders')
        .select('count')
        .eq('shop_id', id)
        .in('status', ['pending', 'processing']);
      
      if (pendingOrderError) throw pendingOrderError;
      
      // Fetch total sales
      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('shop_id', id)
        .eq('status', 'delivered');
      
      if (salesError) throw salesError;
      
      const totalSales = salesData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      setStats({
        productCount: productData[0]?.count || 0,
        orderCount: orderData[0]?.count || 0,
        pendingOrders: pendingOrderData[0]?.count || 0,
        totalSales,
      });
    } catch (error) {
      console.error('Error fetching shop statistics:', error.message);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchShopDetails();
  };
  
  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload images.'
      );
      return false;
    }
    return true;
  };
  
  const handleSelectImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload the image to storage
        const selectedImage = result.assets[0];
        await uploadImage(selectedImage, type);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const uploadImage = async (uri, type) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop();
      const fileName = `${shopId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `shops/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('shop-images')
        .upload(filePath, blob);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('shop-images')
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;
      
      // Update shop with the new image URL
      const updateData = type === 'logo' 
        ? { logo_url: imageUrl } 
        : { banner_url: imageUrl };
      
      const { error: updateError } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setShop(prev => ({ ...prev, ...updateData }));
      
      Alert.alert('Success', `Shop ${type} updated successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to update shop ${type}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerification = () => {
    navigation.navigate('Verification', { shopId });
  };
  
  const handleEditShop = () => {
    // Navigate to edit shop screen
    // This would be implemented in a future update
    Alert.alert('Coming Soon', 'Shop editing will be available in the next update');
  };
  
  const formatCurrency = (amount) => {
    return 'N$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Details</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditShop}
        >
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Shop Banner */}
        <View style={styles.bannerContainer}>
          {shop.banner_url ? (
            <Image source={{ uri: shop.banner_url }} style={styles.banner} />
          ) : (
            <View style={[styles.banner, styles.bannerPlaceholder]}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
              <Text style={styles.placeholderText}>No banner image</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.changeBannerButton}
            onPress={() => handleSelectImage('banner')}
          >
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={styles.changeBannerText}>
              {shop.banner_url ? 'Change Banner' : 'Add Banner'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            {shop.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={styles.logoPlaceholderText}>
                  {shop.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.changeLogoButton}
              onPress={() => handleSelectImage('logo')}
            >
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Shop Information */}
        <View style={styles.shopInfoContainer}>
          <View style={styles.shopNameRow}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View 
              style={[
                styles.verificationBadge, 
                { 
                  backgroundColor: shop.is_verified 
                    ? '#4CAF5020' 
                    : '#FF980020' 
                }
              ]}
            >
              {shop.is_verified ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={[styles.verificationText, { color: '#4CAF50' }]}>Verified</Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={16} color="#FF9800" />
                  <Text style={[styles.verificationText, { color: '#FF9800' }]}>
                    {shop.verification_status === 'pending' ? 'Pending' : 'Unverified'}
                  </Text>
                </>
              )}
            </View>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.locationText}>{shop.location}</Text>
          </View>
          
          <Text style={styles.shopDescription}>
            {shop.description || 'No description provided'}
          </Text>
          
          {!shop.is_verified && shop.verification_status !== 'pending' && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerification}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
              <Text style={styles.verifyButtonText}>Verify Your Shop</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Shop Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Shop Performance</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.productCount}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.orderCount}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.pendingOrders}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(stats.totalSales)}</Text>
              <Text style={styles.statLabel}>Sales</Text>
            </View>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionButtonsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddProduct', { shopId: shop.id })}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="add-circle-outline" size={24} color="#2196F3" />
              </View>
              <Text style={styles.actionText}>Add Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Products')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="list-outline" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.actionText}>Manage Products</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Orders')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="cart-outline" size={24} color="#FFC107" />
              </View>
              <Text style={styles.actionText}>View Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleEditShop}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="settings-outline" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.actionText}>Shop Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Contact Information */}
        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.contactText}>{shop.contact_email}</Text>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.contactText}>{shop.contact_phone}</Text>
          </View>
          
          {shop.website && (
            <View style={styles.contactItem}>
              <Ionicons name="globe-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{shop.website}</Text>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  bannerContainer: {
    position: 'relative',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  changeBannerButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeBannerText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 5,
  },
  logoContainer: {
    position: 'absolute',
    bottom: -50,
    left: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  logoPlaceholder: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#666',
  },
  changeLogoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  shopInfoContainer: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  shopNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  contactContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 30,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
});

export default ShopDetailsScreen; 