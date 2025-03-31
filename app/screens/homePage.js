import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  TextInput,
  Animated,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Modal,
  Easing,
  Pressable
} from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import COLORS from '../../constants/colors';
import { items } from '../components/database/database';
import {
  Entypo,
  MaterialCommunityIcons,
  FontAwesome,
  Feather,
  AntDesign,
  Ionicons,
  FontAwesome5
} from '@expo/vector-icons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import {
  currencyFormat,
  isMobileDevice,
  convertText,
} from '../utility/utility';
import AnimatedBannerCarousel from '../components/banner/banner';
import { useAuth } from '../context/AuthContext';
import { BlurView } from 'expo-blur';

const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState('popular'); // popular, priceLow, priceHigh, newest
  const { user } = useAuth();
  
  // Keep only the spinner animation for the loading indicator
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const filterIconAnim = useRef(new Animated.Value(0)).current;
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const filterSpin = filterIconAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const scrollViewRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth / 2.2;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });

  const categories = [
    { id: '1', name: 'All', icon: 'grid' },
    { id: '2', name: 'Shoes', icon: 'shoe-prints' },
    { id: '3', name: 'Men\'s', icon: 'user-tie' },
    { id: '4', name: 'Watches', icon: 'watch' },
    { id: '5', name: 'Electronics', icon: 'headphones' },
    { id: '6', name: 'Beauty', icon: 'spa' },
    { id: '7', name: 'Sports', icon: 'football-ball' },
    { id: '8', name: 'Books', icon: 'book' },
  ];

  // Add refs for interval tracking
  const productScrollIntervalRef = useRef(null);
  const shopScrollIntervalRef = useRef(null);
  const adBannerRef = useRef(null);
  const adBannerIntervalRef = useRef(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adBannerScrolling, setAdBannerScrolling] = useState(true);
  const adBannerScrollX = useRef(new Animated.Value(0)).current;
  
  // Add these refs after other refs
  const productsScrollRef = useRef(null);
  const shopsScrollRef = useRef(null);
  const productsScrollX = useRef(new Animated.Value(0)).current;
  const shopsScrollX = useRef(new Animated.Value(0)).current;
  const [productScrolling, setProductScrolling] = useState(true);
  const [shopScrolling, setShopScrolling] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    return unsubscribe;
  }, [navigation]);
  
  // Only keep the loading spinner animation
  useEffect(() => {
    // Start a rotation animation for the loading indicator
    Animated.loop(
      Animated.timing(rotateAnim, {
          toValue: 1,
        duration: 2000,
        easing: Easing.linear,
          useNativeDriver: true,
      })
    ).start();
    
    // Add continuous rotation for the filter icon
    Animated.loop(
      Animated.timing(filterIconAnim, {
        toValue: 1,
        duration: 3000, // Slower spin than the loader
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    // Apply filters whenever search query, category, price range, or sort changes
    applyFilters();
  }, [searchQuery, selectedCategory, priceRange, sortBy, products]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      // For now, we'll just use the mock data
      getDataFromDB();
      
      // Mock shop data
      const shopData = [
        {
          id: '1',
          name: 'Electronics Hub',
          ownerName: 'James Smith',
          image: 'https://cdn.pixabay.com/photo/2018/02/21/10/46/stock-3170020_1280.jpg',
          followerCount: 1200,
          rating: 4.8,
        },
        {
          id: '2',
          name: 'Fashion World',
          ownerName: 'Sarah Johnson',
          image: 'https://images.pexels.com/photos/135620/pexels-photo-135620.jpeg?cs=srgb&dl=pexels-shattha-pilabut-38930-135620.jpg&fm=jpg',
          followerCount: 850,
          rating: 4.5,
        },
        {
          id: '3',
          name: 'Home & Garden',
          ownerName: 'Michael Brown',
          image: 'https://plus.unsplash.com/premium_photo-1663039978847-63f7484bf701?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z3JvY2VyeSUyMHN0b3JlfGVufDB8fDB8fHww',
          followerCount: 675,
          rating: 4.2,
        },
        {
          id: '4',
          name: 'Book Haven',
          ownerName: 'Emma Wilson',
          image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXSsWMyXpT3jg64Om7Q3SkTOg5QYzRJXH_pg&s',
          followerCount: 930,
          rating: 4.7,
        },
      ];
      
      setShops(shopData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDataFromDB = () => {
    let productList = [];

    for (let index = 0; index < items.length; index++) {
        productList.push(items[index]);
      }

    setProducts(productList);
    setFilteredProducts(productList);
  };

  const applyFilters = () => {
    // Start with all products
    let result = [...products];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.productName.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query) ||
        item.shopOwner.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      result = result.filter(item => 
        item.category === selectedCategory
      );
    }
    
    // Apply price range filter
    result = result.filter(item => {
      const price = item.isOff 
        ? item.productPrice - (item.offPercentage / 100) * item.productPrice 
        : item.productPrice;
        
      return price >= priceRange[0] && price <= priceRange[1];
    });
    
    // Apply sorting
    switch (sortBy) {
      case 'popular':
        // In a real app, popularity would be a field in the data
        // Here we'll just sort by productName as a placeholder
        result.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case 'priceLow':
        result.sort((a, b) => {
          const priceA = a.isOff ? a.productPrice - (a.offPercentage / 100) * a.productPrice : a.productPrice;
          const priceB = b.isOff ? b.productPrice - (b.offPercentage / 100) * b.productPrice : b.productPrice;
          return priceA - priceB;
        });
        break;
      case 'priceHigh':
        result.sort((a, b) => {
          const priceA = a.isOff ? a.productPrice - (a.offPercentage / 100) * a.productPrice : a.productPrice;
          const priceB = b.isOff ? b.productPrice - (b.offPercentage / 100) * b.productPrice : b.productPrice;
          return priceB - priceA;
        });
        break;
      case 'newest':
        // In a real app, this would sort by date
        // Here we'll just sort by id as a placeholder
        result.sort((a, b) => b.id - a.id);
        break;
    }
    
    setFilteredProducts(result);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setPriceRange([0, 10000]);
    setSortBy('popular');
    setFilterModalVisible(false);
  };

  // Simplified ProductCard without animations
  const ProductCard = ({ data }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductInfo', { productID: data.id })}
        style={styles.productCard}
      >
        <View style={styles.productImageContainer}>
          {data.isOff ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{data.offPercentage}% off</Text>
            </View>
          ) : null}
          <Image
            source={data.productImage}
            style={styles.productImage}
          />
          
          {/* Quick action buttons */}
          <View style={styles.quickActionContainer}>
            <TouchableOpacity style={styles.quickActionButton}>
              <AntDesign name="heart" size={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Feather name="shopping-cart" size={16} color="#ffffff" />
            </TouchableOpacity>
        </View>
        </View>
        
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={1}>
          {data.productName}
        </Text>
          
          <Text style={styles.shopName} numberOfLines={1}>
            @{convertText(data.shopOwner)}
        </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {currencyFormat(
                data.productPrice - (data.isOff ? (data.offPercentage / 100) * data.productPrice : 0)
              )}
              </Text>
            {data.isOff ? (
              <Text style={styles.originalPrice}>
                {currencyFormat(data.productPrice)}
              </Text>
            ) : null}
            </View>
          
          {data.category === 'Accessory' && (
            <View style={styles.availabilityContainer}>
            <View
                style={[
                  styles.availabilityDot, 
                  {backgroundColor: data.isAvailable ? COLORS.secondary : COLORS.red}
                ]} 
              />
              <Text
                style={[
                  styles.availabilityText,
                  {color: data.isAvailable ? COLORS.secondary : COLORS.red}
                ]}
              >
                {data.isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Simplified ShopCard without animations
  const ShopCard = ({ shop }) => {
    const isOwner = user && user.id === shop.owner_id;
    
    const handleFollowShop = () => {
      // In a real app, this would call an API
      if (isOwner) {
        Alert.alert("Cannot follow", "You cannot follow your own shop");
        return;
      }
      
      // Display success message
      Alert.alert("Success", `You are now following ${shop.name}`);
      
      // This would update the shop's followers in a real app
      const updatedShops = shops.map(s => {
        if (s.id === shop.id) {
          return {
            ...s,
            followerCount: s.followerCount + 1
          };
        }
        return s;
      });
      
      setShops(updatedShops);
    };
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ShopDetail', { shop_id: shop.id })}
        style={styles.shopCard}
      >
        <Image 
          source={{ uri: shop.image }} 
          style={styles.shopImage} 
        />
        <View style={styles.shopOverlay} />
        
        <View style={styles.shopDetails}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopOwner}>by {shop.ownerName}</Text>
          
          <View style={styles.shopStats}>
            <View style={styles.shopRating}>
              <AntDesign name="star" size={14} color="#FFD700" />
              <Text style={styles.shopRatingText}>{shop.rating}</Text>
            </View>
            
            <View style={styles.shopFollowers}>
              <Feather name="users" size={14} color="#fff" />
              <Text style={styles.shopFollowersText}>
                {shop.followerCount > 999 
                  ? `${(shop.followerCount / 1000).toFixed(1)}k` 
                  : shop.followerCount}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Show follow button for buyers, show "Manage" button for shop owners */}
        {isOwner ? (
          <TouchableOpacity 
            style={[styles.followButton, styles.manageButton]}
            onPress={() => navigation.navigate('ShopDetail', { shop_id: shop.id })}
          >
            <Text style={styles.followButtonText}>Manage</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.followButton}
            onPress={handleFollowShop}
          >
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Add this function for auto-scrolling after the applyFilters function
  const startAutoScroll = () => {
    // Clear any existing intervals first
    if (productScrollIntervalRef.current) {
      clearInterval(productScrollIntervalRef.current);
    }
    if (shopScrollIntervalRef.current) {
      clearInterval(shopScrollIntervalRef.current);
    }
    if (adBannerIntervalRef.current) {
      clearInterval(adBannerIntervalRef.current);
    }
    
    // Auto-scroll for ad banners
    if (adBanners.length > 0 && adBannerRef.current) {
      let bannerIndex = 0;
      
      adBannerIntervalRef.current = setInterval(() => {
        if (adBannerScrolling) {
          bannerIndex = (bannerIndex + 1) % adBanners.length;
          setCurrentAdIndex(bannerIndex);
          
          if (adBannerRef.current) {
            adBannerRef.current.scrollToIndex({
              index: bannerIndex,
              animated: true,
              viewPosition: 0.5
            });
          }
        }
      }, 4000); // 4 seconds between each banner change
    }
    
    // Auto-scroll for products - one product at a time
    if (filteredProducts.length > 0 && productsScrollRef.current) {
      let currentIndex = 0;
      
      productScrollIntervalRef.current = setInterval(() => {
        if (productScrolling && filteredProducts.length > 1) {
          currentIndex = (currentIndex + 1) % Math.min(filteredProducts.length, 6);
          
          if (productsScrollRef.current) {
            productsScrollRef.current.scrollToIndex({
              index: currentIndex,
              animated: true,
              viewPosition: 0.5
            });
          }
        }
      }, 3000); // 3 seconds between each scroll
    }
    
    // Auto-scroll for shops - one shop at a time
    if (shops.length > 0 && shopsScrollRef.current) {
      let currentIndex = 0;
      
      shopScrollIntervalRef.current = setInterval(() => {
        if (shopScrolling && shops.length > 1) {
          currentIndex = (currentIndex + 1) % shops.length;
          
          if (shopsScrollRef.current) {
            shopsScrollRef.current.scrollToIndex({
              index: currentIndex,
              animated: true,
              viewPosition: 0.5
            });
          }
        }
      }, 3000); // 3 seconds between each scroll
    }
  };

  // Move startAutoScroll call to a useEffect that runs after data is loaded
  useEffect(() => {
    if (!loading && filteredProducts.length > 0 && shops.length > 0) {
      // Small delay to ensure refs are properly set
      setTimeout(() => {
        startAutoScroll();
      }, 500);
    }
    
    return () => {
      if (productScrollIntervalRef.current) {
        clearInterval(productScrollIntervalRef.current);
      }
      if (shopScrollIntervalRef.current) {
        clearInterval(shopScrollIntervalRef.current);
      }
      if (adBannerIntervalRef.current) {
        clearInterval(adBannerIntervalRef.current);
      }
    };
  }, [loading, filteredProducts.length, shops.length]);

  // Update the Header component to show a welcome message like in the image
  const brands = [
    { id: '1', name: 'Dell', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Dell_Logo.png/1200px-Dell_Logo.png' },
    { id: '2', name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png' },
    { id: '3', name: 'Asus', logo: 'https://dlcdnimgs.asus.com/websites/global/Sno/79183.png' },
    { id: '4', name: 'Sony', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Sony_logo.svg/1024px-Sony_logo.svg.png' },
    { id: '5', name: 'HP', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/1200px-HP_logo_2012.svg.png' },
    { id: '6', name: 'Boat', logo: 'https://mir-s3-cdn-cf.behance.net/projects/404/60278c165536469.Y3JvcCwxMzgwLDEwODAsMjcwLDA.png' },
  ];

  // Update banners array with more detailed structure
  const adBanners = [
    {
      id: '1',
      title: 'The best product',
      subtitle: 'for your best time',
      image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MKU93_VW_34FR+watch-45-alum-midnight-nc-7s_VW_34FR_WF_CO?wid=1400&hei=1400&trim=1%2C0&fmt=p-jpg&qlt=95&.v=1632171067000%2C1631661671000',
      backgroundColor: '#3E4095',
      buttonText: 'Explore Now',
    },
    {
      id: '2',
      title: 'Summer Sale',
      subtitle: 'up to 50% off',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2hvZXN8ZW58MHx8MHx8&w=1000&q=80',
      backgroundColor: '#FF6B6B',
      buttonText: 'Shop Now',
    },
    {
      id: '3',
      title: 'New Arrivals',
      subtitle: 'latest tech gadgets',
      image: 'https://images.unsplash.com/photo-1512054502232-10a0a035d672?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
      backgroundColor: '#4A6FA5',
      buttonText: 'Discover',
    },
    {
      id: '4',
      title: 'Special Deals',
      subtitle: 'for premium customers',
      image: 'https://images.pexels.com/photos/341523/pexels-photo-341523.jpeg?cs=srgb&dl=pexels-pixabay-341523.jpg&fm=jpg',
      backgroundColor: '#38A3A5',
      buttonText: 'View Deals',
    },
    {
      id: '5',
      title: 'Flash Sale',
      subtitle: 'ends in 24 hours',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8aGVhZHBob25lc3xlbnwwfHwwfHx8MA%3D%3D&w=1000&q=80',
      backgroundColor: '#F08A5D',
      buttonText: 'Shop Now',
    },
  ];

  // Create a component for ad banner item
  const AdBannerItem = ({ item }) => (
    <View style={[styles.adBannerContainer, { backgroundColor: item.backgroundColor, width: screenWidth - 32 }]}>
      <View style={styles.adTextContainer}>
        <Text style={styles.adTitle}>{item.title}</Text>
        <Text style={styles.adSubtitle}>{item.subtitle}</Text>
        <TouchableOpacity style={styles.exploreButton}>
          <Text style={[styles.exploreButtonText, { color: item.backgroundColor }]}>{item.buttonText}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.adImageContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.adImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.darkBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with welcome message */}
      <View style={styles.header}>
        {user ? (
          <View style={styles.userWelcome}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
            <Text style={styles.welcomeText}>Hi, {user?.name || 'Guest'}</Text>
          </View>
        ) : (
          <Text style={styles.appTitle}>Shopit</Text>
        )}
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <AntDesign name="heart" size={22} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search Bar */}
          <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
          placeholder="Search products, shops, categories..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
              <TouchableOpacity
                onPress={() => {
            setFilterModalVisible(true);
          }}
        >
          <Animated.View style={{ transform: [{ rotate: filterSpin }] }}>
            <Ionicons name="options-outline" size={22} color={COLORS.darkBlue} />
          </Animated.View>
              </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Animated.View 
            style={[
              styles.customLoader,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <View style={styles.loaderInner} />
          </Animated.View>
          <Text style={styles.loadingText}>Discovering amazing products...</Text>
            </View>
      ) : (
          <ScrollView
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          {/* Replace the static advertisement banner with a FlatList */}
          <View style={styles.adBannerWrapper}>
            <FlatList
              ref={adBannerRef}
            horizontal
              pagingEnabled
            showsHorizontalScrollIndicator={false}
              data={adBanners}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <AdBannerItem item={item} />}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: adBannerScrollX } } }],
                { 
                  useNativeDriver: false,
                  listener: (event) => {
                    const scrollPosition = event.nativeEvent.contentOffset.x;
                    const index = Math.round(scrollPosition / (screenWidth - 32));
                    setCurrentAdIndex(index);
                  }
                }
              )}
              scrollEventThrottle={16}
              onScrollBeginDrag={() => setAdBannerScrolling(false)}
              onMomentumScrollEnd={() => setAdBannerScrolling(true)}
              snapToInterval={screenWidth - 32}
              decelerationRate="fast"
            />
            
            <View style={styles.paginationDots}>
              {adBanners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    { width: currentAdIndex === index ? 20 : 6 },
                    { backgroundColor: currentAdIndex === index ? '#fff' : 'rgba(255,255,255,0.5)' },
                  ]}
                />
              ))}
        </View>
          </View>

          {/* Categories */}
          <View style={styles.categoriesWrapper}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.name;
                
                return (
                  <TouchableOpacity
                    style={styles.categoryButton}
                    onPress={() => setSelectedCategory(item.name)}
                  >
                    <View style={[
                      styles.categoryIcon,
                      isSelected && styles.selectedCategoryIcon
                    ]}>
                      <FontAwesome5 name={item.icon} size={20} color={isSelected ? "#fff" : COLORS.darkBlue} />
                    </View>
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.selectedCategoryText,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.categoriesContainer}
            />
              </View>
          
          {/* Featured Products */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Shops')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {filteredProducts.length > 0 ? (
              <FlatList
                ref={productsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={filteredProducts.slice(0, 6)}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={{ width: cardWidth, marginRight: 12 }}>
                    <ProductCard data={item} />
                  </View>
                )}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => setProductScrolling(false)}
                onMomentumScrollEnd={() => setProductScrolling(true)}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: productsScrollX } } }],
                  { useNativeDriver: false }
                )}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>No products found</Text>
                <TouchableOpacity 
                  onPress={resetFilters} 
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
                  </View>
            )}
          </View>
          
          {/* Featured Shops */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Shops</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ShopPublic')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              ref={shopsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              data={shops}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <ShopCard shop={item} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              scrollEventThrottle={16}
              onScrollBeginDrag={() => setShopScrolling(false)}
              onMomentumScrollEnd={() => setShopScrolling(true)}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: shopsScrollX } } }],
                { useNativeDriver: false }
              )}
            />
          </View>
          
          {/* Top Offers / All Products */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top offers</Text>
              <View style={styles.resultCount}>
                <Text style={styles.resultCountText}>{filteredProducts.length} results</Text>
              </View>
            </View>
            
            {filteredProducts.length > 0 ? (
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                renderItem={({ item }) => (
                  <View style={styles.gridItem}>
                    <ProductCard data={item} />
                  </View>
                )}
                contentContainerStyle={styles.productsGrid}
                columnWrapperStyle={styles.columnWrapper}
                initialNumToRender={6}
                windowSize={5}
                maxToRenderPerBatch={10}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>No products found</Text>
                <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <BlurView intensity={20} style={styles.modalOverlay} tint="dark">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <AntDesign name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'popular' && styles.selectedSortOption]}
                  onPress={() => setSortBy('popular')}
                >
                  <Text style={sortBy === 'popular' ? styles.selectedSortText : styles.sortText}>Popular</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'newest' && styles.selectedSortOption]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text style={sortBy === 'newest' ? styles.selectedSortText : styles.sortText}>Newest</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'priceLow' && styles.selectedSortOption]}
                  onPress={() => setSortBy('priceLow')}
                >
                  <Text style={sortBy === 'priceLow' ? styles.selectedSortText : styles.sortText}>Price: Low to High</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'priceHigh' && styles.selectedSortOption]}
                  onPress={() => setSortBy('priceHigh')}
                >
                  <Text style={sortBy === 'priceHigh' ? styles.selectedSortText : styles.sortText}>Price: High to Low</Text>
                </TouchableOpacity>
            </View>
          </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.modalCategoryButton, selectedCategory === category.name && styles.selectedModalCategoryButton]}
                    onPress={() => setSelectedCategory(category.name)}
                  >
                    <FontAwesome5 
                      name={category.icon} 
                      size={16} 
                      color={selectedCategory === category.name ? "#fff" : "#475569"} 
                      style={{marginRight: 8}} 
                    />
                    <Text style={selectedCategory === category.name ? styles.selectedModalCategoryText : styles.modalCategoryText}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
        </ScrollView>
      </View>
            
            <View style={styles.filterButtons}>
              <TouchableOpacity style={styles.resetFilterButton} onPress={resetFilters}>
                <Text style={styles.resetFilterText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyFilterButton} 
                onPress={() => {
                  applyFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyFilterText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
              flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.darkBlue,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  userWelcome: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInitial: {
    color: '#fff',
                    fontSize: 18,
                  fontFamily: 'Poppins_600SemiBold',
  },
  welcomeText: {
                  fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#0f172a',
    marginLeft: 10,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
                  fontFamily: 'Poppins_400Regular',
                  fontSize: 16,
    color: '#0f172a',
  },
  categoriesWrapper: {
    marginTop: 20,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 5,
  },
  categoryButton: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 70, 
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedCategoryButton: {
    // No specific styles needed here as we're using the icon styles
  },
  categoryText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedCategoryText: {
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  sectionContainer: {
    marginVertical: 20,
  },
  sectionHeader: {
                flexDirection: 'row',
                justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
                    fontFamily: 'Poppins_700Bold',
    color: '#0f172a',
  },
  seeAllText: {
                    fontSize: 14,
                    fontFamily: 'Poppins_500Medium',
    color: COLORS.darkBlue,
  },
  resultCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  resultCountText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.gold,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 1,
  },
  discountText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#fff',
  },
  productImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
  quickActionContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
  },
  quickActionButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productDetails: {
    padding: 14,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
                  fontSize: 15,
    color: '#0f172a',
    marginBottom: 4,
  },
  shopName: {
                  fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  priceContainer: {
                flexDirection: 'row',
                alignItems: 'center',
    marginBottom: 4,
  },
  currentPrice: {
                    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: COLORS.darkBlue,
    marginRight: 8,
  },
  originalPrice: {
                    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  shopCard: {
    width: 220,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backgroundGradient: 'rgba(0, 0, 0, 0) to rgba(0, 0, 0, 0.8)',
  },
  shopDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  shopName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#fff',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  shopOwner: {
                  fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#F8FAFC',
    marginBottom: 6,
  },
  shopStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  shopRatingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  shopFollowers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  shopFollowersText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  followButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.gold,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  manageButton: {
    backgroundColor: COLORS.darkBlue,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customLoader: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#E2E8F0',
    borderTopColor: COLORS.darkBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loaderInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9', 
  },
  loadingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.darkBlue,
    borderRadius: 12,
    shadowColor: COLORS.darkBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  resetButtonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#fff',
  },
  
  // Modal styles remain the same with some enhancements
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#0f172a',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 12,
  },
  sortOptions: {
    flexDirection: 'column',
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSortOption: {
    backgroundColor: '#F1F5F9',
  },
  sortText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748B',
  },
  selectedSortText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: COLORS.darkBlue,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  modalCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedModalCategoryButton: {
    backgroundColor: COLORS.darkBlue,
    borderColor: COLORS.darkBlue,
  },
  modalCategoryText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#475569',
  },
  selectedModalCategoryText: {
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  resetFilterButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginRight: 8,
  },
  resetFilterText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#64748B',
  },
  applyFilterButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.darkBlue,
    borderRadius: 8,
  },
  applyFilterText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  adBannerWrapper: {
    marginTop: 20,
    marginHorizontal: 16,
    position: 'relative',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },
  adBannerContainer: {
    height: 160,
    backgroundColor: '#3E4095',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  adTextContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  adTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    lineHeight: 28,
  },
  adSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#fff',
    marginBottom: 15,
  },
  exploreButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  exploreButtonText: {
    color: '#3E4095',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  adImageContainer: {
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  brandsContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  brandItem: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  brandLogo: {
    width: 35,
    height: 35,
  },
  selectedCategoryIcon: {
    backgroundColor: COLORS.darkBlue,
    borderColor: COLORS.darkBlue,
    shadowColor: COLORS.darkBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
});

export default HomeScreen;
