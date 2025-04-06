import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/ui/EmptyState';
import BannerCarousel from '../../components/ui/BannerCarousel';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

// Sort options
const SortOptions = {
  NEWEST: { label: 'Newest', value: 'newest' },
  PRICE_LOW: { label: 'Price: Low to High', value: 'price_low' },
  PRICE_HIGH: { label: 'Price: High to Low', value: 'price_high' },
  POPULARITY: { label: 'Popularity', value: 'popularity' },
};

// Filter options
const FilterOptions = {
  ALL: { label: 'All Products', value: 'all' },
  IN_STOCK: { label: 'In Stock', value: 'in_stock' },
  ON_SALE: { label: 'On Sale', value: 'on_sale' },
  ON_ORDER: { label: 'On Order', value: 'on_order' },
};

const BrowseProductsScreen = ({ navigation, route }) => {
  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  
  // Get shop filter from route params if available
  const { shopId, shopName } = route.params || {};
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [likedProducts, setLikedProducts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filtering and sorting states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState(FilterOptions.ALL.value);
  const [selectedSort, setSelectedSort] = useState(SortOptions.NEWEST.value);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  
  // Format price with commas
  const formatPrice = (price) => {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}mo ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}y ago`;
    }
  };
  
  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCartCount();
    fetchFeaturedProducts();
    fetchNotifications();
    if (user) {
      fetchLikedProducts();
    }
  }, [shopId, user]); // Refetch when shopId changes
  
  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          shop:shops(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      // Filter by shop if shopId is provided
      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process products to handle stock status correctly
      const processedData = data?.map(product => ({
        ...product,
        in_stock: product.is_on_order !== undefined ? !product.is_on_order : (product.stock_quantity > 0)
      })) || [];
      
      setProducts(processedData);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch product categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      if (data) {
        // Extract unique categories and add icons
        const uniqueCategories = [...new Set(data.map(item => item.category))]
          .filter(Boolean)
          .sort()
          .map(category => ({
            value: category,
            label: category,
            icon: getCategoryIcon(category)
          }));
          
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    }
  };
  
  // Fetch cart count
  const fetchCartCount = async () => {
    // Temporarily disabled until cart_items table is created
    setCartCount(0);
    return;
  };
  
  // Fetch featured products
  const fetchFeaturedProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          shop:shops(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process products to handle stock status correctly
      const processedData = data?.map(product => ({
        ...product,
        in_stock: product.is_on_order !== undefined ? !product.is_on_order : (product.stock_quantity > 0)
      })) || [];
      
      setFeaturedProducts(processedData);
    } catch (error) {
      console.error('Error fetching featured products:', error.message);
    }
  };
  
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
    }
  };
  
  // Fetch liked products
  const fetchLikedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_likes')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const likes = {};
      data.forEach(like => {
        likes[like.product_id] = true;
      });
      setLikedProducts(likes);
    } catch (error) {
      console.error('Error fetching liked products:', error);
    }
  };
  
  // Get icon for category
  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'electronics':
        return 'hardware-chip-outline';
      case 'clothing':
        return 'shirt-outline';
      case 'food':
        return 'restaurant-outline';
      case 'books':
        return 'book-outline';
      case 'home':
        return 'home-outline';
      case 'beauty':
        return 'sparkles-outline';
      case 'sports':
        return 'fitness-outline';
      case 'toys':
        return 'game-controller-outline';
      default:
        return 'grid-outline';
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };
  
  // Navigate to product details
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetails', { product });
  };
  
  // Navigate to shop details
  const handleShopPress = (shopId) => {
    navigation.navigate('ShopDetails', { shopId });
  };
  
  // Filter products based on selected options
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description?.toLowerCase().includes(query) ||
        product.shop?.name.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Apply filter option
    if (selectedFilter === FilterOptions.IN_STOCK.value) {
      filtered = filtered.filter(product => product.in_stock);
    } else if (selectedFilter === FilterOptions.ON_SALE.value) {
      filtered = filtered.filter(product => product.is_on_sale);
    } else if (selectedFilter === FilterOptions.ON_ORDER.value) {
      filtered = filtered.filter(product => !product.in_stock);
    }
    
    // Apply sorting
    if (selectedSort === SortOptions.PRICE_LOW.value) {
      filtered.sort((a, b) => a.price - b.price);
    } else if (selectedSort === SortOptions.PRICE_HIGH.value) {
      filtered.sort((a, b) => b.price - a.price);
    } else if (selectedSort === SortOptions.POPULARITY.value) {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // Default - newest first (already sorted from the backend)
    }
    
    return filtered;
  };
  
  const filteredProducts = getFilteredProducts();
  
  // Handle add to cart
  const handleAddToCart = async (product) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }
        ]
      );
      return;
    }

    try {
      addToCart(product);
      Alert.alert('Success', 'Item added to your cart!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  // Handle like press
  const handleLikePress = async (productId) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to like products.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }
        ]
      );
      return;
    }

    try {
      const isLiked = likedProducts[productId];
      
      if (isLiked) {
        // Unlike the product
        const { error } = await supabase
          .from('product_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) throw error;

        setLikedProducts(prev => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });
      } else {
        // Like the product
        const { error } = await supabase
          .from('product_likes')
          .insert([
            { user_id: user.id, product_id: productId }
          ]);

        if (error) throw error;

        setLikedProducts(prev => ({
          ...prev,
          [productId]: true
        }));
      }
    } catch (error) {
      console.error('Error updating like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };
  
  const handleExplore = (banner) => {
    // Handle banner explore button press based on banner type
    switch (banner.id) {
      case '1':
        // Best products
        setSelectedSort(SortOptions.POPULARITY.value);
        break;
      case '2':
        // Special offers
        setSelectedFilter(FilterOptions.ON_SALE.value);
        break;
      case '3':
        // New arrivals
        setSelectedSort(SortOptions.NEWEST.value);
        break;
      case '4':
        // Free delivery
        // You can implement a filter for items eligible for free delivery
        break;
    }
  };
  
  // Handle notification press
  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);

        if (error) throw error;

        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => prev - 1);
      } catch (error) {
        console.error('Error marking notification as read:', error.message);
      }
    }

    // Handle notification action based on type
    switch (notification.type) {
      case 'order_update':
        navigation.navigate('OrderDetails', { orderId: notification.order_id });
        break;
      case 'new_product':
        navigation.navigate('ProductDetails', { productId: notification.product_id });
        break;
      case 'shop_update':
        navigation.navigate('ShopDetails', { shopId: notification.shop_id });
        break;
      default:
        break;
    }
  };
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Update the notifications icon in the header
  const renderNotificationsIcon = () => (
    <TouchableOpacity 
      style={styles.iconButton}
      onPress={() => {
        // Show notifications modal or navigate to notifications screen
        Alert.alert(
          'Notifications',
          notifications.length > 0 
            ? notifications.map(n => n.message).join('\n\n')
            : 'No notifications',
          [
            { text: 'OK', onPress: () => {} }
          ]
        );
      }}
    >
      <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
      {unreadCount > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationCount}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with User Info */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.[0].toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi,</Text>
              <Text style={styles.userName}>
                {user?.email?.split('@')[0] || 'User'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Ionicons name="heart-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            {renderNotificationsIcon()}
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, shops, categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Banner Carousel */}
        <BannerCarousel onExplore={handleExplore} />

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesList}
        >
          <TouchableOpacity
            style={[styles.categoryChip, styles.selectedCategoryChip]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.categoryText, styles.selectedCategoryText]}>All</Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.categoryChip,
                selectedCategory === category.value && styles.selectedCategoryChip
              ]}
              onPress={() => setSelectedCategory(category.value)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.value && styles.selectedCategoryText
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllProducts')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {filteredProducts.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productCard}
                onPress={() => handleProductPress(item)}
              >
                <View style={styles.productImageContainer}>
                  <Image
                    source={{ uri: item.images && item.images.length > 0 ? item.images[0] : null }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  {item.is_on_sale && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{item.discount_percentage}% off</Text>
                    </View>
                  )}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                      style={styles.likeButton}
                      onPress={() => handleLikePress(item.id)}
                    >
                      <Ionicons
                        name={likedProducts[item.id] ? 'heart' : 'heart-outline'}
                        size={20}
                        color={likedProducts[item.id] ? '#FF6B6B' : '#666'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.addToCartButton}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Ionicons name="cart-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.shopName}>@{item.shop?.name || 'Shop'}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>N${formatPrice(item.price)}</Text>
                    {item.is_on_sale && (
                      <Text style={styles.originalPrice}>
                        N${formatPrice(item.original_price)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.productMetaRow}>
                    <Text style={[styles.stockStatus, {color: item.in_stock ? '#4CAF50' : '#FF9800'}]}>
                      {item.in_stock ? 'Available' : 'On Order'}
                    </Text>
                    <View style={styles.productMetaInfo}>
                      <View style={styles.viewsIndicator}>
                        <Ionicons name="eye-outline" size={12} color="#666" />
                        <Text style={styles.viewsCount}>{item.views_count || 0}</Text>
                      </View>
                      <View style={styles.dateIndicator}>
                        <Ionicons name="time-outline" size={12} color="#666" />
                        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B3147',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2B3147',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#2B3147',
  },
  filterButton: {
    padding: 8,
  },
  bannerSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  banner: {
    backgroundColor: '#3D3D7D',
    borderRadius: 15,
    padding: 20,
    height: 180,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 20,
  },
  bannerButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#3D3D7D',
    fontWeight: '600',
  },
  bannerDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    left: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  activeDot: {
    opacity: 1,
    width: 20,
  },
  categoriesContainer: {
    marginTop: 15,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
  },
  selectedCategoryChip: {
    backgroundColor: '#2B3147',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  productsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2B3147',
  },
  seeAllButton: {
    color: '#666',
    fontSize: 14,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  productCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  productImageContainer: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'center',
  },
  likeButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 15,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addToCartButton: {
    backgroundColor: '#F5F6FA',
    padding: 8,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B3147',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B3147',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  stockStatus: {
    fontSize: 12,
    color: '#4CAF50',
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
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  viewsCount: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
  dateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
});

export default BrowseProductsScreen; 