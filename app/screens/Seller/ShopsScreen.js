import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const ShopsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredShops, setFilteredShops] = useState([]);

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [shops, searchQuery]);

  const filterShops = () => {
    let filtered = [...shops];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(shop => 
        shop.name.toLowerCase().includes(query) || 
        shop.description?.toLowerCase().includes(query) ||
        shop.location?.toLowerCase().includes(query)
      );
    }
    
    setFilteredShops(filtered);
  };

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          products:products(count),
          orders:orders(count)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setShops(data || []);
      setFilteredShops(data || []);
    } catch (error) {
      console.error('Error fetching shops:', error.message);
      Alert.alert('Error', 'Failed to load shops');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  const handleVerification = async (shopId) => {
    try {
      // Navigate to verification screen
      navigation.navigate('Verification', { shopId });
    } catch (error) {
      console.error('Error navigating to verification:', error.message);
      Alert.alert('Error', 'Failed to proceed with verification');
    }
  };

  const handleCreateShop = () => {
    navigation.navigate('CreateShop');
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const renderShopItem = ({ item }) => {
    const productCount = item.products?.[0]?.count || 0;
    const orderCount = item.orders?.[0]?.count || 0;
    
    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => navigation.navigate('ShopDetails', { shopId: item.id })}
      >
        <View style={styles.shopHeader}>
          {item.banner_url ? (
            <Image source={{ uri: item.banner_url }} style={styles.banner} />
          ) : (
            <View style={[styles.banner, styles.bannerPlaceholder]}>
              <Ionicons name="storefront-outline" size={40} color="#ccc" />
            </View>
          )}
          
          <View style={styles.logoContainer}>
            {item.logo_url ? (
              <Image source={{ uri: item.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={styles.logoPlaceholderText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.shopContent}>
          <View style={styles.shopNameRow}>
            <Text style={styles.shopName}>{item.name}</Text>
            <View 
              style={[
                styles.verificationBadge, 
                { 
                  backgroundColor: item.verification_status === 'verified'
                    ? '#4CAF5020' 
                    : '#FF980020' 
                }
              ]}
            >
              {item.verification_status === 'verified' ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={[styles.verificationText, { color: '#4CAF50' }]}>Verified</Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={16} color="#FF9800" />
                  <Text style={[styles.verificationText, { color: '#FF9800' }]}>
                    {item.verification_status === 'pending' ? 'Pending' : 'Unverified'}
                  </Text>
                </>
              )}
            </View>
          </View>
          
          <Text style={styles.shopDescription} numberOfLines={2}>
            {item.description || 'No description provided'}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <Text style={styles.statText}>{productCount} Products</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={16} color="#666" />
              <Text style={styles.statText}>{orderCount} Orders</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.shopFooter}>
          {item.verification_status !== 'verified' && item.verification_status !== 'pending' && (
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={() => handleVerification(item.id)}
            >
              <Text style={styles.verifyButtonText}>Verify Shop</Text>
            </TouchableOpacity>
          )}
          
          {item.verification_status === 'pending' && (
            <Text style={styles.pendingText}>
              Verification in progress...
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyShops = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No Shops Yet</Text>
      <Text style={styles.emptyText}>
        {searchQuery.trim() ? 
          `No shops match "${searchQuery}"` : 
          'Start your business by creating your first shop'
        }
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity 
          style={styles.createShopButton}
          onPress={handleCreateShop}
        >
          <Text style={styles.createShopButtonText}>Create Shop</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar and Create Button */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your shops..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {shops.length > 0 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateShop}
          >
            <Ionicons name="add" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={filteredShops}
        renderItem={renderShopItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={filteredShops.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={renderEmptyShops}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...SHADOWS.small,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(65, 105, 225, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createShopButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  createShopButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  shopCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  shopHeader: {
    position: 'relative',
    height: 100,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -30,
    left: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },
  logoPlaceholder: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
  shopContent: {
    padding: 15,
    paddingTop: 35,
  },
  shopNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  shopFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 15,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  pendingText: {
    fontSize: 14,
    color: '#FF9800',
    fontStyle: 'italic',
  },
});

export default ShopsScreen; 