import React, { useState, useEffect, useRef } from "react";
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
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import supabase from "../../lib/supabase";
import ProductCard from "../../components/ProductCard";
import EmptyState from "../../components/ui/EmptyState";
import BannerCarousel from "../../components/ui/BannerCarousel";
import DynamicBanners from "../../components/ui/DynamicBanners";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import useRealtime from "../../hooks/useRealtime";
import Slider from "@react-native-community/slider";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// Sort options
const SortOptions = {
  NEWEST: { label: "Newest", value: "newest" },
  PRICE_LOW: { label: "Price: Low to High", value: "price_low" },
  PRICE_HIGH: { label: "Price: High to Low", value: "price_high" },
  POPULARITY: { label: "Popularity", value: "popularity" },
};

// Filter options
const FilterOptions = {
  ALL: { label: "All Products", value: "all" },
  IN_STOCK: { label: "In Stock", value: "in_stock" },
  ON_SALE: { label: "On Sale", value: "on_sale" },
  ON_ORDER: { label: "On Order", value: "on_order" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [likedProducts, setLikedProducts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [topShops, setTopShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [profile, setProfile] = useState(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Filtering and sorting states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState(FilterOptions.ALL.value);
  const [selectedSort, setSelectedSort] = useState(SortOptions.NEWEST.value);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Use the useRealtime hook to set up real-time updates
  const { subscribeToTable } = useRealtime('BrowseProductsScreen', {
    tables: ['products', 'product_views', 'product_likes', 'shops', 'shop_follows'],
    autoRefreshTables: ['products', 'shops'],
    refreshCallback: handleRealtimeUpdate,
  });

  // Handler for real-time updates
  function handleRealtimeUpdate(table, payload) {
    switch (table) {
      case 'products':
        // Handle product updates
        if (payload.eventType === 'INSERT') {
          // Add new product to the list
          const newProduct = {
            ...payload.new,
            in_stock: payload.new.is_on_order !== undefined
              ? !payload.new.is_on_order
              : payload.new.stock_quantity > 0,
          };
          setProducts(prev => [newProduct, ...prev]);
        } 
        else if (payload.eventType === 'UPDATE') {
          // Update existing product
          setProducts(prev => prev.map(product => 
            product.id === payload.new.id 
              ? {
                  ...product,
                  ...payload.new,
                  in_stock: payload.new.is_on_order !== undefined
                    ? !payload.new.is_on_order
                    : payload.new.stock_quantity > 0,
                }
              : product
          ));
        }
        else if (payload.eventType === 'DELETE') {
          // Remove deleted product
          setProducts(prev => prev.filter(product => product.id !== payload.old.id));
        }
        break;
        
      case 'shops':
        // Update shop data in real-time
        if (payload.eventType === 'UPDATE') {
          setTopShops(prev => prev.map(shop => 
            shop.id === payload.new.id ? { ...shop, ...payload.new } : shop
          ));
        }
        break;
        
      case 'product_views':
        // When a view is recorded, fetch the updated view count
        if (payload.eventType === 'INSERT') {
          fetchUpdatedViewCount(payload.new.product_id);
        }
        break;
        
      case 'product_likes':
        // When a like is added or removed
        if (payload.eventType === 'INSERT') {
          // Update liked products state
          if (user && payload.new.user_id === user.id) {
            setLikedProducts(prev => ({
              ...prev,
              [payload.new.product_id]: true
            }));
          }
        } 
        else if (payload.eventType === 'DELETE') {
          // Remove from liked products
          if (user && payload.old.user_id === user.id) {
            setLikedProducts(prev => {
              const newLikes = { ...prev };
              delete newLikes[payload.old.product_id];
              return newLikes;
            });
          }
        }
        break;
        
      case 'shop_follows':
        // When a shop is followed or unfollowed
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          fetchUpdatedShopFollowers(payload.new?.shop_id || payload.old?.shop_id);
        }
        break;
    }
  }

  // Function to fetch updated view count for a product
  const fetchUpdatedViewCount = async (productId) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("views_count")
        .eq("id", productId)
        .single();

      if (error) throw error;

      // Update the product's view count
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, views_count: data.views_count }
          : product
      ));
    } catch (error) {
      console.error("Error fetching updated view count:", error);
    }
  };

  // Function to fetch updated shop followers
  const fetchUpdatedShopFollowers = async (shopId) => {
    try {
      // Get updated follower count
      const { data, error } = await supabase
        .from("shops")
        .select("followers_count")
        .eq("id", shopId)
        .single();

      if (error) throw error;

      // Update the shops state
      setTopShops(prev => prev.map(shop => 
        shop.id === shopId 
          ? { ...shop, followers_count: data.followers_count }
          : shop
      ));
    } catch (error) {
      console.error("Error fetching updated shop followers:", error);
    }
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCartCount();
    fetchFeaturedProducts();
    fetchNotifications();
    fetchTopShops();
    if (user) {
      fetchLikedProducts();
      fetchUserProfile();
    }
  }, [shopId, user]); // Refetch when shopId changes

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

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("products")
        .select(
          `
          *,
          shop:shops(
            id,
            name
          )
        `
        )
        .order("created_at", { ascending: false });

      // Filter by shop if shopId is provided
      if (shopId) {
        query = query.eq("shop_id", shopId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process products to handle stock status correctly
      const processedData =
        data?.map((product) => ({
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
        .from("products")
        .select(
          `
          *,
          shop:shops(
            id,
            name
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (shopId) {
        query = query.eq("shop_id", shopId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process products to handle stock status correctly
      const processedData =
        data?.map((product) => ({
          ...product,
          in_stock:
            product.is_on_order !== undefined
              ? !product.is_on_order
              : product.stock_quantity > 0,
        })) || [];

      setFeaturedProducts(processedData);
    } catch (error) {
      console.error("Error fetching featured products:", error.message);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error.message);
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

  // Fetch user profile to get first name
  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("firstname, lastname")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    }
  };

  // Get icon for category
  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
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

  // Navigate to shop details
  const handleShopPress = (shopId) => {
    navigation.navigate("ShopDetails", { shopId });
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

    // Apply category filter - using selectedCategories array instead of selectedCategory string
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

  // Get filtered and limited products
  const getDisplayedProducts = () => {
    const filtered = getFilteredProducts();
    return showAllProducts ? filtered : filtered.slice(0, 6);
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

  const handleExplore = (banner) => {
    // Handle banner explore button press based on banner type
    switch (banner.id) {
      case "1":
        // Best products
        setSelectedSort(SortOptions.POPULARITY.value);
        break;
      case "2":
        // Special offers
        setSelectedFilter(FilterOptions.ON_SALE.value);
        break;
      case "3":
        // New arrivals
        setSelectedSort(SortOptions.NEWEST.value);
        break;
      case "4":
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
          .from("notifications")
          .update({ read: true })
          .eq("id", notification.id);

        if (error) throw error;

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => prev - 1);
      } catch (error) {
        console.error("Error marking notification as read:", error.message);
      }
    }

    // Handle notification action based on type
    switch (notification.type) {
      case "order_update":
        navigation.navigate("OrderDetails", { orderId: notification.order_id });
        break;
      case "new_product":
        navigation.navigate("ProductDetails", {
          productId: notification.product_id,
        });
        break;
      case "shop_update":
        navigation.navigate("ShopDetails", { shopId: notification.shop_id });
        break;
      default:
        break;
    }
  };

  // Add fetchTopShops function
  const fetchTopShops = async () => {
    try {
      setLoadingShops(true);

      // Get all shops with follower counts using a more efficient query
      const { data, error } = await supabase
        .from("shops")
        .select(
          `
          id, 
          name, 
          logo_url,
          followers:shop_follows(count)
        `
        )
        .limit(10);

      if (error) throw error;

      // Process the data to get follower counts
      const shopsWithFollowers = data.map((shop) => ({
        ...shop,
        followers_count: shop.followers?.[0]?.count || 0,
      }));

      // Sort shops by follower count (highest first)
      shopsWithFollowers.sort((a, b) => b.followers_count - a.followers_count);

      setTopShops(shopsWithFollowers);
    } catch (error) {
      console.error("Error fetching top shops:", error.message);
    } finally {
      setLoadingShops(false);
    }
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  // Update the notifications icon in the header
  const renderNotificationsIcon = () => (
    <TouchableOpacity
      style={styles.iconButtonContainer}
      onPress={() => navigation.navigate("Notifications")}
    >
      <Ionicons
        name="notifications-outline"
        size={24}
        color={COLORS.textPrimary}
      />
      {unreadCount > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationCount}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Modern Header with User Info */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {user ? (
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {profile?.firstname 
                    ? profile.firstname[0].toUpperCase() 
                    : user?.email?.[0].toUpperCase() || "U"}
                </Text>
              </View>
              <View>
                <Text style={styles.greeting}>Welcome back</Text>
                <Text style={styles.userName}>
                  {profile?.firstname || user?.email?.split("@")[0] || "User"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>E-Shopping</Text>
            </View>
          )}
          <View style={styles.headerActions}>
            {user ? (
              <>
                <TouchableOpacity
                  style={styles.iconButtonContainer}
                  onPress={() => navigation.navigate("Favorites")}
                >
                  <Ionicons
                    name="heart-outline"
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButtonContainer}
                  onPress={() => navigation.navigate("CartTab", { screen: "Cart" })}
                >
                  <Ionicons
                    name="cart-outline"
                    size={22}
                    color={COLORS.textPrimary}
                  />
                  {cartCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartCount}>{cartCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate("Auth", { screen: "Login" })}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            )}
            {renderNotificationsIcon()}
          </View>
        </View>
      </View>

      {/* Modern Search Bar */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchContainer,
            isSearchFocused && styles.searchContainerFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={isSearchFocused ? COLORS.primary : COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, shops, categories..."
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
            <MaterialCommunityIcons
              name="tune-vertical"
              size={22}
              color={COLORS.textSecondary}
            />
            {(selectedSort !== "newest" ||
              priceRange[1] !== 10000 ||
              selectedCategories.length > 0 ||
              inStockOnly ||
              onSaleOnly) && <View style={styles.filterBadge} />}
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
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Dynamic Banners */}
        <DynamicBanners onBannerPress={handleExplore} navigation={navigation} />

        {/* Categories Horizontal Scroll */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesList}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategories.length === 0 && styles.selectedCategoryChip,
              ]}
              onPress={() => setSelectedCategories([])}
            >
              <View style={styles.categoryIconContainer}>
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={
                    selectedCategories.length === 0 ? "#fff" : COLORS.textSecondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategories.length === 0 && styles.selectedCategoryText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
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
                    setSelectedCategories((prev) => [...prev, category.value]);
                  }
                }}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons
                    name={category.icon}
                    size={16}
                    color={
                      selectedCategories.includes(category.value)
                        ? "#fff"
                        : COLORS.textSecondary
                    }
                  />
                </View>
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
          </ScrollView>
        </View>

        {/* Top Shops Section with Modern Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Shops</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("Shops")}
            >
              <Text style={styles.viewAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loadingShops ? (
            <View style={styles.loadingShopsContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingShopsText}>Loading shops...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.topShopsContainer}
              contentContainerStyle={styles.topShopsContent}
            >
              {topShops.map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={styles.shopCard}
                  onPress={() =>
                    navigation.navigate("ShopDetails", { shopId: shop.id })
                  }
                >
                  <View style={styles.shopImageContainer}>
                    {shop.logo_url ? (
                      <Image
                        source={{ uri: shop.logo_url }}
                        style={styles.shopImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.shopImagePlaceholder}>
                        <Text style={styles.shopImagePlaceholderText}>
                          {shop.name && shop.name[0]
                            ? shop.name[0].toUpperCase()
                            : "S"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.topShopName} numberOfLines={1}>
                    {shop.name}
                  </Text>
                  <View style={styles.shopMetaContainer}>
                    <View style={styles.shopStats}>
                      <Ionicons name="people" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.shopStatsText}>
                        {shop.followers_count || 0}
                      </Text>
                    </View>
                    <View style={styles.shopStats}>
                      <Ionicons name="star" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.shopStatsText}>
                        {shop.rating?.toFixed(1) || "0.0"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {shopId
                ? `Products from ${shopName || "Shop"}`
                : "Featured Products"}
            </Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("AllProducts")}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : getDisplayedProducts().length === 0 ? (
            <EmptyState
              title="No products found"
              message="We couldn't find any products matching your criteria."
              icon="basket-outline"
            />
          ) : (
            <>
              {/* Products Grid with Shadow and Improved Layout */}
              <View style={styles.productsGrid}>
                {getDisplayedProducts().map((item) => (
                  <View key={item.id} style={styles.productCardWrapper}>
                    <ProductCard
                      product={item}
                      onPress={() => handleProductPress(item)}
                      onLikePress={handleLikePress}
                      isLiked={likedProducts[item.id]}
                      onAddToCart={handleAddToCart}
                      style={styles.productCardCustom}
                    />
                  </View>
                ))}
              </View>

              {/* Improved View More Button */}
              {!showAllProducts && filteredProducts.length > 6 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setShowAllProducts(true)}
                >
                  <Text style={styles.viewMoreText}>View More Products</Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modern Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close-circle" size={26} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalDivider} />

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {[
                    { label: "Newest", value: "newest", icon: "time-outline" },
                    { label: "Price: Low to High", value: "price_low", icon: "trending-up-outline" },
                    { label: "Price: High to Low", value: "price_high", icon: "trending-down-outline" },
                    { label: "Most Popular", value: "popularity", icon: "flame-outline" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        selectedSort === option.value && styles.selectedSortOption,
                      ]}
                      onPress={() => setSelectedSort(option.value)}
                    >
                      <Ionicons 
                        name={option.icon} 
                        size={18} 
                        color={selectedSort === option.value ? "#fff" : COLORS.textSecondary} 
                      />
                      <Text
                        style={[
                          styles.sortOptionText,
                          selectedSort === option.value && styles.selectedSortOptionText,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Range with improved slider */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.priceRangeContainer}>
                  <View style={styles.priceRangeValues}>
                    <Text style={styles.priceRangeValue}>N${formatPrice(priceRange[0])}</Text>
                    <Text style={styles.priceRangeValue}>N${formatPrice(priceRange[1])}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10000}
                    step={100}
                    value={priceRange[1]}
                    onValueChange={(value) => setPriceRange([priceRange[0], value])}
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={COLORS.primary}
                  />
                </View>
              </View>

              {/* Categories with better grid layout */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categories</Text>
                <View style={styles.modalCategoriesGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.modalCategoryChip,
                        selectedCategories.includes(category.value) && styles.selectedModalCategoryChip,
                      ]}
                      onPress={() => {
                        if (selectedCategories.includes(category.value)) {
                          setSelectedCategories((prev) => prev.filter((c) => c !== category.value));
                        } else {
                          setSelectedCategories((prev) => [...prev, category.value]);
                        }
                      }}
                    >
                      <Ionicons
                        name={category.icon}
                        size={18}
                        color={selectedCategories.includes(category.value) ? "#fff" : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.modalCategoryText,
                          selectedCategories.includes(category.value) && styles.selectedModalCategoryText,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Additional Filters with modern toggle buttons */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Additional Filters</Text>
                <View style={styles.additionalFilters}>
                  <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setInStockOnly(!inStockOnly)}
                  >
                    <View style={[styles.toggleSwitch, inStockOnly && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleKnob, inStockOnly && styles.toggleKnobActive]} />
                    </View>
                    <Text style={styles.filterToggleText}>In Stock Only</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setOnSaleOnly(!onSaleOnly)}
                  >
                    <View style={[styles.toggleSwitch, onSaleOnly && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleKnob, onSaleOnly && styles.toggleKnobActive]} />
                    </View>
                    <Text style={styles.filterToggleText}>On Sale Only</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

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
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    ...SHADOWS.small,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: FONTS.semiBold,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f6fa",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  searchContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: "#fff",
  },
  categorySection: {
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  categoriesContainer: {
    marginTop: 10,
  },
  categoriesList: {
    paddingRight: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    gap: 6,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  categoryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f6fa",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCategoryChip: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  selectedCategoryText: {
    color: "#fff",
  },
  section: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.medium,
    marginRight: 2,
  },
  topShopsContainer: {
    paddingLeft: 20,
  },
  topShopsContent: {
    paddingRight: 20,
    gap: 15,
  },
  shopCard: {
    width: 110,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    ...SHADOWS.small,
  },
  shopImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
    backgroundColor: "#f5f6fa",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
    ...SHADOWS.small,
  },
  shopImage: {
    width: "100%",
    height: "100%",
  },
  shopImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  shopImagePlaceholderText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontFamily: FONTS.semiBold,
  },
  topShopName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 5,
    fontFamily: FONTS.medium,
  },
  shopMetaContainer: {
    flexDirection: "row",
    gap: 10,
  },
  shopStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  shopStatsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  loadingShopsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingShopsText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  productsSection: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  productCardWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  productCardCustom: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
    ...SHADOWS.small,
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.small,
  },
  viewMoreText: {
    fontSize: 15,
    color: COLORS.primary,
    marginRight: 8,
    fontFamily: FONTS.medium,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B6B",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  notificationCount: {
    color: "#fff",
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  closeButton: {
    padding: 5,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginHorizontal: 20,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    gap: 10,
  },
  resetButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  resetButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  applyButton: {
    flex: 2,
    padding: 15,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.small,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
    fontFamily: FONTS.semiBold,
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f5f6fa",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  selectedSortOption: {
    backgroundColor: COLORS.primary,
  },
  sortOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  selectedSortOptionText: {
    color: "#fff",
  },
  priceRangeContainer: {
    padding: 10,
  },
  priceRangeValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceRangeValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  modalCategoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f5f6fa",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  selectedModalCategoryChip: {
    backgroundColor: COLORS.primary,
  },
  modalCategoryText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  selectedModalCategoryText: {
    color: "#fff",
  },
  additionalFilters: {
    gap: 15,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 5,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    padding: 2,
    justifyContent: "center",
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    ...SHADOWS.small,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  filterToggleText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  loginButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.small,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: COLORS.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  cartCount: {
    color: "#fff",
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
});

export default BrowseProductsScreen;
