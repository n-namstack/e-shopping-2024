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
  ScrollView,
  Image,
  Platform,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
          <ActivityIndicator size="large" color={COLORS.accent} />
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
      style={styles.iconButton}
      onPress={() => {
        // Show notifications modal or navigate to notifications screen
        Alert.alert(
          "Notifications",
          notifications.length > 0
            ? notifications.map((n) => n.message).join("\n\n")
            : "No notifications",
          [{ text: "OK", onPress: () => {} }]
        );
      }}
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

      {/* Header with User Info */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {user ? (
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.email?.[0].toUpperCase() || "U"}
                </Text>
              </View>
              <View>
                <Text style={styles.greeting}>Hi,</Text>
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
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate("Favorites")}
              >
                <Ionicons
                  name="heart-outline"
                  size={24}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
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

      {/* Search Bar */}
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
            color={COLORS.textSecondary}
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
            <Ionicons
              name="options-outline"
              size={20}
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
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Replace BannerCarousel with DynamicBanners */}
        <DynamicBanners onBannerPress={handleExplore} navigation={navigation} />

        {/* Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {shopId
              ? `Products from ${shopName || "Shop"}`
              : "Browse Products"}
          </Text>
          {!shopId && topShops.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate("ShopsTab")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Top Shops Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Shops</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ShopsTab")}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          {loadingShops ? (
            <View style={styles.loadingShopsContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
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
                  <View style={styles.followersContainer}>
                    <Ionicons name="people" size={12} color="#666" />
                    <Text style={styles.followersCount}>
                      {shop.followers_count || 0} followers
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Categories */}
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
            <Ionicons
              name="grid-outline"
              size={16}
              color={
                selectedCategories.length === 0 ? "#fff" : COLORS.textSecondary
              }
            />
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
        </ScrollView>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Home", { screen: "AllProducts" })
              }
            >
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {getDisplayedProducts().map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onPress={() => handleProductPress(item)}
                onLikePress={handleLikePress}
                isLiked={likedProducts[item.id]}
                onAddToCart={handleAddToCart}
              />
            ))}
          </View>

          {/* View More Button */}
          {!showAllProducts && filteredProducts.length > 6 && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => setShowAllProducts(true)}
            >
              <Text style={styles.viewMoreText}>View More</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

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

            <ScrollView style={styles.modalBody}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {[
                    { label: "Newest", value: "newest" },
                    { label: "Price: Low to High", value: "price_low" },
                    { label: "Price: High to Low", value: "price_high" },
                    { label: "Most Popular", value: "popularity" },
                  ].map((option) => (
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
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2B3147",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: FONTS.medium
  },
  greeting: {
    fontSize: 16,
    color: "#666",
    fontFamily: FONTS.regular
  },
  userName: {
    fontSize: 20,
    // fontWeight: "600",
    color: "#2B3147",
    fontFamily: FONTS.medium
  },
  headerActions: {
    flexDirection: "row",
    gap: 15,
  },
  iconButton: {
    padding: 8,
    position: "relative",
  },
  searchWrapper: {
    paddingHorizontal: 20,
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
    marginLeft: 10,
    color: "#2B3147",
    fontFamily: FONTS.regular
  },
  filterButton: {
    padding: 8,
  },
  bannerSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  banner: {
    backgroundColor: "#3D3D7D",
    borderRadius: 15,
    padding: 20,
    height: 180,
  },
  bannerTitle: {
    fontSize: 28,
    // fontWeight: "700",
    color: "#fff",
    marginBottom: 5,
    fontFamily:FONTS.bold
  },
  bannerSubtitle: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.8,
    marginBottom: 20,
    fontFamily: FONTS.regular
  },
  bannerButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: "flex-start",
  },
  bannerButtonText: {
    color: "#3D3D7D",
    fontWeight: "600",
  },
  bannerDots: {
    flexDirection: "row",
    position: "absolute",
    bottom: 20,
    left: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
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
    // fontWeight: "500",
    fontFamily: FONTS.medium
  },
  selectedCategoryText: {
    color: "#fff",
  },
  productsSection: {
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    // fontWeight: "600",
    color: "#2B3147",
    fontFamily: FONTS.semiBold
  },
  seeAllButton: {
    color: "#666",
    fontSize: 16,
    fontFamily: FONTS.medium
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    paddingHorizontal: 20,
  },
  productCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    position: "relative",
  },
  productImageContainer: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    // fontWeight: "600",
    fontFamily: FONTS.semiBold
  },
  actionsContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    alignItems: "center",
  },
  likeButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 15,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    backgroundColor: "#F5F6FA",
    padding: 8,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    alignItems: "flex-start",
  },
  productNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    width: "100%",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B3147",
    marginLeft: 4,
    fontFamily: FONTS.semiBold
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    width: "100%",
  },
  shopName: {
    fontSize: 12,
    color: "#666",
    textAlign: "left",
    fontFamily: FONTS.regular
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    width: "100%",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2B3147",
    fontStyle: FONTS.bold
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    fontFamily: FONTS.regular
  },
  stockStatus: {
    fontSize: 12,
    color: "#4CAF50",
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
    fontFamily: FONTS.regular
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  productMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productMetaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  viewsCount: {
    fontSize: 11,
    color: "#666",
    marginLeft: 2,
    fontFamily: FONTS.regular
  },
  dateIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 2,
    fontFamily: FONTS.regular
  },
  section: {
    paddingVertical: 15,
  },
  topShopsContainer: {
    paddingLeft: 0,
    marginLeft: 20,
  },
  topShopsContent: {
    paddingRight: 20,
  },
  shopCard: {
    width: 100,
    marginRight: 15,
    alignItems: "center",
  },
  shopImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: "#F5F6FA",
    overflow: "hidden",
  },
  shopImage: {
    width: "100%",
    height: "100%",
  },
  shopImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2B3147",
    justifyContent: "center",
    alignItems: "center",
  },
  shopImagePlaceholderText: {
    fontSize: 24,
    // fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: FONTS.semiBold
  },
  topShopName: {
    fontSize: 14,
    // fontWeight: "500",
    color: "#2B3147",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: FONTS.medium
  },
  followersContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  followersCount: {
    fontSize: 12,
    color: "#666",
    fontFamily: FONTS.regular
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
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2B3147",
  },
  loginButton: {
    padding: 8,
    borderRadius: 15,
    backgroundColor: "#2B3147",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  filterBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
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
    fontWeight: "600",
    color: COLORS.textPrimary,
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
    fontWeight: "600",
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
    fontWeight: "600",
    fontFamily:FONTS.semiBold
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 10,
    fontFamily: FONTS.regular
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
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
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

export default BrowseProductsScreen;
