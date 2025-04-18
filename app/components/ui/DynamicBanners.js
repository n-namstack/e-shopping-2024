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
        subtitle: 'Latest products',
        gradient: ['#4F46E5', '#7C3AED'],
        data: topViewedProducts.length > 0 ? topViewedProducts[0] : null,
      },
      {
        id: '2',
        type: 'top_shops',
        title: 'Top Shops',
        subtitle: 'Most followed stores',
        gradient: ['#2563EB', '#3B82F6'],
        data: topShops.length > 0 ? topShops[0] : null,
      },
      {
        id: '3',
        type: 'lowest_price',
        title: 'Best Deals',
        subtitle: 'Lowest prices available',
        gradient: ['#9333EA', '#C026D3'],
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
    const imageUrl = hasData && item.data.images ? item.data.images[0] : 'https://via.placeholder.com/100';
    
    return (
      <TouchableOpacity 
        activeOpacity={0.9}
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
          <View style={styles.bannerContent}>
            <View style={styles.textContainer}>
              <Text style={styles.bannerTitle}>{item.title}</Text>
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
              
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => hasData && handleBannerPress(item)}
                disabled={!hasData}
              >
                <Text style={styles.exploreButtonText}>Explore Now</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageContainer}>
              {item.type === 'newest' || item.type === 'lowest_price' ? (
                <View style={styles.productImageContainer}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  {hasData && item.data.price && (
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>
                        ${hasData ? item.data.price.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.shopImageContainer}>
                  <Image
                    source={{ uri: hasData && item.data.logo_url ? item.data.logo_url : 'https://via.placeholder.com/100' }}
                    style={styles.shopImage}
                    resizeMode="cover"
                  />
                  {hasData && (
                    <View style={styles.followersBadge}>
                      <Ionicons name="people" size={12} color="#fff" />
                      <Text style={styles.followerCount}>
                        {hasData && item.data.followers ? item.data.followers : '0'}
                      </Text>
                    </View>
                  )}
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
    height: 180,
    marginBottom: 20,
  },
  flatListContent: {
    paddingHorizontal: 0,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    width: width,
    paddingHorizontal: 16,
  },
  banner: {
    height: 160,
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
  },
  textContainer: {
    flex: 2,
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: FONTS.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 16,
    fontFamily: FONTS.regular,
  },
  exploreButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  exploreButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  productImageContainer: {
    position: 'relative',
    padding: 4,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 4,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  shopImageContainer: {
    position: 'relative',
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  followersBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  followerCount: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 2,
    fontFamily: FONTS.regular,
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