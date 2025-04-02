import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [followedShopIds, setFollowedShopIds] = useState([]);

  useEffect(() => {
    fetchShops();
    if (user) {
      fetchFollowedShops();
    }
  }, [user]);

  useEffect(() => {
    filterShops();
  }, [shops, searchQuery, activeFilter, verificationFilter, followedShopIds]);

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          products:products(count),
          owner:profiles(username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setShops(data || []);
    } catch (error) {
      console.error('Error fetching shops:', error.message);
      Alert.alert('Error', 'Failed to load shops');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFollowedShops = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_follows')
        .select('shop_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setFollowedShopIds(data.map(item => item.shop_id));
    } catch (error) {
      console.error('Error fetching followed shops:', error.message);
    }
  };

  const filterShops = () => {
    let result = [...shops];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(shop => 
        shop.name.toLowerCase().includes(query) || 
        shop.description?.toLowerCase().includes(query) ||
        shop.location?.toLowerCase().includes(query)
      );
    }
    
    // Apply verification filter
    if (verificationFilter === 'verified') {
      result = result.filter(shop => shop.verification_status === 'verified');
    } else if (verificationFilter === 'unverified') {
      result = result.filter(shop => shop.verification_status !== 'verified');
    }
    
    // Apply category filter
    if (activeFilter === 'following' && user) {
      result = result.filter(shop => followedShopIds.includes(shop.id));
    }
    
    setFilteredShops(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
    if (user) {
      fetchFollowedShops();
    }
  };

  const toggleFollow = async (shopId) => {
    if (!user) {
      Alert.alert(
        'Sign in Required',
        'Please sign in to follow shops',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }

    try {
      if (followedShopIds.includes(shopId)) {
        // Unfollow the shop
        const { error } = await supabase
          .from('shop_follows')
          .delete()
          .match({ user_id: user.id, shop_id: shopId });

        if (error) throw error;
        
        setFollowedShopIds(followedShopIds.filter(id => id !== shopId));
        Alert.alert('Success', 'Shop unfollowed');
      } else {
        // Follow the shop
        const { error } = await supabase
          .from('shop_follows')
          .insert({ user_id: user.id, shop_id: shopId });

        if (error) throw error;
        
        setFollowedShopIds([...followedShopIds, shopId]);
        Alert.alert('Success', 'Shop followed');
      }
    } catch (error) {
      console.error('Error toggling follow:', error.message);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const renderShopItem = ({ item }) => {
    const isFollowing = followedShopIds.includes(item.id);
    const productCount = item.products?.[0]?.count || 0;
    const ownerUsername = item.owner?.[0]?.username || 'Unknown Seller';
    
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
          
          {/* Verification Badge */}
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
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={[styles.verificationText, { color: '#4CAF50' }]}>Verified</Text>
              </>
            ) : (
              <>
                <Ionicons name="time-outline" size={14} color="#FF9800" />
                <Text style={[styles.verificationText, { color: '#FF9800' }]}>
                  {item.verification_status === 'pending' ? 'Pending' : 'Unverified'}
                </Text>
              </>
            )}
          </View>
        </View>
        
        <View style={styles.shopContent}>
          <View style={styles.shopNameRow}>
            <Text style={styles.shopName}>{item.name}</Text>
            <TouchableOpacity 
              style={[
                styles.followButton, 
                isFollowing ? styles.followingButton : {}
              ]}
              onPress={() => toggleFollow(item.id)}
            >
              <Ionicons 
                name={isFollowing ? "heart" : "heart-outline"} 
                size={16} 
                color={isFollowing ? "#fff" : "#007AFF"} 
              />
              <Text 
                style={[
                  styles.followButtonText,
                  isFollowing ? styles.followingButtonText : {}
                ]}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.shopOwner}>by {ownerUsername}</Text>
          
          {item.description && (
            <Text style={styles.shopDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.shopStats}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <Text style={styles.statText}>{productCount} Products</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.location || 'Location not specified'}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.viewProductsButton}
          onPress={() => navigation.navigate('BrowseProducts', { shopId: item.id, shopName: item.name })}
        >
          <Text style={styles.viewProductsButtonText}>View Products</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="storefront-outline" size={60} color="#ccc" />
        <Text style={styles.emptyTitle}>No Shops Found</Text>
        <Text style={styles.emptyText}>
          {searchQuery.trim() ? 
            `No shops match "${searchQuery}"` : 
            'Try adjusting your filters or search'
          }
        </Text>
      </View>
    );
  };

  if (isLoading) {
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
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops..."
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
      </View>

      {/* Filter Options */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === 'all' && styles.activeFilterChip
          ]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[
            styles.filterText,
            activeFilter === 'all' && styles.activeFilterText
          ]}>All Shops</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === 'following' && styles.activeFilterChip
          ]}
          onPress={() => setActiveFilter('following')}
        >
          <Text style={[
            styles.filterText,
            activeFilter === 'following' && styles.activeFilterText
          ]}>Following</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            verificationFilter === 'verified' && styles.activeFilterChip
          ]}
          onPress={() => {
            setVerificationFilter(
              verificationFilter === 'verified' ? 'all' : 'verified'
            );
          }}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={14} 
            color={verificationFilter === 'verified' ? COLORS.accent : '#666'} 
            style={styles.filterIcon}
          />
          <Text style={[
            styles.filterText,
            verificationFilter === 'verified' && styles.activeFilterText
          ]}>Verified</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredShops}
        renderItem={renderShopItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={filteredShops.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...SHADOWS.small,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  activeFilterChip: {
    backgroundColor: 'rgba(65, 105, 225, 0.1)',
    borderColor: COLORS.accent,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: COLORS.accent,
    fontWeight: '500',
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
  shopCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  shopHeader: {
    position: 'relative',
    height: 120,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -30,
    left: 16,
    padding: 2,
    backgroundColor: '#fff',
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  logoPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  shopContent: {
    padding: 16,
    paddingTop: 36,
  },
  shopNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followingButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  followButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#007AFF',
  },
  followingButtonText: {
    color: '#fff',
  },
  shopOwner: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  shopStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  viewProductsButton: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  viewProductsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  verificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ShopsScreen; 