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
  Modal
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
  Ionicons
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
    'All',
    'Electronics',
    'Clothing',
    'Home',
    'Books',
    'Sports',
    'Beauty',
    'Toys',
    'Food',
    'Furniture',
  ];

  const banners = [
    {
      imageUrl:
        'https://img.freepik.com/premium-vector/furniture-facebook-cover-profile-page-web-banner-template_594295-301.jpg',
    },
    {
      imageUrl:
        'https://img.lovepik.com/free-template/20211026/lovepik-colorful-geometric-modern-furniture-banners-image_6265452_list.jpg!/fw/431/clip/0x300a0a0',
    },
    {
      imageUrl:
        'https://img.lovepik.com/free-template/20211026/lovepik-colorful-modern-furniture-banners-image_3414308_list.jpg!/fw/431/clip/0x300a0a0',
    },
    {
      imageUrl:
        'https://img.freepik.com/free-vector/gradient-furniture-sale-landing-page-template_23-2148930033.jpg?t=st=1737066995~exp=1737070595~hmac=453a8d4114c537d1edbfb235f271b18e53e8635b795ff47395b37234b5dd82aa',
    },
  ];

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    return unsubscribe;
  }, [navigation]);

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

  const ProductCard = ({ data }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('ProductInfo', { productID: data.id })
        }
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

  const ShopCard = ({ shop }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ShopPublic')}
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
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.darkBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header and Search Bar */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Shopit</Text>
        {user && (
          <View style={styles.userContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
          <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
          placeholder="Search products, shops, categories..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
          <Ionicons name="options-outline" size={22} color={COLORS.darkBlue} />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
              <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.selectedCategoryButton,
              ]}
              onPress={() => setSelectedCategory(item)}
              >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.selectedCategoryText,
                ]}
              >
                {item}
              </Text>
              </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoriesContainer}
        />
            </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.darkBlue} />
          </View>
      ) : (
          <ScrollView
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          {/* Featured Products */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Shops')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
        </View>
            
            {filteredProducts.length > 0 ? (
              <FlatList
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
          
          {/* Featured Shops */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Shops</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ShopPublic')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              horizontal
                showsHorizontalScrollIndicator={false}
              data={shops}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <ShopCard shop={item} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
                  </View>
          
          {/* All Products */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Products</Text>
              <View style={styles.resultCount}>
                <Text style={styles.resultCountText}>{filteredProducts.length} results</Text>
              </View>
            </View>
            
            {filteredProducts.length > 0 ? (
              <View style={styles.productsGrid}>
                {filteredProducts.map((item) => (
                  <ProductCard key={item.id} data={item} />
                ))}
            </View>
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
                    key={category}
                    style={[styles.modalCategoryButton, selectedCategory === category && styles.selectedModalCategoryButton]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={selectedCategory === category ? styles.selectedModalCategoryText : styles.modalCategoryText}>
                      {category}
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
  },
  appTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.darkBlue,
  },
  userContainer: {
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
  },
  userInitial: {
    color: '#fff',
                    fontSize: 18,
                  fontFamily: 'Poppins_600SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    marginTop: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCategoryButton: {
    backgroundColor: COLORS.darkBlue,
    borderColor: COLORS.darkBlue,
  },
  categoryText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#475569',
  },
  selectedCategoryText: {
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionHeader: {
                flexDirection: 'row',
                justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
                    fontSize: 18,
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
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
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
  productDetails: {
    padding: 12,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
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
    width: 200,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  shopDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  shopName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#fff',
    marginBottom: 2,
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
  },
  shopFollowersText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 8,
  },
  resetButtonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    maxHeight: '75%',
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
});

export default HomeScreen;
