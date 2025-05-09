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
import CommentModal from '../../components/common/CommentModal';
import ARProductViewer from '../../components/ARProductViewer';
import { MaterialIcons } from '@expo/vector-icons';
import { SHADOWS } from "../../constants/theme";

const { width, height } = Dimensions.get("window");

const StockStatusIndicator = ({ inStock, quantity }) => {
  const backgroundColor = inStock ? 'rgba(13, 19, 22, 0.63)' : 'rgba(13, 19, 22, 0.63)';
  const textColor = inStock ? '#34C759' : '#FF9500';
  const borderColor = inStock ? 'rgba(52, 199, 89, 0.97)' : 'rgba(255, 149, 0, 0.5)';
  
  return (
    <View style={[styles.stockContainer, { 
      backgroundColor, 
      borderColor,
      backdropFilter: 'blur(8px)',
    }]}>
      <View style={[styles.stockDot, { backgroundColor: textColor }]} />
      <Text style={[styles.stockText, { 
        color: textColor,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }]}>
        {inStock ? 'In Stock' : 'On Order'}
        {inStock && typeof quantity === 'number' && ` • ${quantity} available`}
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

  // Use the useRealtime hook to set up real-time updates
  const { subscribeToTable } = useRealtime('ProductDetailsScreen', {
    tables: ['product_views', 'product_likes', 'product_comments'],
    autoRefreshTables: ['product_views', 'product_likes', 'product_comments'],
    refreshCallback: handleRealtimeUpdate,
  });

  // Handler for real-time updates
  function handleRealtimeUpdate(table, payload) {
    if (!product?.id) return;

    switch (table) {
      case 'product_views':
        if (payload.new.product_id === product.id) {
          // Fetch updated view count
          fetchProductViewCount();
        }
        break;
      case 'product_likes':
        if (payload.new?.product_id === product.id || payload.old?.product_id === product.id) {
          // Fetch updated likes count
          fetchLikesCount();
        }
        break;
      case 'product_comments':
        if (payload.new?.product_id === product.id || payload.old?.product_id === product.id) {
          // Fetch updated comment count
          fetchCommentCount();
        }
        break;
      case 'products':
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
      subscribeToTable('products', '*', (payload) => {
        if (payload.new?.id === product.id) {
          updateProductData(payload.new);
        }
      });
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
              user_id: '00000000-0000-0000-0000-000000000000', // Anonymous user ID
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
      Alert.alert('Login Required', 'You need to login to contact sellers.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Login',
          onPress: () => navigation.navigate('Auth', { screen: 'Login' }),
        },
      ]);
      return;
    }

    // Ensure we have the seller information
    if (!product?.shop?.owner) {
      Alert.alert('Error', 'Seller information not available');
      return;
    }

    const sellerId = product.shop.owner.id;
    const sellerName = `${product.shop.owner.firstname || ''} ${product.shop.owner.lastname || ''}`.trim() || product.shop.owner.username;
    const sellerImage = product.shop.owner.profile_image;

    // Navigate to the chat screen
    navigation.navigate('Messages', {
      screen: 'ChatDetail',
      params: {
        recipientId: sellerId,
        recipientName: sellerName,
        recipientImage: sellerImage,
        recipientRole: 'seller'
      }
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
      console.log('Fetching comments for product:', product.id); // Debug log
      const { count, error } = await supabase
        .from('product_comments')  // Changed from 'comments' to 'product_comments'
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);  // Changed from 'item_id' to 'product_id'

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }
      
      console.log('Comment count:', count); // Debug log
      setCommentCount(count || 0);
    } catch (error) {
      console.error('Error fetching comment count:', error);
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
        .from('products')
        .select(`
          *,
          shop:shops(
            id,
            name
          )
        `)
        .eq('id', product.id)
        .single();

      if (error) throw error;

      if (data) {
        setProductData({
          ...data,
          in_stock: data.is_on_order !== undefined 
            ? !data.is_on_order 
            : (data.stock_quantity || 0) > 0
        });
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
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
              <StockStatusIndicator 
                inStock={productData.in_stock} 
                quantity={productData.quantity}
              />

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
                {product.lead_time_days && (
                  <Text style={styles.estimatedArrival}>
                    Estimated arrival: {product.lead_time_days} days
                  </Text>
                )}
                
                <View style={styles.feesContainer}>
                  {product.runner_fee > 0 && (
                    <View style={styles.feeItem}>
                      <Text style={styles.feeLabel}>Runner Fee:</Text>
                      <Text style={styles.feeValue}>N${formatPrice(product.runner_fee)}</Text>
                    </View>
                  )}
                  
                  {product.transport_fee > 0 && (
                    <View style={styles.feeItem}>
                      <Text style={styles.feeLabel}>Transport Fee:</Text>
                      <Text style={styles.feeValue}>N${formatPrice(product.transport_fee)}</Text>
                    </View>
                  )}
                  
                  <View style={styles.feeDivider} />
                  
                  <Text style={styles.feeExplanation}>
                    Runner fee is paid upfront when placing your order.
                    Transport fee is paid upon delivery of your items.
                  </Text>
                </View>
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

          {/* Separator line */}
          <View style={styles.separator} />

          {/* Comment Button with count */}
          <TouchableOpacity 
            style={styles.commentButton}
            onPress={toggleCommentModal}
          >
            <View style={styles.commentButtonContent}>
              <MaterialIcons name="chat-bubble-outline" size={22} color={COLORS.primary} />
              <Text style={styles.commentButtonText}>
                View Comments
              </Text>
            </View>
            {commentCount > 0 && (
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{commentCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Comment Modal */}
          <CommentModal
            type="product"
            itemId={product.id}
            visible={commentModalVisible}
            onClose={() => setCommentModalVisible(false)}
            itemName={product.name}
          />

          {/* AR Product Viewer */}
          <ARProductViewer
            visible={arViewerVisible}
            onClose={() => setArViewerVisible(false)}
            product={product}
          />

          {/* Shop Info Section - Updated Design */}
          <View style={styles.sellerCardContainer}>
            <View style={styles.sellerInfoSection}>
              <MaterialIcons name="storefront" size={22} color={COLORS.primary} />
              <View style={styles.sellerTextContainer}>
                <Text style={styles.sellerLabel}>Seller</Text>
                <Text style={styles.sellerName}>{product?.shop?.name || "Unknown Shop"}</Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setCommentModalVisible(true)}
              >
                <MaterialIcons name="comment" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>
                  View Comments
                </Text>
              </TouchableOpacity>
              
              {/* AR View Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.arButton]}
                onPress={() => setArViewerVisible(true)}
              >
                <MaterialIcons name="view-in-ar" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, styles.arButtonText]}>
                  View in AR
                </Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  addToCartButton: {
    flex: 1,
    marginRight: 10,
    maxWidth: '45%',
  },
  buyNowButton: {
    flex: 1,
    marginLeft: 10,
    maxWidth: '45%',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eeeeee',
    ...SHADOWS.small,
  },
  sellerInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewShopButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactSellerButtonText: {
    color: '#fff',
    fontFamily: FONTS.medium,
    fontSize: 14,
    marginLeft: 6,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  commentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginVertical: 8,
    borderWidth: 1.5,
    ...SHADOWS.small,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stockText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
  },
  feesContainer: {
    marginTop: 15,
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  feeLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#333",
  },
  feeValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#FF9800",
  },
  feeDivider: {
    height: 1,
    backgroundColor: "#FFE0B2",
    marginVertical: 8,
  },
  feeExplanation: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
});

export default ProductDetailsScreen;
