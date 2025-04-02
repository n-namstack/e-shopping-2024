import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/ui/EmptyState';
import useAuthStore from '../../store/authStore';

const ShopDetailsScreen = ({ route, navigation }) => {
  const { shopId } = route.params || {};
  const { user } = useAuthStore();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Fetch shop details and products
  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    
    fetchShopDetails();
    if (user) {
      checkFollowStatus();
    }
  }, [shopId, user]);
  
  // Check if the user is following this shop
  const checkFollowStatus = async () => {
    if (!user || !shopId) return;
    
    try {
      const { data, error } = await supabase
        .from('shop_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking follow status:', error);
        return;
      }
      
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error.message);
    }
  };
  
  // Toggle follow/unfollow shop
  const toggleFollow = async () => {
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
      setFollowLoading(true);
      
      if (isFollowing) {
        // Unfollow shop
        const { error } = await supabase
          .from('shop_follows')
          .delete()
          .match({ user_id: user.id, shop_id: shopId });
          
        if (error) throw error;
        
        setIsFollowing(false);
      } else {
        // Follow shop
        const { error } = await supabase
          .from('shop_follows')
          .insert({ user_id: user.id, shop_id: shopId });
          
        if (error) throw error;
        
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error.message);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Fetch shop details and products
  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch shop details
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      
      if (shopError) throw shopError;
      
      // Fetch shop products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      
      setShop(shopData);
      setProducts(productsData || []);
      
      // Extract unique categories from products
      if (productsData && productsData.length > 0) {
        const uniqueCategories = [...new Set(productsData.map(product => product.category))]
          .filter(category => category) // Remove null/undefined
          .sort();
          
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching shop details:', error.message);
      Alert.alert('Error', 'Failed to load shop details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle refreshing
  const handleRefresh = () => {
    setRefreshing(true);
    fetchShopDetails();
  };
  
  // Filter products by category
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory);
  
  // Navigate to product details
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetails', { product });
  };
  
  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Error state - shop not found
  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Shop Not Found"
          message="The shop you are looking for does not exist or has been removed."
          actionLabel="Go Back"
          onAction={handleGoBack}
          iconColor="#FF3B30"
        />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{shop.name}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* Shop banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={
              shop.banner_url
                ? { uri: shop.banner_url }
                : require('../../../assets/logo-placeholder.png')
            }
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>
        
        {/* Shop info */}
        <View style={styles.shopInfoContainer}>
          <View style={styles.shopLogoContainer}>
            <Image
              source={
                shop.logo_url
                  ? { uri: shop.logo_url }
                  : require('../../../assets/logo-placeholder.png')
              }
              style={styles.shopLogo}
            />
          </View>
          
          <View style={styles.shopDetails}>
            <Text style={styles.shopName}>{shop.name}</Text>
            
            {/* Follow Button */}
            <TouchableOpacity 
              style={[
                styles.followButton, 
                isFollowing ? styles.followingButton : {}
              ]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? "#fff" : "#007AFF"} />
              ) : (
                <>
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
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.shopDescription}>{shop.description}</Text>
            
            {/* Shop stats */}
            <View style={styles.shopStats}>
              <View style={styles.statItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.statText}>{shop.location || 'Namibia'}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="bag-outline" size={16} color="#666" />
                <Text style={styles.statText}>{products.length} Products</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Product categories */}
        {categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === 'all' && styles.selectedCategoryChip
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === 'all' && styles.selectedCategoryText
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.selectedCategoryChip
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category && styles.selectedCategoryText
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Shop products */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Products</Text>
          
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProductsContainer}>
              <Ionicons name="basket-outline" size={64} color="#CCC" />
              <Text style={styles.emptyProductsText}>
                {selectedCategory === 'all'
                  ? 'This shop has no products yet.'
                  : `No products found in "${selectedCategory}" category.`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => (
                <ProductCard 
                  product={item} 
                  onPress={() => handleProductPress(item)}
                  style={styles.productCard}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.productRow}
            />
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.browseAllButton}
        onPress={() => navigation.navigate('BrowseProducts', { 
          shopId: shop.id,
          shopName: shop.name 
        })}
      >
        <Text style={styles.browseAllButtonText}>Browse All Products</Text>
        <Ionicons name="arrow-forward" size={20} color="#007AFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bannerContainer: {
    width: '100%',
    height: 150,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  shopInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shopLogoContainer: {
    marginRight: 16,
  },
  shopLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
    marginTop: -30,
    backgroundColor: '#fff',
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  shopStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  selectedCategoryChip: {
    backgroundColor: '#e6f2ff',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  productsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyProductsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignSelf: 'flex-start',
    marginVertical: 8,
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
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  browseAllButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 4,
  },
});

export default ShopDetailsScreen; 