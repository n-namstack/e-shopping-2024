import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { COLORS, FONTS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const DynamicBanners = ({ onBannerPress, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [topViewedProducts, setTopViewedProducts] = useState([]);
  const [topShops, setTopShops] = useState([]);
  const [lowestPriceProducts, setLowestPriceProducts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Banner data structure with dynamic data and fallbacks
  const getBannerData = () => {
    return [
      {
        id: '1',
        type: 'newest',
        title: 'New Arrivals',
        subtitle: 'Latest & trending products',
        emoji: '🔥',
        gradient: ['#667eea', '#764ba2'],
        accentColor: '#FFD700',
        data: topViewedProducts.length > 0 ? topViewedProducts[0] : null,
      },
      {
        id: '2',
        type: 'top_shops',
        title: 'Top Shops',
        subtitle: 'Most trusted & popular stores',
        emoji: '⭐',
        gradient: ['#f093fb', '#f5576c'],
        accentColor: '#00D4AA',
        data: topShops.length > 0 ? topShops[0] : null,
      },
      {
        id: '3',
        type: 'lowest_price',
        title: 'Best Deals',
        subtitle: 'Unbeatable prices & offers',
        emoji: '💎',
        gradient: ['#4facfe', '#00f2fe'],
        accentColor: '#FF6B6B',
        data: lowestPriceProducts.length > 0 ? lowestPriceProducts[0] : null,
      },
    ];
  };

  // Fetch newest products
  const fetchTopViewedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          images,
          created_at,
          stock_quantity,
          is_on_order,
          shop:shops(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      
      // Process products to handle stock status correctly
      const processedData = data?.map(product => ({
        ...product,
        in_stock: product.is_on_order !== undefined 
          ? !product.is_on_order 
          : (product.stock_quantity || 0) > 0
      })) || [];
      
      setTopViewedProducts(processedData);
    } catch (error) {
      console.error('Error fetching newest products:', error.message);
      setTopViewedProducts([{
        id: 'fallback',
        name: 'New Product',
        price: 199.99,
        images: ['https://via.placeholder.com/100'],
        created_at: new Date().toISOString(),
        stock_quantity: 0,
        is_on_order: false
      }]);
    }
  };

  // Fetch shops with most followers
  const fetchTopShops = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, logo_url')
        .order('id', { ascending: false })
        .limit(3);

      if (error) throw error;
      
      setTopShops(data || []);
    } catch (error) {
      console.error('Error fetching top shops:', error.message);
      setTopShops([{
        id: 'fallback',
        name: 'Featured Shop',
        logo_url: 'https://via.placeholder.com/100'
      }]);
    }
  };

  // Fetch lowest price products
  const fetchLowestPriceProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          images,
          stock_quantity,
          is_on_order,
          shop:shops(
            id,
            name
          )
        `)
        .gt('price', 0)
        .order('price', { ascending: true })
        .limit(3);

      if (error) throw error;
      
      // Process products to handle stock status correctly
      const processedData = data?.map(product => ({
        ...product,
        in_stock: product.is_on_order !== undefined 
          ? !product.is_on_order 
          : (product.stock_quantity || 0) > 0
      })) || [];
      
      setLowestPriceProducts(processedData);
    } catch (error) {
      console.error('Error fetching lowest price products:', error.message);
      setLowestPriceProducts([{
        id: 'fallback',
        name: 'Best Deal',
        price: 49.99,
        images: ['https://via.placeholder.com/100'],
        stock_quantity: 0,
        is_on_order: false
      }]);
    }
  };

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTopViewedProducts(),
          fetchTopShops(),
          fetchLowestPriceProducts()
        ]);
      } catch (error) {
        console.error('Error fetching banner data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Auto-scroll banners
  useEffect(() => {
    const intervalId = setInterval(() => {
      const banners = getBannerData();
      if (activeIndex === banners.length - 1) {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: true,
        });
      } else {
        flatListRef.current?.scrollToIndex({
          index: activeIndex + 1,
          animated: true,
        });
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activeIndex]);

  // Handle banner press
  const handleBannerPress = (item) => {
    if (!item.data || item.data.id === 'fallback') {
      // If using fallback data, just navigate to generic screens
      switch (item.type) {
        case 'newest':
        case 'lowest_price':
          navigation.navigate('BrowseProducts');
          break;
        case 'top_shops':
          navigation.navigate('ShopsTab');
          break;
        default:
          break;
      }
      return;
    }

    switch (item.type) {
      case 'newest':
      case 'lowest_price':
        // Navigate to product details with the full product data
        navigation.navigate('ProductDetails', { 
          product: {
            ...item.data,
            shop: item.data.shop,
            in_stock: item.data.is_on_order !== undefined 
              ? !item.data.is_on_order 
              : (item.data.stock_quantity || 0) > 0,
            quantity: item.data.stock_quantity || 0
          }
        });
        break;
      case 'top_shops':
        navigation.navigate('ShopDetails', { 
          shopId: item.data.id,
          shopName: item.data.name
        });
        break;
      default:
        break;
    }

    if (onBannerPress) {
      onBannerPress(item);
    }
  };

  // Render banner item
  const renderBanner = ({ item }) => {
    const hasData = !!item.data;
    const imageUrl = hasData && item.data.images ? item.data.images[0] : 'https://via.placeholder.com/120';
    
    return (
      <TouchableOpacity 
        activeOpacity={0.95}
        style={styles.bannerContainer}
        onPress={() => hasData && handleBannerPress(item)}
        disabled={!hasData}
      >
        <LinearGradient
          colors={item.gradient}
          style={styles.banner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Background Pattern */}
          <View style={styles.backgroundPattern}>
            <View style={[styles.patternCircle, styles.patternCircle1]} />
            <View style={[styles.patternCircle, styles.patternCircle2]} />
          </View>

          <View style={styles.bannerContent}>
            {/* Text Section */}
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.bannerEmoji}>{item.emoji}</Text>
                <View style={styles.titleContainer}>
                  <Text style={styles.bannerTitle}>{item.title}</Text>
                  <View style={styles.titleUnderline} />
                </View>
              </View>
              
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
              
              <TouchableOpacity
                style={[styles.exploreButton, { borderColor: item.accentColor }]}
                onPress={() => hasData && handleBannerPress(item)}
                disabled={!hasData}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.exploreButtonGradient}
                >
                  <Text style={[styles.exploreButtonText, { color: item.gradient[0] }]}>
                    Explore Now
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={item.gradient[0]} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* Image Section */}
            <View style={styles.imageContainer}>
              {item.type === 'newest' || item.type === 'lowest_price' ? (
                <View style={styles.productImageContainer}>
                  <View style={[styles.imageShadow, { backgroundColor: item.accentColor }]} />
                  <View style={styles.imageWrapper}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    {hasData && item.data.price && (
                      <View style={[styles.priceBadge, { backgroundColor: item.accentColor }]}>
                        <Text style={styles.priceText}>
                          N${hasData ? item.data.price.toFixed(2) : '0.00'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* Floating Elements */}
                  <View style={[styles.floatingElement, styles.floatingElement1, { backgroundColor: item.accentColor }]} />
                  <View style={[styles.floatingElement, styles.floatingElement2, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                </View>
              ) : (
                <View style={styles.shopImageContainer}>
                  <View style={[styles.imageShadow, { backgroundColor: item.accentColor }]} />
                  <View style={styles.imageWrapper}>
                    <Image
                      source={{ uri: hasData && item.data.logo_url ? item.data.logo_url : 'https://via.placeholder.com/120' }}
                      style={styles.shopImage}
                      resizeMode="cover"
                    />
                    {hasData && (
                      <View style={[styles.followersBadge, { backgroundColor: item.accentColor }]}>
                        <Ionicons name="people" size={12} color="#fff" />
                        <Text style={styles.followerCount}>
                          {hasData && item.data.followers ? item.data.followers : '0'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* Floating Elements */}
                  <View style={[styles.floatingElement, styles.floatingElement1, { backgroundColor: item.accentColor }]} />
                  <View style={[styles.floatingElement, styles.floatingElement2, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(newIndex);
  };

  // Show loading indicator while data is being fetched
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const banners = getBannerData();

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderBanner}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        snapToInterval={width}
        decelerationRate="fast"
        scrollEventThrottle={16}
      />
      <View style={styles.pagination}>
        {banners.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    marginBottom: 20,
  },
  flatListContent: {
    paddingHorizontal: 0,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    width: width,
    paddingHorizontal: 20,
  },
  banner: {
    height: 180,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  patternCircle1: {
    width: 100,
    height: 100,
    top: -50,
    left: -50,
  },
  patternCircle2: {
    width: 80,
    height: 80,
    bottom: -40,
    right: -40,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 1,
  },
  textContainer: {
    flex: 2,
    justifyContent: 'center',
    paddingRight: 16,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 26,
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  titleUnderline: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
    width: '60%',
  },
  bannerSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
    fontFamily: FONTS.medium,
    lineHeight: 20,
  },
  exploreButton: {
    borderRadius: 25,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  exploreButtonText: {
    fontWeight: '700',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  productImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageShadow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 20,
    opacity: 0.3,
    transform: [{ translateX: 4 }, { translateY: 4 }],
  },
  imageWrapper: {
    position: 'relative',
    zIndex: 2,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  priceBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  shopImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  followersBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  followerCount: {
    color: '#FFFFFF',
    fontSize: 11,
    marginLeft: 3,
    fontFamily: FONTS.bold,
  },
  floatingElement: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.6,
  },
  floatingElement1: {
    top: -20,
    left: 20,
  },
  floatingElement2: {
    bottom: -10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
});

export default DynamicBanners; 