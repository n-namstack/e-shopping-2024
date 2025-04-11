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
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { COLORS, FONTS } from "../../constants/theme";

const { width, height } = Dimensions.get("window");

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [quantity, setQuantity] = useState(1);
  const [viewCount, setViewCount] = useState(product?.views_count || 0);
  const [likesCount, setLikesCount] = useState(product?.likes_count || 0);
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

  // Record product view when component mounts
  useEffect(() => {
    if (product?.id) {
      recordProductView();
    }
  }, [product?.id]);

  // Function to record product view
  const recordProductView = async () => {
    try {
      // Only record views for logged-in users
      if (user?.id) {
        // Check if user has already viewed this product (regardless of date)
        const { data: existingView, error: viewCheckError } = await supabase
          .from("product_views")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .maybeSingle();

        if (viewCheckError) {
          console.error("Error checking for existing view:", viewCheckError);
          return;
        }

        // If user has not viewed this product before, record the view
        if (!existingView) {
          // Update views_count in products table
          const { data, error } = await supabase
            .from("products")
            .update({
              views_count: (product.views_count || 0) + 1,
            })
            .eq("id", product.id)
            .select("views_count")
            .single();

          if (error) throw error;

          // Update local view count
          if (data) {
            setViewCount(data.views_count);
          }

          // Record the view in product_views table
          const { error: viewError } = await supabase
            .from("product_views")
            .insert([
              {
                user_id: user.id,
                product_id: product.id,
                viewed_at: new Date().toISOString(),
              },
            ]);

          if (viewError) console.error("Error recording user view:", viewError);
        } else {
          // User has already viewed this product, just update the local state
          setViewCount(product.views_count || 0);
        }
      } else {
        // This is an anonymous user, just update the view count if it hasn't happened in this session
        if (!sessionStorage.getItem(`viewed-${product.id}`)) {
          // Mark as viewed in this session
          sessionStorage.setItem(`viewed-${product.id}`, "true");

          // Update the view count
          const { data, error } = await supabase
            .from("products")
            .update({
              views_count: (product.views_count || 0) + 1,
            })
            .eq("id", product.id)
            .select("views_count")
            .single();

          if (error) throw error;

          // Update local view count
          if (data) {
            setViewCount(data.views_count);
          }
        } else {
          // Already viewed in this session
          setViewCount(product.views_count || 0);
        }
      }
    } catch (error) {
      console.error("Error updating product views:", error);
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
              {productData.in_stock ? (
                <View style={styles.inStockBadge}>
                  <Text style={styles.inStockText}>In Stock</Text>
                </View>
              ) : (
                <View style={styles.onOrderBadge}>
                  <Text style={styles.onOrderText}>On Order</Text>
                </View>
              )}

              {product.is_on_sale && (
                <View style={styles.saleBadge}>
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
                    outputRange: [8, 20, 8],
                    extrapolate: "clamp",
                  });

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
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
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <View style={styles.viewsContainer}>
                <Ionicons name="eye-outline" size={16} color="#666" />
                <Text style={styles.viewsText}>{viewCount}</Text>
              </View>

              <TouchableOpacity
                style={styles.likesContainer}
                onPress={handleLikePress}
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={16}
                  color="#FF6B6B"
                />
                <Text style={styles.likesText}>{likesCount}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metaInfoRow}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.dateText}>
                Posted {formatDate(product.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.price}>N${formatPrice(product.price)}</Text>
            {product.is_on_sale && (
              <Text style={styles.originalPrice}>
                N$
                {formatPrice(
                  product.price * (1 + product.discount_percentage / 100)
                )}
              </Text>
            )}
          </View>

          {/* Product details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#333"
              />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>
              {product.description || "No description available."}
            </Text>
          </View>

          {/* Additional info for On-Order products */}
          {!productData.in_stock && (
            <View style={styles.onOrderInfo}>
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#FF9800"
              />
              <View style={styles.onOrderTextContainer}>
                <Text style={styles.onOrderTitle}>On Order Product</Text>
                <Text style={styles.onOrderDescription}>
                  This product needs to be ordered from our suppliers. A 50%
                  deposit is required, and the remaining balance will be due
                  when the product arrives.
                </Text>
                {product.est_arrival_days && (
                  <Text style={styles.estimatedArrival}>
                    Estimated arrival: {product.est_arrival_days} days
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Product specifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Specifications</Text>
            </View>

            <View style={styles.specsContainer}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Condition:</Text>
                <Text style={styles.specValue}>{product.condition}</Text>
              </View>
              {product.category && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category:</Text>
                  <Text style={styles.specValue}>{product.category}</Text>
                </View>
              )}
              {product.colors && product.colors.length > 0 && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Available Colors:</Text>
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
                  <Text style={styles.specLabel}>Available Sizes:</Text>
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
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="basket-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Quantity</Text>
            </View>

            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
              >
                <Ionicons name="remove" size={22} color="#666" />
              </TouchableOpacity>
              <View style={styles.quantityValue}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={22} color="#666" />
              </TouchableOpacity>

              <Text style={styles.stockInfo}>
                {productData.quantity > 10
                  ? "In Stock"
                  : productData.quantity > 0
                  ? `Only ${productData.quantity} left`
                  : "Out of Stock"}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title={productData.in_stock ? "Add to Cart" : "Pay 50% Deposit"}
              variant="outline"
              isFullWidth
              onPress={handleAddToCart}
              style={styles.addToCartButton}
            />
            <Button
              title={productData.in_stock ? "Buy Now" : "Process Order"}
              variant="primary"
              isFullWidth
              onPress={handleBuyNow}
              style={styles.buyNowButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(245, 245, 245, 0.9)",
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(245, 245, 245, 0.9)",
  },
  loginButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#007AFF",
  },
  loginButtonText: {
    fontSize: 12,
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
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  saleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: COLORS.bold,
  },
  detailsContainer: {
    padding: 22,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  productName: {
    fontSize: 24,
    // fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
    fontFamily: FONTS.bold,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  byText: {
    fontSize: 14,
    color: "#666",
    fontFamily: FONTS.bold,
  },
  shopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  shopName: {
    fontSize: 14,
    color: "#007AFF",
    // fontWeight: "600",
    marginRight: 2,
    fontFamily: FONTS.bold,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  price: {
    fontSize: 26,
    // fontWeight: "bold",
    color: "#007AFF",
    marginRight: 10,
    fontFamily: FONTS.bold,
  },
  originalPrice: {
    fontSize: 18,
    color: "#999",
    textDecorationLine: "line-through",
    fontFamily: FONTS.regular,
  },
  section: {
    marginBottom: 28,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    // fontWeight: "600",
    color: "#333",
    marginLeft: 8,
    fontFamily: FONTS.semiBold,
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderRadius: 12,
    fontFamily: FONTS.regular,
  },
  onOrderInfo: {
    flexDirection: "row",
    backgroundColor: "#FFF9C4",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  onOrderTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  onOrderTitle: {
    fontSize: 16,
    // fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    fontFamily: FONTS.bold,
  },
  onOrderDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  estimatedArrival: {
    fontSize: 14,
    // fontWeight: "500",
    color: "#FF9800",
    marginTop: 8,
    fontFamily: FONTS.medium,
  },
  specsContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
  },
  specRow: {
    flexDirection: "row",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    paddingBottom: 8,
  },
  specRowLast: {
    marginBottom: 0,
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  specLabel: {
    width: 130,
    fontSize: 14,
    color: "#666",
    // fontWeight: "500",
    fontFamily: FONTS.medium,
  },
  specValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontFamily: FONTS.medium,
    // fontWeight: "500",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  quantityValue: {
    width: 60,
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  quantityText: {
    fontSize: 18,
    // fontWeight: "600",
    fontFamily: FONTS.semiBold,
  },
  stockInfo: {
    marginLeft: 20,
    fontSize: 14,
    color: "#4CAF50",
    // fontWeight: "500",
    fontFamily: FONTS.medium,
    textTransform: "lowercase",
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  addToCartButton: {
    marginBottom: 14,
  },
  buyNowButton: {},
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
});

export default ProductDetailsScreen;
