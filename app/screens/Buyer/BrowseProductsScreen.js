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
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";

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
  const { colors } = useTheme();

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
  const [followedShops, setFollowedShops] = useState({});

  // Use the useRealtime hook to set up real-time updates
  const { subscribeToTable } = useRealtime("BrowseProductsScreen", {
    tables: [
      "products",
      "product_views",
      "product_likes",
      "shops",
      "shop_follows",
    ],
    autoRefreshTables: ["products", "shops"],
    refreshCallback: handleRealtimeUpdate,
  });

  // Handler for real-time updates
  function handleRealtimeUpdate(table, payload) {
    switch (table) {
      case "products":
        if (payload.eventType === "INSERT") {
          const newProduct = {
            ...payload.new,
            in_stock:
              payload.new.is_on_order !== undefined
                ? !payload.new.is_on_order
                : payload.new.stock_quantity > 0,
          };
          setProducts((prev) => [newProduct, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setProducts((prev) =>
            prev.map((product) =>
              product.id === payload.new.id
                ? {
                    ...product,
                    ...payload.new,
                    in_stock:
                      payload.new.is_on_order !== undefined
                        ? !payload.new.is_on_order
                        : payload.new.stock_quantity > 0,
                  }
                : product,
            ),
          );
        } else if (payload.eventType === "DELETE") {
          setProducts((prev) =>
            prev.filter((product) => product.id !== payload.old.id),
          );
        }
        break;

      case "shops":
        if (payload.eventType === "UPDATE") {
          setTopShops((prev) =>
            prev.map((shop) =>
              shop.id === payload.new.id ? { ...shop, ...payload.new } : shop,
            ),
          );
        }
        break;

      case "product_views":
        if (payload.eventType === "INSERT") {
          fetchUpdatedViewCount(payload.new.product_id);
        }
        break;

      case "product_likes":
        if (payload.eventType === "INSERT") {
          if (user && payload.new.user_id === user.id) {
            setLikedProducts((prev) => ({
              ...prev,
              [payload.new.product_id]: true,
            }));
          }
        } else if (payload.eventType === "DELETE") {
          if (user && payload.old.user_id === user.id) {
            setLikedProducts((prev) => {
              const newLikes = { ...prev };
              delete newLikes[payload.old.product_id];
              return newLikes;
            });
          }
        }
        break;

      case "shop_follows":
        if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
          fetchUpdatedShopFollowers(
            payload.new?.shop_id || payload.old?.shop_id,
          );
        }
        break;
    }
  }

  const fetchUpdatedViewCount = async (productId) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("views_count")
        .eq("id", productId)
        .single();

      if (error) throw error;

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? { ...product, views_count: data.views_count }
            : product,
        ),
      );
    } catch (error) {
      console.error("Error fetching updated view count:", error);
    }
  };

  const fetchUpdatedShopFollowers = async (shopId) => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("followers_count")
        .eq("id", shopId)
        .single();

      if (error) throw error;

      setTopShops((prev) =>
        prev.map((shop) =>
          shop.id === shopId
            ? { ...shop, followers_count: data.followers_count }
            : shop,
        ),
      );
    } catch (error) {
      console.error("Error fetching updated shop followers:", error);
    }
  };

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
      fetchFollowedShops();
    }
  }, [shopId, user]);

  const formatPrice = (price) => {
    if (!price) return "0.00";
    return parseFloat(price)
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

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
        `,
        )
        .order("created_at", { ascending: false });

      if (shopId) {
        query = query.eq("shop_id", shopId);
      }

      const { data, error } = await query;

      if (error) throw error;

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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .not("category", "is", null);

      if (error) throw error;

      if (data) {
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

  const fetchCartCount = async () => {
    setCartCount(0);
    return;
  };

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
        `,
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (shopId) {
        query = query.eq("shop_id", shopId);
      }

      const { data, error } = await query;

      if (error) throw error;

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

  const fetchUserProfile = async (retries = 3) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("firstname, lastname")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return fetchUserProfile(retries - 1);
      }
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    }
  };

  const fetchFollowedShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_follows")
        .select("shop_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const follows = {};
      data.forEach((follow) => {
        follows[follow.shop_id] = true;
      });
      setFollowedShops(follows);
    } catch (error) {
      console.error("Error fetching followed shops:", error);
    }
  };

  const handleFollowShop = async (shopId) => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to follow shops.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Auth", { screen: "Login" }),
        },
      ]);
      return;
    }

    try {
      const isFollowing = followedShops[shopId];

      if (isFollowing) {
        const { error } = await supabase
          .from("shop_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("shop_id", shopId);

        if (error) throw error;

        setFollowedShops((prev) => {
          const updated = { ...prev };
          delete updated[shopId];
          return updated;
        });

        setTopShops((prev) =>
          prev.map((shop) =>
            shop.id === shopId
              ? { ...shop, followers_count: (shop.followers_count || 1) - 1 }
              : shop,
          ),
        );
      } else {
        const { error } = await supabase
          .from("shop_follows")
          .insert([{ user_id: user.id, shop_id: shopId }]);

        if (error) throw error;

        setFollowedShops((prev) => ({
          ...prev,
          [shopId]: true,
        }));

        setTopShops((prev) =>
          prev.map((shop) =>
            shop.id === shopId
              ? { ...shop, followers_count: (shop.followers_count || 0) + 1 }
              : shop,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      Alert.alert("Error", "Failed to update follow status");
    }
  };

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleProductPress = (product) => {
    navigation.navigate("ProductDetails", { product });
  };

  const handleShopPress = (shopId) => {
    navigation.navigate("ShopDetails", { shopId });
  };

  const getFilteredProducts = () => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.shop?.name.toLowerCase().includes(query),
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) =>
        selectedCategories.includes(product.category),
      );
    }

    filtered = filtered.filter(
      (product) =>
        product.price >= priceRange[0] && product.price <= priceRange[1],
    );

    if (inStockOnly) {
      filtered = filtered.filter((product) => product.in_stock);
    }

    if (onSaleOnly) {
      filtered = filtered.filter((product) => product.is_on_sale);
    }

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
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        break;
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  const getDisplayedProducts = () => {
    const filtered = getFilteredProducts();
    return showAllProducts ? filtered : filtered.slice(0, 6);
  };

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
        ],
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
    switch (banner.id) {
      case "1":
        setSelectedSort(SortOptions.POPULARITY.value);
        break;
      case "2":
        setSelectedFilter(FilterOptions.ON_SALE.value);
        break;
      case "3":
        setSelectedSort(SortOptions.NEWEST.value);
        break;
      case "4":
        break;
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notification.id);

        if (error) throw error;

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
        setUnreadCount((prev) => prev - 1);
      } catch (error) {
        console.error("Error marking notification as read:", error.message);
      }
    }

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

  const fetchTopShops = async () => {
    try {
      setLoadingShops(true);

      const { data, error } = await supabase
        .from("shops")
        .select(
          `
          id, 
          name, 
          logo_url,
          followers:shop_follows(count)
        `,
        )
        .limit(10);

      if (error) throw error;

      const shopsWithFollowers = data.map((shop) => ({
        ...shop,
        followers_count: shop.followers?.[0]?.count || 0,
      }));

      shopsWithFollowers.sort((a, b) => b.followers_count - a.followers_count);

      const shopsWithRatings = await Promise.all(
        shopsWithFollowers.map(async (shop) => {
          try {
            const { data: ratingsData, error: ratingsError } = await supabase
              .from("shop_ratings")
              .select("rating")
              .eq("shop_id", shop.id);

            if (ratingsError) throw ratingsError;

            if (ratingsData && ratingsData.length > 0) {
              const totalRatings = ratingsData.length;
              const avgRating =
                ratingsData.reduce((acc, curr) => acc + curr.rating, 0) /
                totalRatings;
              return {
                ...shop,
                rating: avgRating,
                ratings_count: totalRatings,
              };
            }

            return shop;
          } catch (error) {
            console.error(`Error fetching ratings for shop ${shop.id}:`, error);
            return shop;
          }
        }),
      );

      setTopShops(shopsWithRatings);
    } catch (error) {
      console.error("Error fetching top shops:", error.message);
    } finally {
      setLoadingShops(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading products...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  const renderNotificationsIcon = () => (
    <TouchableOpacity
      style={[
        styles.iconButtonContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
      onPress={() => navigation.navigate("Notifications")}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {unreadCount > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationCount}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          {user ? (
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {profile?.firstname
                    ? profile.firstname[0].toUpperCase()
                    : user?.email?.[0].toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.userTextContainer}>
                <Text style={styles.greeting}>Hello,</Text>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {profile?.firstname || user?.email?.split("@")[0] || "User"}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.logoText, { color: colors.text }]}>
                ShopIt
              </Text>
              <View style={styles.logoDot} />
            </View>
          )}

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconButtonContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => navigation.navigate("getNearbyShops")}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            {user ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.iconButtonContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => navigation.navigate("Favorites")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="heart-outline"
                    size={22}
                    color={colors.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.iconButtonContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate("CartTab", { screen: "Cart" })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="bag-outline" size={22} color={colors.text} />
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
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
              </TouchableOpacity>
            )}
            {renderNotificationsIcon()}
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={[styles.searchWrapper, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.searchContainer,
            isSearchFocused && styles.searchContainerFocused,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={isSearchFocused ? "#C4A77D" : "#9B9B9B"}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products, shops, categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholderTextColor="#BEBEBE"
          />
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.card }]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={20} color={colors.text} />
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesList}
          >
            {/* ── FIX: "All" chip ── */}
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCategories.length === 0 && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setSelectedCategories([])}
            >
              {/* ── FIX: icon container bg uses colors.border ── */}
              <View style={[styles.categoryIconContainer]}>
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={
                    selectedCategories.length === 0
                      ? "#fff"
                      : COLORS.textSecondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      selectedCategories.length === 0 ? "#fff" : colors.text,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {/* ── FIX: other category chips ── */}
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.value);
              return (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                    isSelected && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedCategories((prev) =>
                        prev.filter((c) => c !== category.value),
                      );
                    } else {
                      setSelectedCategories((prev) => [
                        ...prev,
                        category.value,
                      ]);
                    }
                  }}
                >
                  {/* ── FIX: icon container bg uses colors.border ── */}
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name={category.icon}
                      size={16}
                      color={isSelected ? "#fff" : COLORS.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryText,
                      { color: isSelected ? "#fff" : colors.text },
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Top Shops Section with Modern Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Top Shops
            </Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("Shops")}
            >
              <Text style={[styles.viewAllText, { color: colors.text }]}>
                See All
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {loadingShops ? (
            <View
              style={[
                styles.loadingShopsContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={styles.loadingShopsText}>Loading shops...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.topShopsContainer}
              contentContainerStyle={styles.topShopsContent}
            >
              {topShops.map((shop, index) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[
                    styles.modernShopCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate("ShopDetails", { shopId: shop.id })
                  }
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.card, colors.card]}
                    style={styles.shopCardGradient}
                  >
                    {index < 3 && (
                      <View
                        style={[
                          styles.topBadge,
                          index === 0
                            ? styles.goldBadge
                            : index === 1
                              ? styles.silverBadge
                              : styles.bronzeBadge,
                        ]}
                      >
                        <Ionicons
                          name={
                            index === 0
                              ? "trophy"
                              : index === 1
                                ? "medal"
                                : "ribbon"
                          }
                          size={12}
                          color="#fff"
                        />
                        <Text style={styles.badgeText}>#{index + 1}</Text>
                      </View>
                    )}

                    <View style={styles.modernShopImageContainer}>
                      <View style={[styles.imageRing]}>
                        {shop.logo_url ? (
                          <Image
                            source={{ uri: shop.logo_url }}
                            style={styles.modernShopImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={["#C4A77D", "#8B7355"]}
                            style={styles.modernShopImagePlaceholder}
                          >
                            <Text
                              style={[
                                styles.modernShopImagePlaceholderText,
                                { color: colors.text },
                              ]}
                            >
                              {shop.name && shop.name[0]
                                ? shop.name[0].toUpperCase()
                                : "S"}
                            </Text>
                          </LinearGradient>
                        )}

                        <View style={styles.verifiedBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#4CAF50"
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.modernShopInfo}>
                      <Text
                        style={[styles.modernShopName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {shop.name}
                      </Text>

                      <View style={styles.modernStatsRow}>
                        <View style={styles.statItem}>
                          <View style={styles.statIconContainer}>
                            <Ionicons name="people" size={12} color="#C4A77D" />
                          </View>
                          <Text
                            style={[styles.statNumber, { color: colors.text }]}
                          >
                            {shop.followers_count > 999
                              ? `${(shop.followers_count / 1000).toFixed(1)}k`
                              : shop.followers_count || 0}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statDivider,
                            { backgroundColor: colors.border },
                          ]}
                        />

                        <View style={styles.statItem}>
                          <View style={styles.statIconContainer}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                          </View>
                          <Text
                            style={[styles.statNumber, { color: colors.text }]}
                          >
                            {shop.rating?.toFixed(1) || "0.0"}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.modernFollowButton,
                          followedShops[shop.id] && styles.followingButton,
                        ]}
                        onPress={() => handleFollowShop(shop.id)}
                      >
                        <Ionicons
                          name={followedShops[shop.id] ? "checkmark" : "add"}
                          size={12}
                          color={followedShops[shop.id] ? "#4CAF50" : "#C4A77D"}
                        />
                        <Text
                          style={[
                            [styles.followButtonText, { color: colors.text }],
                            followedShops[shop.id] &&
                              styles.followingButtonText,
                          ]}
                        >
                          {followedShops[shop.id] ? "Following" : "Follow"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {shopId
                ? `Products from ${shopName || "Shop"}`
                : "Featured Products"}
            </Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("AllProducts")}
            >
              <Text style={[styles.viewAllText, { color: colors.text }]}>
                View All
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading products...
              </Text>
            </View>
          ) : getDisplayedProducts().length === 0 ? (
            <EmptyState
              title="No products found"
              message="We couldn't find any products matching your criteria."
              icon="basket-outline"
            />
          ) : (
            <>
              <View style={styles.productsGrid}>
                {getDisplayedProducts().map((item) => (
                  <View key={item.id} style={styles.productCardWrapper}>
                    <ProductCard
                      product={item}
                      onPress={() => handleProductPress(item)}
                      onLikePress={handleLikePress}
                      isLiked={likedProducts[item.id]}
                      onAddToCart={handleAddToCart}
                      style={[
                        styles.productCardCustom,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>

              {!showAllProducts && filteredProducts.length > 6 && (
                <TouchableOpacity
                  style={[
                    styles.viewMoreButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowAllProducts(true)}
                >
                  <Text style={[styles.viewMoreText, { color: colors.text }]}>
                    View More Products
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={colors.text}
                  />
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
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 80}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Filter Products
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close-circle" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.modalDivider, { backgroundColor: colors.border }]}
            />

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.filterSectionTitle, { color: colors.text }]}
                >
                  Sort By
                </Text>
                <View style={styles.sortOptions}>
                  {[
                    { label: "Newest", value: "newest", icon: "time-outline" },
                    {
                      label: "Price: Low to High",
                      value: "price_low",
                      icon: "trending-up-outline",
                    },
                    {
                      label: "Price: High to Low",
                      value: "price_high",
                      icon: "trending-down-outline",
                    },
                    {
                      label: "Most Popular",
                      value: "popularity",
                      icon: "flame-outline",
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        selectedSort === option.value &&
                          styles.selectedSortOption,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => setSelectedSort(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={
                          selectedSort === option.value
                            ? "#fff"
                            : COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.sortOptionText,
                          selectedSort === option.value &&
                            styles.selectedSortOptionText,
                          { color: colors.text },
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
                <Text
                  style={[styles.filterSectionTitle, { color: colors.text }]}
                >
                  Price Range
                </Text>
                <View style={styles.priceRangeContainer}>
                  <View style={styles.priceRangeValues}>
                    <Text
                      style={[styles.priceRangeValue, { color: colors.text }]}
                    >
                      N${formatPrice(priceRange[0])}
                    </Text>
                    <Text
                      style={[styles.priceRangeValue, { color: colors.text }]}
                    >
                      N${formatPrice(priceRange[1])}
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10000}
                    step={100}
                    value={priceRange[1]}
                    onValueChange={(value) =>
                      setPriceRange([priceRange[0], value])
                    }
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={COLORS.primary}
                  />
                </View>
              </View>

              {/* Categories */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.filterSectionTitle, { color: colors.text }]}
                >
                  Categories
                </Text>
                <View style={styles.modalCategoriesGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.modalCategoryChip,
                        selectedCategories.includes(category.value) &&
                          styles.selectedModalCategoryChip,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        if (selectedCategories.includes(category.value)) {
                          setSelectedCategories((prev) =>
                            prev.filter((c) => c !== category.value),
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
                        size={18}
                        color={
                          selectedCategories.includes(category.value)
                            ? "#fff"
                            : colors.text
                        }
                      />
                      <Text
                        style={[
                          styles.modalCategoryText,
                          selectedCategories.includes(category.value) &&
                            styles.selectedModalCategoryText,
                          { color: colors.text },
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
                <Text
                  style={[styles.filterSectionTitle, { color: colors.text }]}
                >
                  Additional Filters
                </Text>
                <View style={styles.additionalFilters}>
                  <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setInStockOnly(!inStockOnly)}
                  >
                    <View
                      style={[
                        styles.toggleSwitch,
                        inStockOnly && styles.toggleSwitchActive,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleKnob,
                          inStockOnly && styles.toggleKnobActive,
                          { backgroundColor: colors.text },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.filterToggleText, { color: colors.text }]}
                    >
                      In Stock Only
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setOnSaleOnly(!onSaleOnly)}
                  >
                    <View
                      style={[
                        styles.toggleSwitch,
                        onSaleOnly && styles.toggleSwitchActive,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleKnob,
                          onSaleOnly && styles.toggleKnobActive,
                          { backgroundColor: colors.text },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.filterToggleText, { color: colors.text }]}
                    >
                      On Sale Only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => {
                  setSelectedSort("newest");
                  setPriceRange([0, 10000]);
                  setSelectedCategories([]);
                  setInStockOnly(false);
                  setOnSaleOnly(false);
                }}
              >
                <Text style={[styles.resetButtonText, { color: colors.text }]}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.applyButtonText, { color: colors.text }]}>
                  Apply Filters
                </Text>
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
    backgroundColor: "#FAFAF8",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userTextContainer: {
    marginLeft: 14,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  greeting: {
    fontSize: 14,
    color: "#9B9B9B",
    fontFamily: FONTS.regular,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    color: "#1A1A1A",
    fontFamily: FONTS.bold,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButtonContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FAFAF8",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C4A77D",
    marginLeft: 4,
  },
  searchWrapper: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF8",
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 54,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  searchContainerFocused: {
    borderColor: "#C4A77D",
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    fontFamily: FONTS.regular,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  categorySection: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  categoriesContainer: {
    marginTop: 14,
  },
  categoriesList: {
    paddingRight: 24,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    // NOTE: backgroundColor and borderColor are intentionally NOT set here.
    // They are applied dynamically via inline styles so dark mode works correctly.
    gap: 10,
    borderWidth: 1.5,
  },
  // categoryIconContainer: {
  //   width: 32,
  //   height: 32,
  //   borderRadius: 12,
  //   // NOTE: backgroundColor is applied dynamically via inline style
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  selectedCategoryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    // NOTE: color is applied dynamically via inline style
  },
  selectedCategoryText: {
    color: COLORS.white,
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
    paddingLeft: 0,
  },
  topShopsContent: {
    paddingHorizontal: 20,
    gap: 15,
  },
  modernShopCard: {
    width: 160,
    height: 190,
    borderRadius: 12,
    marginRight: 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#fff",
    ...SHADOWS.small,
  },
  shopCardGradient: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    padding: 12,
    justifyContent: "space-between",
  },
  topBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  goldBadge: {
    backgroundColor: "#FFD700",
  },
  silverBadge: {
    backgroundColor: "#C0C0C0",
  },
  bronzeBadge: {
    backgroundColor: "#CD7F32",
  },
  badgeText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: FONTS.bold,
  },
  modernShopImageContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  imageRing: {
    position: "relative",
    padding: 3,
    borderRadius: 50,
    backgroundColor: "rgba(196, 167, 125, 0.15)",
  },
  modernShopImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  modernShopImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  modernShopImagePlaceholderText: {
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: FONTS.bold,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  modernShopInfo: {
    alignItems: "center",
    paddingTop: 6,
  },
  modernShopName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
    fontFamily: FONTS.bold,
  },
  modernStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "rgba(196, 167, 125, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(196, 167, 125, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(196, 167, 125, 0.25)",
    marginHorizontal: 8,
  },
  modernFollowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(196, 167, 125, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    paddingBottom: Platform.OS === "android" ? 6 : 4,
    borderRadius: 12,
    gap: 3,
    minWidth: 65,
    height: 24,
  },
  followButtonText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  followingButton: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  followingButtonText: {
    color: "#4CAF50",
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
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    color: "#1A1A1A",
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  loginButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cartCount: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  productsSection: {
    paddingTop: 20,
    paddingBottom: 100,
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
    borderRadius: 14,
    backgroundColor: "#FAFAF8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
  },
  resetButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  applyButton: {
    flex: 2,
    padding: 15,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginBottom: 10,
  },
  sortOptions: {
    flexDirection: "row",
    gap: 10,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectedSortOption: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortOptionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  selectedSortOptionText: {
    color: "#fff",
  },
  priceRangeContainer: {
    marginBottom: 20,
  },
  priceRangeValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceRangeValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
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
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  selectedModalCategoryChip: {
    backgroundColor: COLORS.primary,
  },
  modalCategoryText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  selectedModalCategoryText: {
    color: "#fff",
  },
  additionalFilters: {
    flexDirection: "row",
    gap: 10,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleSwitch: {
    width: 40,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    position: "absolute",
  },
  toggleKnobActive: {
    left: 20,
  },
  filterToggleText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
});

export default BrowseProductsScreen;
