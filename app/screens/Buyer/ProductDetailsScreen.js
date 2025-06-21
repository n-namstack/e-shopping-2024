import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../../components/ui/Button";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import { StatusBar } from "expo-status-bar";
import supabase from "../../lib/supabase";
import useRealtime from "../../hooks/useRealtime";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { COLORS, FONTS } from "../../constants/theme";
import CommentModal from "../../components/common/CommentModal";
import ARProductViewer from "../../components/ARProductViewer";
import { MaterialIcons } from "@expo/vector-icons";
import { SHADOWS } from "../../constants/theme";

// Import new interactive components
import ImageZoom from "../../components/common/ImageZoom";

import PriceHistory from "../../components/common/PriceHistory";
import StockAlert from "../../components/common/StockAlert";

const { width, height } = Dimensions.get("window");

const StockStatusIndicator = ({ inStock, quantity }) => {
  const backgroundColor = inStock
    ? "rgba(46, 125, 50, 0.8)"
    : "rgba(255, 149, 0, 0.8)";
  const textColor = "#FFFFFF";

  return (
    <View
      style={[
        styles.stockContainer,
        {
          backgroundColor,
        },
      ]}
    >
      <View style={styles.stockIconContainer}>
        <Ionicons
          name={inStock ? "checkmark-circle" : "time"}
          size={14}
          color="#FFFFFF"
        />
      </View>
      <Text style={[styles.stockText, { color: textColor }]}>
        {inStock ? "In Stock" : "On Order"}
        {inStock && typeof quantity === "number" && ` • ${quantity} left`}
      </Text>
    </View>
  );
};

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [quantity, setQuantity] = useState(1);
  const [viewCount, setViewCount] = useState(product?.views_count || 0);
  const [likesCount, setLikesCount] = useState(product?.likes_count || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // States for image carousel
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user } = useAuthStore();
  const { addToCart } = useCartStore();

  // Inside the ProductDetailsScreen component, add states for modals
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [arViewerVisible, setArViewerVisible] = useState(false);

  // States for new interactive features

  const [priceHistory, setPriceHistory] = useState([]);
  const [currentZoomImageIndex, setCurrentZoomImageIndex] = useState(0);

  // Use the useRealtime hook to set up real-time updates
  const { subscribeToTable } = useRealtime("ProductDetailsScreen", {
    tables: ["product_views", "product_likes", "product_comments"],
    autoRefreshTables: ["product_views", "product_likes", "product_comments"],
    refreshCallback: handleRealtimeUpdate,
  });

  // Handler for real-time updates
  function handleRealtimeUpdate(table, payload) {
    if (!product?.id) return;

    switch (table) {
      case "product_views":
        if (payload.new.product_id === product.id) {
          // Fetch updated view count
          fetchProductViewCount();
        }
        break;
      case "product_likes":
        if (
          payload.new?.product_id === product.id ||
          payload.old?.product_id === product.id
        ) {
          // Fetch updated likes count
          fetchLikesCount();
        }
        break;
      case "product_comments":
        if (
          payload.new?.product_id === product.id ||
          payload.old?.product_id === product.id
        ) {
          // Fetch updated comment count
          fetchCommentCount();
        }
        break;
      case "products":
        if (payload.new?.id === product.id) {
          // Update product data when it changes
          // For example, when stock changes, price updates, etc.
          updateProductData(payload.new);
        }
        break;
    }
  }

  // Function to update product data
  const updateProductData = (newProductData) => {
    // Merge the new product data with existing data
    const updatedProduct = { ...product, ...newProductData };

    // Update the view count
    if (newProductData.views_count !== undefined) {
      setViewCount(newProductData.views_count);
    }

    // Navigate to the updated product details (ensures all data is fresh)
    navigation.setParams({ product: updatedProduct });
  };

  // Function to fetch product view count
  const fetchProductViewCount = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("views_count")
        .eq("id", product.id)
        .single();

      if (error) throw error;

      if (data) {
        setViewCount(data.views_count);
      }
    } catch (error) {
      console.error("Error fetching product view count:", error);
    }
  };

  // Record product view when component mounts
  useEffect(() => {
    if (product?.id) {
      recordProductView();

      // Subscribe to product updates specifically
      subscribeToTable("products", "*", (payload) => {
        if (payload.new?.id === product.id) {
          updateProductData(payload.new);
        }
      });

      // Load additional data for new features
      loadPriceHistory();
    }
  }, [product?.id]);

  // Function to record product view
  const recordProductView = async () => {
    try {
      // Update the local view count regardless of whether the DB update succeeds
      // This ensures UI is responsive even if there's a backend error
      setViewCount((prevCount) => prevCount + 1);

      // Handle view recording differently based on user login status
      if (user?.id) {
        // For logged-in users: Record the view in product_views table
        const { error: viewError } = await supabase
          .from("product_views")
          .insert([
            {
              user_id: user.id,
              product_id: product.id,
              viewed_at: new Date().toISOString(),
            },
          ]);

        if (viewError) {
          console.error("Error recording user view:", viewError);
        }
      } else {
        // For anonymous users: Use a temporary user ID
        const { error: viewError } = await supabase
          .from("product_views")
          .insert([
            {
              user_id: "00000000-0000-0000-0000-000000000000", // Anonymous user ID
              product_id: product.id,
              viewed_at: new Date().toISOString(),
            },
          ]);

        if (viewError) {
          console.error("Error recording anonymous view:", viewError);
        }
      }

      // Fetch the latest view count from the database
      const { data: productData, error: fetchError } = await supabase
        .from("products")
        .select("views_count")
        .eq("id", product.id)
        .single();

      if (fetchError) {
        console.error("Error fetching updated view count:", fetchError);
      } else if (productData) {
        // Update the local view count with the latest value from the database
        setViewCount(productData.views_count);
      }
    } catch (error) {
      console.error("Error recording product view:", error);
    }
  };

  // Fetch likes count
  useEffect(() => {
    if (product?.id) {
      fetchLikesCount();
    }
  }, [product?.id]);

  // Function to fetch likes count
  const fetchLikesCount = async () => {
    try {
      const { count, error } = await supabase
        .from("product_likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id);

      if (error) throw error;

      setLikesCount(count || 0);
    } catch (error) {
      console.error("Error fetching likes count:", error);
    }
  };

  // Check if user has liked this product
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (user && product?.id) {
      checkIfLiked();
    }
  }, [user, product?.id]);

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("product_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (error) throw error;

      setIsLiked(!!data);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  // Handle like press
  const handleLikePress = async () => {
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
      if (isLiked) {
        // Unlike the product
        const { error } = await supabase
          .from("product_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        if (error) throw error;

        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        // Like the product
        const { error } = await supabase
          .from("product_likes")
          .insert({ user_id: user.id, product_id: product.id });

        if (error) throw error;

        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      Alert.alert("Error", "Failed to update like status");
    }
  };

  // Prepare images array for carousel
  const productImages =
    product?.images?.length > 0
      ? product.images
      : product?.main_image
      ? [product.main_image, ...(product.additional_images || [])]
      : [require("../../../assets/logo-placeholder.png")];

  // Format price with commas
  const formatPrice = (price) => {
    return parseFloat(price)
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  // Map database fields to the ones we use in the UI
  const productData = {
    ...product,
    quantity: product.stock_quantity || 0,
    in_stock:
      product.is_on_order !== undefined
        ? !product.is_on_order
        : product.stock_quantity > 0,
  };

  const incrementQuantity = () => {
    if (quantity < productData.quantity) {
      setQuantity(quantity + 1);
    } else {
      Alert.alert(
        "Maximum Quantity",
        "You have reached the maximum available quantity for this product."
      );
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
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

    addToCart(productData, quantity);
    Alert.alert("Success", "Item added to your cart!");
  };

  const handleBuyNow = () => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to purchase items.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Auth", { screen: "Login" }),
        },
      ]);
      return;
    }

    addToCart(productData, quantity);
    navigation.navigate("CartTab", { screen: "Cart" });
  };

  const handleViewShop = () => {
    navigation.navigate("ShopDetails", { shopId: product.shop_id });
  };

  // Add a contact seller function
  const handleContactSeller = () => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to contact sellers.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Auth", { screen: "Login" }),
        },
      ]);
      return;
    }

    // Ensure we have the seller information
    if (!product?.shop?.owner) {
      Alert.alert("Error", "Seller information not available");
      return;
    }

    const sellerId = product.shop.owner.id;
    const sellerName =
      `${product.shop.owner.firstname || ""} ${
        product.shop.owner.lastname || ""
      }`.trim() || product.shop.owner.username;
    const sellerImage = product.shop.owner.profile_image;

    // Navigate to the chat screen
    navigation.navigate("Messages", {
      screen: "ChatDetail",
      params: {
        recipientId: sellerId,
        recipientName: sellerName,
        recipientImage: sellerImage,
        recipientRole: "seller",
      },
    });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(newIndex);
  };

  const renderImageItem = ({ item }) => {
    return (
      <View style={styles.imageSlide}>
        <Image
          source={typeof item === "string" ? { uri: item } : item}
          style={styles.carouselImage}
          resizeMode="cover"
        />
      </View>
    );
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? "year" : "years"} ago`;
    }
  };

  // Add a function to toggle the comment modal
  const toggleCommentModal = () => {
    setCommentModalVisible(!commentModalVisible);
  };

  // Add function to fetch comment count
  const fetchCommentCount = async () => {
    try {
      console.log("Fetching comments for product:", product.id); // Debug log
      const { count, error } = await supabase
        .from("product_comments") // Changed from 'comments' to 'product_comments'
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id); // Changed from 'item_id' to 'product_id'
      if (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }

      console.log("Comment count:", count); // Debug log
      setCommentCount(count || 0);
    } catch (error) {
      console.error("Error fetching comment count:", error);
    }
  };

  // Add useEffect to fetch comment count when component mounts
  useEffect(() => {
    if (product?.id) {
      fetchCommentCount();
    }
  }, [product?.id]);

  // Fetch product data if not provided
  useEffect(() => {
    if (product?.id && !productData) {
      fetchProductData();
    }
  }, [product?.id]);

  const fetchProductData = async () => {
    try {
      const { data, error } = await supabase
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
        .eq("id", product.id)
        .single();

      if (error) throw error;

      if (data) {
        setProductData({
          ...data,
          in_stock:
            data.is_on_order !== undefined
              ? !data.is_on_order
              : (data.stock_quantity || 0) > 0,
        });
      }
    } catch (error) {
      console.error("Error fetching product data:", error);
    }
  };

  // Functions to load data for new features (mock data for now)

  const loadPriceHistory = () => {
    // Mock price history data
    const mockPriceData = [];
    const today = new Date();
    const currentPrice = product.price;

    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Generate fluctuating prices around the current price
      const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
      const price = currentPrice * (1 + variance);

      mockPriceData.push({
        date: date.toISOString(),
        price: Math.round(price * 100) / 100,
      });
    }

    setPriceHistory(mockPriceData);
  };

  // Handler functions for new components

  const handlePriceAlert = () => {
    Alert.alert(
      "Price Alert",
      "You will be notified when the price drops below your target.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Set Alert", onPress: () => console.log("Price alert set") },
      ]
    );
  };

  const handleStockNotification = () => {
    Alert.alert(
      "Stock Notification",
      "You will be notified when this item is back in stock.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Notify Me",
          onPress: () => console.log("Stock notification set"),
        },
      ]
    );
  };

  // If product is not available
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Product not found</Text>
          <Button
            title="Go Back"
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with back button and share button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        {user ? (
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color="#000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image Carousel and Pagination */}
        <View style={styles.carouselWrapper}>
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={productImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              keyExtractor={(_, index) => `image-${index}`}
              renderItem={renderImageItem}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />

            {/* Stock and Sale badges */}
            <View style={styles.badgesContainer}>
              <StockStatusIndicator
                inStock={productData.in_stock}
                quantity={productData.quantity}
              />

              {product.is_on_sale && (
                <View style={styles.saleBadge}>
                  <View style={styles.saleIconContainer}>
                    <Ionicons name="pricetag" size={16} color="#FFFFFF" />
                  </View>
                  <Text
                    style={styles.saleText}
                  >{`${product.discount_percentage}% OFF`}</Text>
                </View>
              )}
            </View>

            {/* Pagination dots - moved to bottom of image */}
            {productImages.length > 1 && (
              <View style={styles.paginationContainer}>
                {productImages.map((_, index) => {
                  const inputRange = [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                  ];

                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: "clamp",
                  });

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.4, 1, 0.4],
                    extrapolate: "clamp",
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
            )}
          </View>
        </View>

        {/* Product details */}
        <View style={styles.detailsContainer}>
          {/* Product Header Card */}
          <View style={styles.productHeaderCard}>
            <Text style={styles.productName}>{product.name}</Text>

            <View style={styles.shopRow}>
              <Text style={styles.byText}>By </Text>
              <TouchableOpacity
                style={styles.shopButton}
                onPress={handleViewShop}
              >
                <Text style={styles.shopName}>
                  {product.shop?.name || "Shop Name"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="eye-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.statText}>{viewCount} views</Text>
                </View>

                <TouchableOpacity
                  style={styles.statItem}
                  onPress={handleLikePress}
                >
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={18}
                    color={COLORS.error}
                  />
                  <Text style={styles.statText}>{likesCount} likes</Text>
                </TouchableOpacity>

                <View style={styles.statItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.statTextSecondary}>
                    {formatDate(product.created_at)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.price}>N${formatPrice(product.price)}</Text>
              {product.is_on_sale && (
                <Text style={styles.originalPrice}>
                  N${formatPrice(product.original_price)}
                </Text>
              )}
            </View>
          </View>

          {/* Description Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>
              {product.description || "No description available."}
            </Text>
          </View>

          {/* Additional info for On-Order products */}
          {!productData.in_stock && (
            <View style={styles.onOrderCard}>
              <View style={styles.onOrderHeader}>
                <View style={styles.onOrderIconContainer}>
                  <Ionicons
                    name="time-outline"
                    size={24}
                    color={COLORS.warning}
                  />
                </View>
                <View style={styles.onOrderTextContainer}>
                  <Text style={styles.onOrderTitle}>On Order Product</Text>
                  <Text style={styles.onOrderDescription}>
                    This product needs to be ordered from our suppliers. A 50%
                    deposit is required, and the remaining balance will be due
                    when the product arrives.
                  </Text>
                  {(product.est_arrival_days || product.lead_time_days) && (
                    <Text style={styles.estimatedArrival}>
                      Estimated arrival:{" "}
                      {product.est_arrival_days || product.lead_time_days} days
                    </Text>
                  )}
                </View>
              </View>

              {/* Delivery Fees Section */}
              {(product.delivery_fee_local !== null ||
                product.delivery_fee_uptown !== null ||
                product.delivery_fee_outoftown !== null ||
                product.delivery_fee_countrywide !== null) && (
                <View style={styles.deliveryFeesSection}>
                  <View style={styles.deliveryFeesHeader}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={COLORS.primary}
                    />
                    <Text style={styles.deliveryFeesTitle}>
                      Delivery Fees by Location
                    </Text>
                  </View>

                  {product.delivery_fee_local !== null && (
                    <View style={styles.feeItem}>
                      <Text style={styles.feeLabel}>Local (Same Town)</Text>
                      <Text style={styles.feeValue}>
                        {product.delivery_fee_local === 0
                          ? "Free"
                          : `N$${formatPrice(product.delivery_fee_local)}`}
                      </Text>
                    </View>
                  )}

                  {product.delivery_fee_uptown !== null && (
                    <View style={styles.feeItem}>
                      <Text style={styles.feeLabel}>Uptown</Text>
                      <Text style={styles.feeValue}>
                        {product.delivery_fee_uptown === 0
                          ? "Free"
                          : `N$${formatPrice(product.delivery_fee_uptown)}`}
                      </Text>
                    </View>
                  )}

                  {product.delivery_fee_outoftown !== null && (
                    <View style={styles.feeItem}>
                      <Text style={styles.feeLabel}>Out of Town</Text>
                      <Text style={styles.feeValue}>
                        {product.delivery_fee_outoftown === 0
                          ? "Free"
                          : `N$${formatPrice(product.delivery_fee_outoftown)}`}
                      </Text>
                    </View>
                  )}

                  {product.delivery_fee_countrywide !== null && (
                    <View style={styles.feeItem}>
                      <Text style={styles.feeLabel}>Country-wide</Text>
                      <Text style={styles.feeValue}>
                        {product.delivery_fee_countrywide === 0
                          ? "Free"
                          : `N$${formatPrice(
                              product.delivery_fee_countrywide
                            )}`}
                      </Text>
                    </View>
                  )}

                  {product.free_delivery_threshold > 0 && (
                    <View style={styles.freeDeliveryNotice}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={COLORS.success}
                      />
                      <Text style={styles.freeDeliveryText}>
                        Free delivery on orders above N$
                        {formatPrice(product.free_delivery_threshold)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Product specifications */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons
                  name="list-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Specifications</Text>
            </View>

            <View style={styles.specsContainer}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Condition</Text>
                <Text style={styles.specValue}>{product.condition}</Text>
              </View>
              {product.category && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specValue}>{product.category}</Text>
                </View>
              )}
              {product.colors && product.colors.length > 0 && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Available Colors</Text>
                  <Text style={styles.specValue}>
                    {Array.isArray(product.colors)
                      ? product.colors.join(", ")
                      : typeof product.colors === "object"
                      ? Object.keys(product.colors).join(", ")
                      : String(product.colors)}
                  </Text>
                </View>
              )}
              {product.sizes && product.sizes.length > 0 && (
                <View style={[styles.specRow, styles.specRowLast]}>
                  <Text style={styles.specLabel}>Available Sizes</Text>
                  <Text style={styles.specValue}>
                    {Array.isArray(product.sizes)
                      ? product.sizes.join(", ")
                      : typeof product.sizes === "object"
                      ? Object.keys(product.sizes).join(", ")
                      : String(product.sizes)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quantity selector */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons
                  name="basket-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Quantity</Text>
            </View>

            <View style={styles.quantityContainer}>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={decrementQuantity}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.quantityValue}>
                  <Text style={styles.quantityText}>{quantity}</Text>
                </View>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={incrementQuantity}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.stockInfo}>
                {productData.quantity > 10
                  ? "In Stock"
                  : productData.quantity > 0
                  ? `Only ${productData.quantity} left`
                  : "Out of Stock"}
              </Text>
            </View>
          </View>

          {/* Comments Section */}
          <TouchableOpacity
            style={styles.commentCard}
            onPress={toggleCommentModal}
          >
            <View style={styles.commentHeader}>
              <View style={styles.commentIconContainer}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={22}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.commentTitle}>Comments & Reviews</Text>
              {commentCount > 0 && (
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountText}>{commentCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.commentSubtitle}>
              See what others are saying about this product
            </Text>
            <View style={styles.commentAction}>
              <Text style={styles.commentActionText}>View All Comments</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.primary}
              />
            </View>
          </TouchableOpacity>

          {/* Comment Modal */}
          <View style={{ width: "100%" }}>
            <CommentModal
              type="product"
              itemId={product.id}
              visible={commentModalVisible}
              onClose={() => setCommentModalVisible(false)}
              itemName={product.name}
            />
          </View>

          {/* AR Product Viewer */}
          <ARProductViewer
            visible={arViewerVisible}
            onClose={() => setArViewerVisible(false)}
            product={product}
          />

          {/* Seller Info Card - Enhanced Design */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerHeader}>
              <View style={styles.sellerIconContainer}>
                <MaterialIcons
                  name="storefront"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerLabel}>Sold by</Text>
                <Text style={styles.sellerName}>
                  {product?.shop?.name || "Unknown Shop"}
                </Text>
              </View>
            </View>

            <View style={styles.sellerActions}>
              <TouchableOpacity
                style={styles.sellerActionButton}
                onPress={handleViewShop}
              >
                <MaterialIcons name="store" size={18} color={COLORS.primary} />
                <Text style={styles.sellerActionText}>View Shop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sellerActionButton, styles.arActionButton]}
                onPress={() => setArViewerVisible(true)}
              >
                <MaterialIcons name="view-in-ar" size={18} color="#fff" />
                <Text style={[styles.sellerActionText, styles.arActionText]}>
                  View in AR
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Features Section */}
          <View style={styles.interactiveFeaturesContainer}>
            {/* Modern Zoom Feature Header */}
            <View style={styles.modernZoomHeader}>
              <View style={styles.zoomTitleContainer}>
                <View style={styles.zoomIcon}>
                  <Ionicons name="search" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.zoomTitle}>Interactive Zoom</Text>
              </View>

              {/* Feature Badge */}
              <View style={styles.featureBadge}>
                <View style={styles.featureBadgeIcon}>
                  <Ionicons name="sparkles" size={12} color={COLORS.warning} />
                </View>
                <Text style={styles.featureBadgeText}>Enhanced View</Text>
              </View>
            </View>

            {/* Enhanced Image Display */}
            <View style={styles.modernZoomContainer}>
              <View style={styles.modernZoomCard}>
                <View style={styles.zoomViewWrapper}>
                  <ImageZoom
                    imageUri={productImages[currentZoomImageIndex]}
                    width={width - 110}
                    height={320}
                    style={{ borderRadius: 20, width: "100%" }}
                    onSwipeLeft={() => {
                      if (productImages.length > 1) {
                        setCurrentZoomImageIndex(
                          currentZoomImageIndex === productImages.length - 1
                            ? 0
                            : currentZoomImageIndex + 1
                        );
                      }
                    }}
                    onSwipeRight={() => {
                      if (productImages.length > 1) {
                        setCurrentZoomImageIndex(
                          currentZoomImageIndex === 0
                            ? productImages.length - 1
                            : currentZoomImageIndex - 1
                        );
                      }
                    }}
                  />

                  {/* Modern Navigation Arrows */}
                  {productImages.length > 1 && (
                    <>
                      {/* Left Arrow */}
                      <TouchableOpacity
                        style={[
                          styles.modernNavigationArrow,
                          styles.modernLeftArrow,
                        ]}
                        onPress={() =>
                          setCurrentZoomImageIndex(
                            currentZoomImageIndex === 0
                              ? productImages.length - 1
                              : currentZoomImageIndex - 1
                          )
                        }
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>

                      {/* Right Arrow */}
                      <TouchableOpacity
                        style={[
                          styles.modernNavigationArrow,
                          styles.modernRightArrow,
                        ]}
                        onPress={() =>
                          setCurrentZoomImageIndex(
                            currentZoomImageIndex === productImages.length - 1
                              ? 0
                              : currentZoomImageIndex + 1
                          )
                        }
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>

                      {/* Modern Image Counter Badge */}
                      <View style={styles.modernImageCounter}>
                        <Text style={styles.modernCounterText}>
                          {currentZoomImageIndex + 1}
                        </Text>
                        <View style={styles.counterDivider} />
                        <Text style={styles.modernCounterTotal}>
                          {productImages.length}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Modern Image Navigation Dots */}
                {productImages.length > 1 && (
                  <View style={styles.modernDotContainer}>
                    {productImages.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.modernDot,
                          index === currentZoomImageIndex &&
                            styles.modernActiveDot,
                        ]}
                        onPress={() => setCurrentZoomImageIndex(index)}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Modern Hint Section */}
              <View style={styles.modernHintContainer}>
                <View style={styles.hintRow}>
                  <Ionicons
                    name="hand-left-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modernHintText}>
                    Pinch to zoom • Double tap to reset
                  </Text>
                </View>
                {productImages.length > 1 && (
                  <View style={styles.hintRow}>
                    <Ionicons
                      name="swap-horizontal"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.modernHintText}>
                      Swipe or use arrows to navigate
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stock Alert */}
            <StockAlert
              stockLevel={productData.quantity || 0}
              lowStockThreshold={10}
              veryLowStockThreshold={5}
              outOfStockThreshold={0}
              onNotifyMePress={handleStockNotification}
              style={{ marginHorizontal: 20 }}
            />

            {/* Price History */}
            <PriceHistory
              priceData={priceHistory}
              currentPrice={product.price}
              onPriceAlertPress={handlePriceAlert}
              style={{ marginHorizontal: 20 }}
            />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={handleAddToCart}
          >
            <Text style={styles.addToCartText}>
              {productData.in_stock ? "Add to Cart" : "Pay 50% Deposit"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow}>
            <View style={styles.buttonIconContainer}>
              <Ionicons name="flash" size={18} color="#fff" />
            </View>
            <Text style={styles.buyNowText}>
              {productData.in_stock ? "Buy Now" : "Process Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  locationFeesContainer: {
    marginTop: 10,
    paddingTop: 8,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  locationFeesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationFeesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginLeft: 5,
  },
  locationFeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
    paddingLeft: 8,
  },
  locationName: {
    fontSize: 13,
    color: "#555",
  },
  locationFeeValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#444",
  },
  freeThresholdNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  freeThresholdText: {
    fontSize: 12,
    color: "#4CAF50",
    marginLeft: 5,
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    ...SHADOWS.small,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    ...SHADOWS.small,
  },
  loginButton: {
    paddingHorizontal: 16,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  loginButtonText: {
    fontSize: 14,
    color: "#fff",
    fontFamily: FONTS.bold,
  },
  carouselWrapper: {
    position: "relative",
  },
  carouselContainer: {
    position: "relative",
    height: 380,
    width: width,
    backgroundColor: "#F8F9FA",
  },
  imageSlide: {
    width: width,
    height: 380,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  carouselImage: {
    width: width,
    height: "100%",
  },
  paginationContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 10,
    // backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgesContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "column",
    alignItems: "flex-end",
  },
  inStockBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  inStockText: {
    color: "#FFFFFF",
    fontSize: 12,
    // fontWeight: "bold",
    fontFamily: FONTS.bold,
    textTransform: "lowercase",
  },
  onOrderBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  onOrderText: {
    color: "#FFFFFF",
    fontSize: 12,
    // fontWeight: "bold",
    fontFamily: FONTS.bold,
  },
  saleBadge: {
    backgroundColor: "rgba(255, 59, 48, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    ...SHADOWS.small,
    elevation: 6,
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  saleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  saleIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    marginTop: -20,
  },
  productName: {
    fontSize: 28,
    color: COLORS.textPrimary,
    marginBottom: 12,
    fontFamily: FONTS.bold,
    lineHeight: 34,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  byText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  shopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shopName: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 4,
    fontFamily: FONTS.semiBold,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    color: COLORS.primary,
    marginRight: 12,
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 20,
    color: COLORS.textLight,
    textDecorationLine: "line-through",
    fontFamily: FONTS.medium,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginLeft: 8,
    fontFamily: FONTS.bold,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 26,
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    fontFamily: FONTS.regular,
  },
  onOrderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    ...SHADOWS.small,
  },
  onOrderHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  onOrderIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  onOrderTextContainer: {
    flex: 1,
  },
  onOrderTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 8,
    fontFamily: FONTS.bold,
  },
  onOrderDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontFamily: FONTS.regular,
  },
  estimatedArrival: {
    fontSize: 14,
    color: COLORS.warning,
    marginTop: 12,
    fontFamily: FONTS.semiBold,
  },
  deliveryFeesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  deliveryFeesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  deliveryFeesTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginLeft: 8,
  },
  freeDeliveryNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  freeDeliveryText: {
    fontSize: 12,
    color: COLORS.success,
    marginLeft: 8,
    fontFamily: FONTS.medium,
  },
  specsContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  specRowLast: {
    marginBottom: 0,
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  specLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    textAlign: "right",
    flex: 1,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  quantityButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  quantityValue: {
    width: 60,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E0E0E0",
  },
  quantityText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  stockInfo: {
    fontSize: 14,
    color: COLORS.success,
    fontFamily: FONTS.semiBold,
  },
  buttonIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginVertical: 16,
    fontFamily: FONTS.regular,
  },
  goBackButton: {
    marginTop: 20,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 8,
  },
  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewsText: {
    fontSize: 12,
    color: "#666",
    // fontWeight: "500",
    marginLeft: 4,
    fontFamily: FONTS.medium,
  },
  likesContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  likesText: {
    fontSize: 12,
    color: "#666",
    // fontWeight: "500",
    marginLeft: 4,
    fontFamily: FONTS.medium,
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  separator: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 20,
  },
  sellerCardContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    ...SHADOWS.small,
  },
  sellerInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sellerTextContainer: {
    marginLeft: 10,
  },
  sellerLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  sellerName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  sellerActionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewShopButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  viewShopButtonText: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginLeft: 6,
  },
  contactSellerButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  contactSellerButtonText: {
    color: "#fff",
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginLeft: 6,
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  commentButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  commentButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  commentCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  commentCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 12,
    ...SHADOWS.small,
    elevation: 6,
    position: "relative",
    overflow: "hidden",
  },
  stockIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  stockText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  feeLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  productHeaderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    ...SHADOWS.small,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    fontFamily: FONTS.medium,
  },
  statTextSecondary: {
    fontSize: 12,
    color: "#999",
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    ...SHADOWS.small,
  },
  sectionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    // width: "100%",
    ...SHADOWS.small,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  commentIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentTitle: {
    fontSize: 16,
    color: "#333",
    fontFamily: FONTS.bold,
  },
  commentSubtitle: {
    fontSize: 12,
    color: "#666",
    fontFamily: FONTS.regular,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  commentActionText: {
    fontSize: 14,
    color: "#007AFF",
    fontFamily: FONTS.medium,
    marginRight: 10,
  },
  sellerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eeeeee",
    ...SHADOWS.small,
  },
  sellerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sellerIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sellerInfo: {
    marginLeft: 10,
  },
  sellerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  sellerActionButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  sellerActionText: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginLeft: 6,
  },
  arActionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  arActionText: {
    color: "#fff",
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginLeft: 6,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
    backgroundColor: "#F8F9FA",
  },
  addToCartButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    ...SHADOWS.large,
    minHeight: 50,
    marginRight: 8,
    elevation: 15,
    position: "relative",
    overflow: "hidden",
  },
  addToCartText: {
    fontSize: 14,
    color: "#fff",
    fontFamily: FONTS.bold,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  buyNowButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: "#667eea",
    ...SHADOWS.large,
    minHeight: 50,
    marginLeft: 8,
    elevation: 15,
    position: "relative",
    overflow: "hidden",
  },
  buyNowText: {
    fontSize: 14,
    color: "#fff",
    fontFamily: FONTS.bold,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // New modern styles for interactive features
  interactiveFeaturesContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  modernZoomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  zoomTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  zoomIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  zoomTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  featureBadgeIcon: {
    marginRight: 6,
  },
  featureBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernZoomContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  modernZoomCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    width: "100%",
  },
  zoomViewWrapper: {
    position: "relative",
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
  modernNavigationArrow: {
    position: "absolute",
    top: "50%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    marginTop: -20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  modernLeftArrow: {
    left: 16,
  },
  modernRightArrow: {
    right: 16,
  },
  modernImageCounter: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  modernCounterText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  counterDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 8,
  },
  modernCounterTotal: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  modernDotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  modernDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modernActiveDot: {
    backgroundColor: COLORS.primary,
    width: 24,
    borderColor: COLORS.primary,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  modernHintContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modernHintText: {
    fontSize: 13,
    color: COLORS.gray,
    fontFamily: FONTS.medium,
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default ProductDetailsScreen;
