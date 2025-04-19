import React, { useState, useEffect } from "react";
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
  Modal,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../lib/supabase";
import ProductCard from "../../components/ProductCard";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import Slider from "@react-native-community/slider";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

// Sort options
const SortOptions = {
  NEWEST: { label: "Newest", value: "newest" },
  PRICE_LOW: { label: "Price: Low to High", value: "price_low" },
  PRICE_HIGH: { label: "Price: High to Low", value: "price_high" },
  POPULARITY: { label: "Popularity", value: "popularity" },
};

const AllProductsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { addToCart } = useCartStore();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [likedProducts, setLikedProducts] = useState({});
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Filtering states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState(SortOptions.NEWEST.value);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(6);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user) {
      fetchLikedProducts();
    }
  }, [user]);

  // Format price with commas
  const formatPrice = (price) => {
    if (!price) return "0.00";
    return parseFloat(price)
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
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

  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          shop:shops(
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process products to handle stock status
      const processedData = data?.map((product) => ({
        ...product,
        in_stock:
          product.is_on_order !== undefined
            ? !product.is_on_order
            : product.stock_quantity > 0,
      })) || [];

      setProducts(processedData);
    } catch (error) {
      console.error("Error fetching products:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch product categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .not("category", "is", null);

      if (error) throw error;

      if (data) {
        // Extract unique categories and add icons
        const uniqueCategories = [...new Set(data.map((item) => item.category))]
          .filter(Boolean)
          .sort()
          .map((category) => ({
            value: category,
            label: category,
            icon: getCategoryIcon(category),
          }));

        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error.message);
    }
  };

  // Fetch liked products
  const fetchLikedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("product_likes")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const likes = {};
      data.forEach((like) => {
        likes[like.product_id] = true;
      });
      setLikedProducts(likes);
    } catch (error) {
      console.error("Error fetching liked products:", error);
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case "electronics":
        return "hardware-chip-outline";
      case "clothing":
        return "shirt-outline";
      case "food":
        return "restaurant-outline";
      case "books":
        return "book-outline";
      case "home":
        return "home-outline";
      case "beauty":
        return "sparkles-outline";
      case "sports":
        return "fitness-outline";
      case "toys":
        return "game-controller-outline";
      default:
        return "grid-outline";
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Navigate to product details
  const handleProductPress = (product) => {
    navigation.navigate("ProductDetails", { product });
  };

  // Handle add to cart
  const handleAddToCart = async (product) => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "You need to login to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => navigation.navigate("Auth", { screen: "Login" }),
          },
        ]
      );
      return;
    }

    try {
      addToCart(product);
      Alert.alert("Success", "Item added to your cart!");
    } catch (error) {
      Alert.alert("Error", "Failed to add item to cart. Please try again.");
    }
  };

  // Handle like press
  const handleLikePress = async (productId) => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to like products.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Auth", { screen: "Login" }),
        },
      ]);
      return;
    }

    try {
      const isLiked = likedProducts[productId];

      if (isLiked) {
        // Unlike the product
        const { error } = await supabase
          .from("product_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        if (error) throw error;

        setLikedProducts((prev) => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });
      } else {
        // Like the product
        const { error } = await supabase
          .from("product_likes")
          .insert([{ user_id: user.id, product_id: productId }]);

        if (error) throw error;

        setLikedProducts((prev) => ({
          ...prev,
          [productId]: true,
        }));
      }
    } catch (error) {
      console.error("Error updating like:", error);
      Alert.alert("Error", "Failed to update like status");
    }
  };

  // Filter products based on selected options
  const getFilteredProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.shop?.name.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) =>
        selectedCategories.includes(product.category)
      );
    }

    // Apply price range filter
    filtered = filtered.filter(
      (product) =>
        product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Apply in stock filter
    if (inStockOnly) {
      filtered = filtered.filter((product) => product.in_stock);
    }

    // Apply on sale filter
    if (onSaleOnly) {
      filtered = filtered.filter((product) => product.is_on_sale);
    }

    // Apply sorting
    switch (selectedSort) {
      case "price_low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "popularity":
        filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case "newest":
      default:
        filtered.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        break;
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  
  // Get paginated products
  const displayedProducts = filteredProducts.slice(0, displayLimit);
  
  // Handle load more
  const handleLoadMore = () => {
    setDisplayLimit(prevLimit => prevLimit + 6);
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

  if (!fontsLoaded) {
    return null;
  }

  // ProductCard component customized for this screen
  const renderItem = ({ item }) => (
    <View style={styles.productCardContainer}>
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.8}
      >
        {/* Product Image */}
        <View style={styles.productImageContainer}>
          <Image
            source={{
              uri: item.images && item.images.length > 0
                ? item.images[0]
                : item.main_image,
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {/* Like Button */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleLikePress(item.id)}
          >
            <Ionicons
              name={likedProducts[item.id] ? "heart" : "heart-outline"}
              size={22}
              color={likedProducts[item.id] ? "#FF6B6B" : "#fff"}
            />
          </TouchableOpacity>
          
          {/* Cart Button */}
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => handleAddToCart(item)}
          >
            <Ionicons name="cart-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productTitleRow}>
            <Ionicons name="pricetag-outline" size={16} color="#0f172a" />
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          
          <View style={styles.shopRow}>
            <Ionicons name="storefront-outline" size={14} color="#64748b" />
            <Text style={styles.shopName}>@{item.shop?.name || 'Shop'}</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Ionicons name="cash-outline" size={16} color="#0f172a" />
            <Text style={styles.price}>N${formatPrice(item.price)}</Text>
          </View>
          
          <View style={styles.availabilityRow}>
            <Text 
              style={[
                styles.availabilityText,
                { color: item.in_stock ? '#4CAF50' : '#FF9800' }
              ]}
            >
              {item.in_stock ? 'Available' : 'On Order'}
            </Text>
            <View style={styles.statsContainer}>
              <Ionicons name="eye-outline" size={14} color="#64748b" />
              <Text style={styles.statsText}>{item.views_count || 0}</Text>
              <Text style={styles.statsText}> • {formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Products</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, shops, categ..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholderTextColor={COLORS.textLight}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {displayedProducts.length} {displayedProducts.length === 1 ? 'product' : 'products'} found
        </Text>
      </View>

      {/* Products List */}
      <FlatList
        data={displayedProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.productsGrid}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListFooterComponent={() => (
          filteredProducts.length > displayLimit ? (
            <TouchableOpacity 
              style={styles.viewMoreButton}
              onPress={handleLoadMore}
            >
              <Text style={styles.viewMoreText}>View More</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          ) : null
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filter criteria
            </Text>
          </View>
        )}
      />

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[1]} // Dummy data to use FlatList for scrolling
              keyExtractor={() => "filters"}
              renderItem={() => (
                <View style={styles.modalBody}>
                  {/* Sort Options */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Sort By</Text>
                    <View style={styles.sortOptions}>
                      {Object.values(SortOptions).map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.sortOption,
                            selectedSort === option.value &&
                              styles.selectedSortOption,
                          ]}
                          onPress={() => setSelectedSort(option.value)}
                        >
                          <Text
                            style={[
                              styles.sortOptionText,
                              selectedSort === option.value &&
                                styles.selectedSortOptionText,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Price Range */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Price Range</Text>
                    <View style={styles.priceRangeContainer}>
                      <Text style={styles.priceRangeText}>
                        N${formatPrice(priceRange[0])} - N$
                        {formatPrice(priceRange[1])}
                      </Text>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={10000}
                        step={100}
                        value={priceRange[1]}
                        onValueChange={(value) =>
                          setPriceRange([priceRange[0], value])
                        }
                        minimumTrackTintColor={COLORS.accent}
                        maximumTrackTintColor={COLORS.border}
                        thumbTintColor={COLORS.accent}
                      />
                    </View>
                  </View>

                  {/* Categories */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Categories</Text>
                    <View style={styles.categoriesGrid}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.value}
                          style={[
                            styles.categoryChip,
                            selectedCategories.includes(category.value) &&
                              styles.selectedCategoryChip,
                          ]}
                          onPress={() => {
                            if (selectedCategories.includes(category.value)) {
                              setSelectedCategories((prev) =>
                                prev.filter((c) => c !== category.value)
                              );
                            } else {
                              setSelectedCategories((prev) => [
                                ...prev,
                                category.value,
                              ]);
                            }
                          }}
                        >
                          <Ionicons
                            name={category.icon}
                            size={16}
                            color={
                              selectedCategories.includes(category.value)
                                ? "#fff"
                                : COLORS.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.categoryText,
                              selectedCategories.includes(category.value) &&
                                styles.selectedCategoryText,
                            ]}
                          >
                            {category.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Additional Filters */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>
                      Additional Filters
                    </Text>
                    <View style={styles.additionalFilters}>
                      <TouchableOpacity
                        style={styles.filterToggle}
                        onPress={() => setInStockOnly(!inStockOnly)}
                      >
                        <View
                          style={[
                            styles.toggleCircle,
                            inStockOnly && styles.toggleCircleActive,
                          ]}
                        >
                          {inStockOnly && (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.filterToggleText}>In Stock Only</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.filterToggle}
                        onPress={() => setOnSaleOnly(!onSaleOnly)}
                      >
                        <View
                          style={[
                            styles.toggleCircle,
                            onSaleOnly && styles.toggleCircleActive,
                          ]}
                        >
                          {onSaleOnly && (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.filterToggleText}>On Sale Only</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedSort("newest");
                  setPriceRange([0, 10000]);
                  setSelectedCategories([]);
                  setInStockOnly(false);
                  setOnSaleOnly(false);
                }}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  placeholder: {
    width: 40,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  searchContainerFocused: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2B3147",
    fontFamily: FONTS.regular,
  },
  filterButton: {
    padding: 8,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  productsGrid: {
    padding: 8,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCardContainer: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productCard: {
    width: '100%',
  },
  productImageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#f6f6f6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    position: 'absolute',
    top: 8,
    right: 52,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#0f172a',
    marginLeft: 6,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shopName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginLeft: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#0f172a',
    marginLeft: 6,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontFamily: FONTS.regular,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  resetButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#F5F6FA",
    alignItems: "center",
  },
  resetButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  applyButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 10,
    fontFamily: FONTS.semiBold,
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sortOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F6FA",
  },
  selectedSortOption: {
    backgroundColor: COLORS.accent,
  },
  sortOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  selectedSortOptionText: {
    color: "#fff",
  },
  priceRangeContainer: {
    padding: 10,
  },
  priceRangeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
    fontFamily: FONTS.regular,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F6FA",
    gap: 6,
  },
  selectedCategoryChip: {
    backgroundColor: COLORS.accent,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  selectedCategoryText: {
    color: "#fff",
  },
  additionalFilters: {
    gap: 15,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleCircleActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterToggleText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewMoreText: {
    fontSize: 16,
    color: COLORS.accent,
    marginRight: 8,
    fontFamily: FONTS.medium,
  },
});

export default AllProductsScreen; 