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
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useRealtime from "../../hooks/useRealtime";
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";
import { FONTS } from "../../constants/theme";
import CommentModal from "../../components/common/CommentModal";
import ARProductViewer from "../../components/ARProductViewer";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import ImageZoom from "../../components/common/ImageZoom";
import PriceHistory from "../../components/common/PriceHistory";
import StockAlert from "../../components/common/StockAlert";

const { width } = Dimensions.get("window");

const StockStatusIndicator = ({ inStock, quantity }) => (
  <View style={[
    styles.stockBadge,
    { backgroundColor: inStock ? "rgba(34,197,94,0.88)" : "rgba(249,115,22,0.88)" },
  ]}>
    <Ionicons name={inStock ? "checkmark-circle" : "time"} size={13} color="#fff" />
    <Text style={styles.stockBadgeText}>
      {inStock ? "In Stock" : "On Order"}
      {inStock && typeof quantity === "number" && ` · ${quantity} left`}
    </Text>
  </View>
);

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [quantity, setQuantity]           = useState(1);
  const [viewCount, setViewCount]         = useState(product?.views_count || 0);
  const [likesCount, setLikesCount]       = useState(product?.likes_count || 0);
  const [commentCount, setCommentCount]   = useState(0);
  const [isLiked, setIsLiked]             = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [arViewerVisible, setArViewerVisible]         = useState(false);
  const [priceHistory, setPriceHistory]               = useState([]);
  const [currentZoomImageIndex, setCurrentZoomImageIndex] = useState(0);

  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();
  const [fontsLoaded]  = useFonts({ Jost_400Regular, Jost_700Bold, Jost_500Medium, Jost_600SemiBold });

  const flatListRef = useRef(null);
  const scrollX     = useRef(new Animated.Value(0)).current;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { user }      = useAuthStore();
  const { addToCart } = useCartStore();

  const { subscribeToTable } = useRealtime("ProductDetailsScreen", {
    tables: ["product_views", "product_likes", "product_comments"],
    autoRefreshTables: ["product_views", "product_likes", "product_comments"],
    refreshCallback: handleRealtimeUpdate,
  });

  function handleRealtimeUpdate(table, payload) {
    if (!product?.id) return;
    switch (table) {
      case "product_views":
        if (payload.new.product_id === product.id) fetchProductViewCount();
        break;
      case "product_likes":
        if (payload.new?.product_id === product.id || payload.old?.product_id === product.id) fetchLikesCount();
        break;
      case "product_comments":
        if (payload.new?.product_id === product.id || payload.old?.product_id === product.id) fetchCommentCount();
        break;
      case "products":
        if (payload.new?.id === product.id) updateProductData(payload.new);
        break;
    }
  }

  const updateProductData = (newProductData) => {
    const updatedProduct = { ...product, ...newProductData };
    if (newProductData.views_count !== undefined) setViewCount(newProductData.views_count);
    navigation.setParams({ product: updatedProduct });
  };

  const fetchProductViewCount = async () => {
    try {
      const { data, error } = await supabase.from("products").select("views_count").eq("id", product.id).single();
      if (error) throw error;
      if (data) setViewCount(data.views_count);
    } catch (error) {
      console.error("Error fetching product view count:", error);
    }
  };

  useEffect(() => {
    if (product?.id) {
      recordProductView();
      subscribeToTable("products", "*", (payload) => {
        if (payload.new?.id === product.id) updateProductData(payload.new);
      });
      loadPriceHistory();
    }
  }, [product?.id]);

  const recordProductView = async () => {
    try {
      setViewCount((prev) => prev + 1);
      const { trackingPermissionGranted } = useAuthStore.getState();
      if (user?.id && trackingPermissionGranted) {
        const { data: profileExists } = await supabase.from("profiles").select("id").eq("id", user.id).limit(1);
        if (profileExists && profileExists.length > 0) {
          const { error: viewError } = await supabase.from("product_views").insert([{
            user_id: user.id, product_id: product.id, viewed_at: new Date().toISOString(),
          }]);
          if (viewError) console.error("Error recording user view:", viewError);
        }
      }
      const { data: productData, error: fetchError } = await supabase.from("products").select("views_count").eq("id", product.id).single();
      if (fetchError) console.error("Error fetching updated view count:", fetchError);
      else if (productData) setViewCount(productData.views_count);
    } catch (error) {
      console.error("Error recording product view:", error);
    }
  };

  useEffect(() => { if (product?.id) fetchLikesCount(); }, [product?.id]);

  const fetchLikesCount = async () => {
    try {
      const { count, error } = await supabase.from("product_likes").select("*", { count: "exact", head: true }).eq("product_id", product.id);
      if (error) throw error;
      setLikesCount(count || 0);
    } catch (error) {
      console.error("Error fetching likes count:", error);
    }
  };

  useEffect(() => { if (user && product?.id) checkIfLiked(); }, [user, product?.id]);

  const checkIfLiked = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("product_likes").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  const handleLikePress = async () => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to like products.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Auth", { screen: "Login" }) },
      ]);
      return;
    }
    try {
      if (isLiked) {
        const { error } = await supabase.from("product_likes").delete().eq("user_id", user.id).eq("product_id", product.id);
        if (error) throw error;
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase.from("product_likes").insert({ user_id: user.id, product_id: product.id });
        if (error) throw error;
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      Alert.alert("Error", "Failed to update like status");
    }
  };

  const productImages =
    product?.images?.length > 0
      ? product.images
      : product?.main_image
        ? [product.main_image, ...(product.additional_images || [])]
        : [require("../../../assets/logo-placeholder.png")];

  const formatPrice = (price) =>
    parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");

  const productData = {
    ...product,
    quantity: product?.stock_quantity || 0,
    in_stock: product?.is_on_order !== undefined ? !product.is_on_order : (product?.stock_quantity || 0) > 0,
  };

  const incrementQuantity = () => {
    if (quantity < productData.quantity) setQuantity(quantity + 1);
    else Alert.alert("Maximum Quantity", "You have reached the maximum available quantity for this product.");
  };

  const decrementQuantity = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to add items to your cart.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Auth", { screen: "Login" }) },
      ]);
      return;
    }
    addToCart(productData, quantity);
    Alert.alert("Success", "Item added to your cart!");
  };

  const handleBuyNow = () => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to purchase items.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Auth", { screen: "Login" }) },
      ]);
      return;
    }
    addToCart(productData, quantity);
    navigation.navigate("CartTab", { screen: "Cart" });
  };

  const handleViewShop = () => navigation.navigate("ShopDetails", { shopId: product.shop_id });

  const handleContactSeller = () => {
    if (!user) {
      Alert.alert("Login Required", "You need to login to contact sellers.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Auth", { screen: "Login" }) },
      ]);
      return;
    }
    if (!product?.shop?.owner) { Alert.alert("Error", "Seller information not available"); return; }
    const sellerId   = product.shop.owner.id;
    const sellerName = `${product.shop.owner.firstname || ""} ${product.shop.owner.lastname || ""}`.trim() || product.shop.owner.username;
    const sellerImage = product.shop.owner.profile_image;
    navigation.navigate("Messages", { screen: "ChatDetail", params: { recipientId: sellerId, recipientName: sellerName, recipientImage: sellerImage, recipientRole: "seller" } });
  };

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false });

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(newIndex);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    const now   = new Date();
    const diffDays = Math.floor(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7)   return `${diffDays}d ago`;
    if (diffDays < 30)  return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const fetchCommentCount = async () => {
    try {
      const { count, error } = await supabase.from("product_comments").select("*", { count: "exact", head: true }).eq("product_id", product.id);
      if (error) throw error;
      setCommentCount(count || 0);
    } catch (error) {
      console.error("Error fetching comment count:", error);
    }
  };

  useEffect(() => { if (product?.id) fetchCommentCount(); }, [product?.id]);

  useEffect(() => {
    if (product?.id && !productData) fetchProductData();
  }, [product?.id]);

  const fetchProductData = async () => {
    try {
      const { data, error } = await supabase.from("products").select(`*, shop:shops(id, name)`).eq("id", product.id).single();
      if (error) throw error;
    } catch (error) {
      console.error("Error fetching product data:", error);
    }
  };

  const loadPriceHistory = () => {
    const mockPriceData = [];
    const today = new Date();
    const currentPrice = product.price;
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * 0.2;
      mockPriceData.push({ date: date.toISOString(), price: Math.round(currentPrice * (1 + variance) * 100) / 100 });
    }
    setPriceHistory(mockPriceData);
  };

  const handlePriceAlert = () => {
    Alert.alert("Price Alert", "You will be notified when the price drops below your target.", [
      { text: "Cancel", style: "cancel" },
      { text: "Set Alert", onPress: () => {} },
    ]);
  };

  const handleStockNotification = () => {
    Alert.alert("Stock Notification", "You will be notified when this item is back in stock.", [
      { text: "Cancel", style: "cancel" },
      { text: "Notify Me", onPress: () => {} },
    ]);
  };

  if (!product) {
    return (
      <View style={[styles.errorBox, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>Product not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBtnShadow}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.errorBtnGrad}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (!fontsLoaded) return null;

  const renderImageItem = ({ item }) => (
    <View style={styles.imageSlide}>
      <Image source={typeof item === "string" ? { uri: item } : item} style={styles.carouselImage} resizeMode="cover" />
    </View>
  );

  const deliveryFees = [
    { label: "Local (Same Town)", value: product.delivery_fee_local },
    { label: "Uptown",            value: product.delivery_fee_uptown },
    { label: "Out of Town",       value: product.delivery_fee_outoftown },
    { label: "Country-wide",      value: product.delivery_fee_countrywide },
  ].filter((f) => f.value != null);

  const specs = [
    product.condition && { label: "Condition", value: product.condition },
    product.category  && { label: "Category",  value: product.category },
    product.colors?.length > 0 && { label: "Colors", value: Array.isArray(product.colors) ? product.colors.join(", ") : String(product.colors) },
    product.sizes?.length > 0  && { label: "Sizes",  value: Array.isArray(product.sizes)  ? product.sizes.join(", ")  : String(product.sizes) },
  ].filter(Boolean);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* ── FLOATING HEADER ── */}
      <View style={styles.headerOverlay}>
        <SafeAreaView>
          <View style={[styles.headerRow, { paddingTop: Platform.OS === "android" ? 12 : 4 }]}>
            <TouchableOpacity style={styles.overlayBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            {user ? (
              <TouchableOpacity style={styles.overlayBtn}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginPill} onPress={() => navigation.navigate("Auth", { screen: "Login" })}>
                <Text style={styles.loginPillText}>Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── IMAGE CAROUSEL ── */}
        <View style={styles.imageSection}>
          <FlatList
            ref={flatListRef}
            data={productImages}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            keyExtractor={(_, i) => `img-${i}`}
            renderItem={renderImageItem}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          />

          {/* Bottom gradient fade into content */}
          <LinearGradient
            colors={["transparent", isDarkMode ? "rgba(15,15,15,0.75)" : "rgba(248,249,250,0.8)"]}
            style={styles.imageFade}
            pointerEvents="none"
          />

          {/* Stock + sale badges */}
          <View style={styles.imageBadges}>
            <StockStatusIndicator inStock={productData.in_stock} quantity={productData.quantity} />
            {product.is_on_sale && (
              <View style={styles.saleBadge}>
                <Ionicons name="pricetag" size={13} color="#fff" />
                <Text style={styles.saleBadgeText}>{product.discount_percentage}% OFF</Text>
              </View>
            )}
          </View>

          {/* Pagination dots */}
          {productImages.length > 1 && (
            <View style={styles.paginationRow}>
              {productImages.map((_, i) => {
                const dotW = scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [8, 24, 8], extrapolate: "clamp",
                });
                const opacity = scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [0.4, 1, 0.4], extrapolate: "clamp",
                });
                return <Animated.View key={i} style={[styles.dot, { width: dotW, opacity }]} />;
              })}
            </View>
          )}
        </View>

        {/* ── CONTENT AREA ── */}
        <View style={[styles.content, { backgroundColor: colors.background }]}>

          {/* Product name */}
          <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>N${formatPrice(product.price)}</Text>
            {product.is_on_sale && (
              <Text style={styles.originalPrice}>N${formatPrice(product.original_price)}</Text>
            )}
          </View>

          {/* Shop pill + stats */}
          <View style={styles.metaRow}>
            <TouchableOpacity
              style={[styles.shopPill, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleViewShop}
            >
              <MaterialIcons name="store" size={14} color="#6366F1" />
              <Text style={styles.shopName}>{product.shop?.name || "Shop Name"}</Text>
              <Ionicons name="chevron-forward" size={13} color="#6366F1" />
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statPill} onPress={handleLikePress}>
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={14} color="#EF4444" />
                <Text style={[styles.statText, { color: colors.text }]}>{likesCount}</Text>
              </TouchableOpacity>
              <View style={styles.statPill}>
                <Ionicons name="eye-outline" size={14} color="#9CA3AF" />
                <Text style={[styles.statText, { color: colors.text }]}>{viewCount}</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                <Text style={[styles.statText, { color: colors.text }]}>{formatDate(product.created_at)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── DESCRIPTION ── */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="document-text-outline" size={18} color="#6366F1" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            </View>
            <Text style={[styles.description, { color: colors.text }]}>
              {product.description || "No description available."}
            </Text>
          </View>

          {/* ── ON ORDER INFO ── */}
          {!productData.in_stock && (
            <View style={[styles.onOrderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.onOrderHeader}>
                <View style={styles.onOrderIconBox}>
                  <Ionicons name="time-outline" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.onOrderTitle, { color: colors.text }]}>On Order Product</Text>
                  <Text style={styles.onOrderDesc}>
                    A 50% deposit is required. The remaining balance is due when the product arrives.
                  </Text>
                  {(product.est_arrival_days || product.lead_time_days) && (
                    <Text style={styles.arrivalText}>
                      Est. arrival: {product.est_arrival_days || product.lead_time_days} days
                    </Text>
                  )}
                </View>
              </View>

              {deliveryFees.length > 0 && (
                <View style={[styles.deliverySection, { borderTopColor: colors.border }]}>
                  <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                    <Ionicons name="location-outline" size={15} color="#9CA3AF" style={{ marginRight: 6 }} />
                    <Text style={[styles.deliveryTitle, { color: colors.text }]}>Delivery Fees by Location</Text>
                  </View>
                  {deliveryFees.map((f, i) => (
                    <View key={i} style={[styles.feeRow, { borderBottomColor: colors.border }]}>
                      <Text style={styles.feeLabel}>{f.label}</Text>
                      <Text style={styles.feeValue}>{f.value === 0 ? "Free" : `N$${formatPrice(f.value)}`}</Text>
                    </View>
                  ))}
                  {product.free_delivery_threshold > 0 && (
                    <View style={styles.freeDeliveryRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                      <Text style={styles.freeDeliveryText}>
                        Free delivery on orders above N${formatPrice(product.free_delivery_threshold)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── SPECIFICATIONS ── */}
          {specs.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconBox}>
                  <Ionicons name="list-outline" size={18} color="#6366F1" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Specifications</Text>
              </View>
              {specs.map((spec, i) => (
                <View key={i} style={[styles.specRow, i < specs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={[styles.specValue, { color: colors.text }]}>{spec.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── QUANTITY ── */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="basket-outline" size={18} color="#6366F1" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quantity</Text>
            </View>
            <View style={styles.quantityRow}>
              <View style={[styles.quantitySelector, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#F3F4F6", borderColor: colors.border }]}>
                <TouchableOpacity style={styles.qtyBtn} onPress={decrementQuantity}>
                  <Ionicons name="remove" size={20} color={quantity <= 1 ? "#9CA3AF" : "#6366F1"} />
                </TouchableOpacity>
                <View style={[styles.qtyValue, { borderColor: colors.border }]}>
                  <Text style={[styles.qtyText, { color: colors.text }]}>{quantity}</Text>
                </View>
                <TouchableOpacity style={styles.qtyBtn} onPress={incrementQuantity}>
                  <Ionicons name="add" size={20} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text style={styles.stockInfoText}>
                {productData.quantity > 10 ? "In Stock" : productData.quantity > 0 ? `Only ${productData.quantity} left` : "Out of Stock"}
              </Text>
            </View>
          </View>

          {/* ── COMMENTS ── */}
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setCommentModalVisible(true)}
          >
            <View style={styles.commentsRow}>
              <View style={styles.sectionIconBox}>
                <MaterialIcons name="chat-bubble-outline" size={18} color="#6366F1" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Comments & Reviews</Text>
                <Text style={styles.commentsSub}>See what others are saying</Text>
              </View>
              {commentCount > 0 && (
                <View style={styles.commentsBadge}>
                  <Text style={styles.commentsBadgeText}>{commentCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          {/* ── SELLER ── */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sellerRow}>
              <View style={styles.sellerIconBox}>
                <MaterialIcons name="storefront" size={22} color="#6366F1" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sellerLabel}>Sold by</Text>
                <Text style={[styles.sellerName, { color: colors.text }]}>{product?.shop?.name || "Unknown Shop"}</Text>
              </View>
            </View>
            <View style={styles.sellerActions}>
              <TouchableOpacity
                style={[styles.sellerBtn, { backgroundColor: isDarkMode ? "rgba(99,102,241,0.12)" : "#EEF2FF", borderColor: "#6366F1" }]}
                onPress={handleViewShop}
              >
                <MaterialIcons name="store" size={16} color="#6366F1" />
                <Text style={styles.sellerBtnText}>View Shop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sellerBtn, styles.arBtn]} onPress={() => setArViewerVisible(true)}>
                <MaterialIcons name="view-in-ar" size={16} color="#fff" />
                <Text style={[styles.sellerBtnText, { color: "#fff" }]}>View in AR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── INTERACTIVE ZOOM ── */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="search" size={18} color="#6366F1" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Interactive Zoom</Text>
              <View style={styles.enhancedBadge}>
                <Text style={styles.enhancedBadgeText}>Enhanced</Text>
              </View>
            </View>

            <View style={styles.zoomWrapper}>
              <View style={styles.zoomImageClip}>
                <ImageZoom
                  imageUri={productImages[currentZoomImageIndex]}
                  width={width - 72}
                  height={300}
                  style={{ borderRadius: 16, width: "100%" }}
                  onSwipeLeft={() => productImages.length > 1 && setCurrentZoomImageIndex((p) => (p === productImages.length - 1 ? 0 : p + 1))}
                  onSwipeRight={() => productImages.length > 1 && setCurrentZoomImageIndex((p) => (p === 0 ? productImages.length - 1 : p - 1))}
                />
              </View>

              {productImages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.zoomArrow, styles.zoomArrowLeft]}
                    onPress={() => setCurrentZoomImageIndex((p) => (p === 0 ? productImages.length - 1 : p - 1))}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.zoomArrow, styles.zoomArrowRight]}
                    onPress={() => setCurrentZoomImageIndex((p) => (p === productImages.length - 1 ? 0 : p + 1))}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.zoomCounter}>
                    <Text style={styles.zoomCounterText}>{currentZoomImageIndex + 1} / {productImages.length}</Text>
                  </View>
                </>
              )}
            </View>

            {productImages.length > 1 && (
              <View style={styles.zoomDots}>
                {productImages.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.zoomDot, { backgroundColor: i === currentZoomImageIndex ? "#6366F1" : colors.border }]}
                    onPress={() => setCurrentZoomImageIndex(i)}
                  />
                ))}
              </View>
            )}

            <View style={[styles.zoomHint, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F9FAFB", borderColor: colors.border }]}>
              <Ionicons name="hand-left-outline" size={14} color="#9CA3AF" />
              <Text style={styles.zoomHintText}>Pinch to zoom · Double-tap to reset</Text>
              {productImages.length > 1 && (
                <>
                  <View style={[styles.hintDivider, { backgroundColor: colors.border }]} />
                  <Ionicons name="swap-horizontal" size={14} color="#9CA3AF" />
                  <Text style={styles.zoomHintText}>Swipe to navigate</Text>
                </>
              )}
            </View>
          </View>

          {/* Stock Alert + Price History */}
          <StockAlert
            stockLevel={productData.quantity || 0}
            lowStockThreshold={10}
            veryLowStockThreshold={5}
            outOfStockThreshold={0}
            onNotifyMePress={handleStockNotification}
          />
          <PriceHistory
            priceData={priceHistory}
            currentPrice={product.price}
            onPriceAlertPress={handlePriceAlert}
          />

          <View style={{ height: 20 }} />
        </View>

        {/* Modals */}
        <CommentModal
          type="product" itemId={product.id}
          visible={commentModalVisible}
          onClose={() => setCommentModalVisible(false)}
          itemName={product.name}
        />
        <ARProductViewer visible={arViewerVisible} onClose={() => setArViewerVisible(false)} product={product} />
      </ScrollView>

      {/* ── STICKY ACTION BAR ── */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.addToCartShadow} onPress={handleAddToCart} activeOpacity={0.88}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addToCartBtn}>
            <Ionicons name="cart-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.addToCartText}>{productData.in_stock ? "Add to Cart" : "Pay 50% Deposit"}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.buyNowBtn, { borderColor: "#6366F1" }]} onPress={handleBuyNow} activeOpacity={0.88}>
          <Ionicons name="flash" size={18} color="#6366F1" style={{ marginRight: 4 }} />
          <Text style={styles.buyNowText}>{productData.in_stock ? "Buy Now" : "Order Now"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Floating header
  headerOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center", alignItems: "center",
  },
  loginPill: {
    paddingHorizontal: 18, height: 36, borderRadius: 18,
    backgroundColor: "#6366F1",
    justifyContent: "center", alignItems: "center",
  },
  loginPillText: { color: "#fff", fontSize: 14, fontFamily: FONTS.semiBold },

  // Image section
  imageSection: { height: 370, backgroundColor: "#0A0A0A" },
  imageSlide:   { width, height: 370 },
  carouselImage: { width, height: 370 },
  imageFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 110 },
  imageBadges: {
    position: "absolute",
    top: Platform.OS === "android" ? 72 : 108,
    right: 16,
    alignItems: "flex-end", gap: 8,
  },
  stockBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  stockBadgeText: { color: "#fff", fontSize: 12, fontFamily: FONTS.semiBold },
  saleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(239,68,68,0.9)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  saleBadgeText: { color: "#fff", fontSize: 12, fontFamily: FONTS.semiBold },
  paginationRow: {
    position: "absolute", bottom: 18, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center",
  },
  dot: { height: 8, borderRadius: 4, backgroundColor: "#fff", marginHorizontal: 3 },

  // Content area
  content: {
    paddingHorizontal: 20, paddingTop: 24,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -26,
  },
  productName: { fontSize: 24, fontFamily: FONTS.bold, marginBottom: 8, lineHeight: 30 },
  priceRow:    { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 14 },
  price:        { fontSize: 28, fontFamily: FONTS.bold, color: "#6366F1" },
  originalPrice: { fontSize: 16, fontFamily: FONTS.medium, textDecorationLine: "line-through", color: "#9CA3AF" },
  metaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14, flexWrap: "wrap", gap: 8,
  },
  shopPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  shopName: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#6366F1" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: FONTS.medium },
  divider:  { height: 1, marginBottom: 16 },

  // Section cards
  sectionCard: {
    borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.bold, flex: 1 },
  description:  { fontSize: 15, fontFamily: FONTS.regular, lineHeight: 24 },

  // On-order card
  onOrderCard: {
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderLeftWidth: 4, borderLeftColor: "#F59E0B",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  onOrderHeader: { flexDirection: "row", gap: 12, marginBottom: 10 },
  onOrderIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.12)",
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  onOrderTitle: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 4 },
  onOrderDesc:  { fontSize: 13, fontFamily: FONTS.regular, color: "#9CA3AF", lineHeight: 20 },
  arrivalText:  { fontSize: 13, fontFamily: FONTS.semiBold, color: "#F59E0B", marginTop: 6 },
  deliverySection: { borderTopWidth: 1, paddingTop: 14, marginTop: 4 },
  deliveryTitle:   { fontSize: 14, fontFamily: FONTS.semiBold },
  feeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  feeLabel:    { fontSize: 13, fontFamily: FONTS.regular, color: "#9CA3AF" },
  feeValue:    { fontSize: 13, fontFamily: FONTS.semiBold, color: "#6366F1" },
  freeDeliveryRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10 },
  freeDeliveryText: { fontSize: 12, fontFamily: FONTS.medium, color: "#22C55E" },

  // Specs
  specRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  specLabel: { fontSize: 14, fontFamily: FONTS.regular, color: "#9CA3AF" },
  specValue: { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: "right", flex: 1, marginLeft: 8 },

  // Quantity
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quantitySelector: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1, overflow: "hidden",
  },
  qtyBtn:  { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  qtyValue: {
    width: 56, height: 48, justifyContent: "center", alignItems: "center",
    borderLeftWidth: 1, borderRightWidth: 1,
  },
  qtyText:       { fontSize: 18, fontFamily: FONTS.bold },
  stockInfoText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#22C55E" },

  // Comments
  commentsRow:       { flexDirection: "row", alignItems: "center" },
  commentsSub:       { fontSize: 12, fontFamily: FONTS.regular, color: "#9CA3AF", marginTop: 2 },
  commentsBadge:     { backgroundColor: "#6366F1", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  commentsBadgeText: { color: "#fff", fontSize: 12, fontFamily: FONTS.semiBold },

  // Seller
  sellerRow:    { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sellerIconBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  sellerLabel:  { fontSize: 12, fontFamily: FONTS.regular, color: "#9CA3AF" },
  sellerName:   { fontSize: 16, fontFamily: FONTS.bold },
  sellerActions: { flexDirection: "row", gap: 10 },
  sellerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  arBtn:        { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  sellerBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#6366F1" },

  // Zoom section
  enhancedBadge:     { backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  enhancedBadgeText: { fontSize: 11, fontFamily: FONTS.semiBold, color: "#F59E0B" },
  zoomWrapper:   { position: "relative", marginBottom: 12 },
  zoomImageClip: { borderRadius: 16, overflow: "hidden" },
  zoomArrow: {
    position: "absolute", top: "50%", marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)",
  },
  zoomArrowLeft:  { left: 10 },
  zoomArrowRight: { right: 10 },
  zoomCounter: {
    position: "absolute", top: 12, right: 12, zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  zoomCounterText: { color: "#fff", fontSize: 13, fontFamily: FONTS.semiBold },
  zoomDots:        { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 12 },
  zoomDot:         { width: 8, height: 8, borderRadius: 4 },
  zoomHint: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  zoomHintText: { fontSize: 12, fontFamily: FONTS.regular, color: "#9CA3AF" },
  hintDivider:  { width: 1, height: 12 },

  // Error state
  errorBox:      { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText:     { fontSize: 18, fontFamily: FONTS.medium, marginVertical: 16 },
  errorBtnShadow: {
    borderRadius: 14, marginTop: 8,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  errorBtnGrad: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  errorBtnText: { color: "#fff", fontSize: 15, fontFamily: FONTS.semiBold },

  // Action bar
  actionBar: {
    flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
  },
  addToCartShadow: {
    flex: 1.2, borderRadius: 14,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  addToCartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 15, borderRadius: 14,
  },
  addToCartText: { color: "#fff", fontSize: 14, fontFamily: FONTS.bold },
  buyNowBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 15, borderRadius: 14, borderWidth: 2,
  },
  buyNowText: { fontSize: 14, fontFamily: FONTS.bold, color: "#6366F1" },
});

export default ProductDetailsScreen;
