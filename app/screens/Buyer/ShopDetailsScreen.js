import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ImageBackground,
  Platform,
  Modal,
  Pressable,
  Share,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../lib/supabase";
import ProductCard from "../../components/ProductCard";
import EmptyState from "../../components/ui/EmptyState";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { COLORS, FONTS, SHADOWS } from "../../constants/theme";
import ShopRating from "../../components/ShopRating";
import ShopRatingDisplay from "../../components/ShopRatingDisplay";
import ShopRatingModal from "../../components/ShopRatingModal";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const ShopDetailsScreen = ({ route, navigation }) => {
  const { shopId } = route.params || {};
  const { user } = useAuthStore();
  const { addToCart } = useCartStore();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likedProducts, setLikedProducts] = useState({});
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [ratingDisplayKey, setRatingDisplayKey] = useState(0);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [error, setError] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  // Add renderStars function
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color="#FFD700" />
        );
      } else if (i === fullStars + 1 && halfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#FFD700" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#DDD" />
        );
      }
    }
    
    return stars;
  };

  const ReadMoreText = ({ text, limit = 100 }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const isLongText = text.length > limit;
    const previewText = isLongText ? text.slice(0, limit) + "..." : text;

    return (
      <View>
        <Text style={styles.shopDescription}>{previewText}</Text>
        {isLongText && (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Text style={styles.readMoreText}>Read more</Text>
          </TouchableOpacity>
        )}

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.fullText}>{text}</Text>
              </ScrollView>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Fetch shop details and products
  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    fetchShopDetails();
    if (user) {
      checkFollowStatus();
      fetchLikedProducts();
    }
    fetchCurrentUser();
  }, [shopId, user]);

  // Shop share link function
  const handleShopShare = async (shop_name) => {
    shop_name = shop_name.toLowerCase().replace(/ /g, "-");
    try {
      await Share.share({
        message: `🛍️ Check out this awesome shop: https://shopit.com/${shop_name}`,
      });
    } catch (error) {
      Alert("Error sharing shop");
    }
  };

  // Fetch liked products
  const fetchLikedProducts = async () => {
    if (!user) return;

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

  // Check if the user is following this shop
  const checkFollowStatus = async () => {
    if (!user || !shopId) return;

    try {
      const { data, error } = await supabase
        .from("shop_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("shop_id", shopId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error checking follow status:", error);
        return;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error.message);
    }
  };

  // Toggle follow/unfollow shop
  const toggleFollow = async () => {
    if (!user) {
      Alert.alert("Sign in Required", "Please sign in to follow shops", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => navigation.navigate("Auth") },
      ]);
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow shop
        const { error } = await supabase
          .from("shop_follows")
          .delete()
          .match({ user_id: user.id, shop_id: shopId });

        if (error) throw error;

        setIsFollowing(false);
      } else {
        // Follow shop
        const { error } = await supabase
          .from("shop_follows")
          .insert({ user_id: user.id, shop_id: shopId });

        if (error) throw error;

        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error.message);
      Alert.alert("Error", "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  // Fetch shop details and products
  const fetchShopDetails = async () => {
    try {
      setLoading(true);

      // Fetch shop details
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (shopError) throw shopError;

      // Fetch shop products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(
          `
          *,
          shop:shops (
            id,
            name
          )
        `
        )
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Fetch shop ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("shop_ratings")
        .select("rating")
        .eq("shop_id", shopId);

      if (ratingsError) throw ratingsError;

      // Calculate rating statistics
      if (ratingsData && ratingsData.length > 0) {
        const totalRatings = ratingsData.length;
        const avg =
          ratingsData.reduce((acc, curr) => acc + curr.rating, 0) /
          totalRatings;

        // Calculate rating distribution
        const distribution = {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        };

        ratingsData.forEach((rating) => {
          distribution[rating.rating]++;
        });

        // Convert to percentages
        Object.keys(distribution).forEach((key) => {
          distribution[key] = Math.round(
            (distribution[key] / totalRatings) * 100
          );
        });

        setAverageRating(avg);
        setRatingCount(totalRatings);
        setRatingDistribution(distribution);
        
        // Update shop object with calculated ratings
        shopData.average_rating = avg;
        shopData.ratings_count = totalRatings;
        shopData.ratings_breakdown = {
          5: ratingsData.filter(r => r.rating === 5).length,
          4: ratingsData.filter(r => r.rating === 4).length,
          3: ratingsData.filter(r => r.rating === 3).length,
          2: ratingsData.filter(r => r.rating === 2).length,
          1: ratingsData.filter(r => r.rating === 1).length
        };
      } else {
        // No ratings yet
        shopData.average_rating = 0;
        shopData.ratings_count = 0;
        shopData.ratings_breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      }

      // Process products to handle stock status correctly
      const processedProducts =
        productsData?.map((product) => ({
          ...product,
          in_stock:
            product.is_on_order !== undefined
              ? !product.is_on_order
              : product.stock_quantity > 0,
        })) || [];
      
      // Fetch followers count
      const { data: followersData, error: followersError } = await supabase
        .from("shop_follows")
        .select("id")
        .eq("shop_id", shopId);
        
      if (followersError) {
        console.error("Error fetching followers:", followersError);
      }
      
      // Update shop object with product count and followers count
      shopData.product_count = processedProducts.length;
      shopData.followers_count = followersData?.length || 0;

      setShop(shopData);
      setProducts(processedProducts);

      // Extract unique categories from products
      if (processedProducts && processedProducts.length > 0) {
        const uniqueCategories = [
          ...new Set(processedProducts.map((product) => product.category)),
        ]
          .filter((category) => category) // Remove null/undefined
          .sort();

        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Error fetching shop details:", error.message);
      Alert.alert("Error", "Failed to load shop details. Please try again.");
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refreshing
  const handleRefresh = () => {
    setRefreshing(true);
    fetchShopDetails();
    if (user) {
      fetchLikedProducts();
    }
  };

  // Filter products by category
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((product) => product.category === selectedCategory);

  // Navigate to product details
  const handleProductPress = (product) => {
    navigation.navigate("ProductDetails", { product });
  };

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setCurrentUser(profile);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const handleRatingSubmit = async () => {
    if (!user || rating === 0) return;
    
    try {
      // Check if user has already rated this shop
      const { data: existingRating, error: checkError } = await supabase
        .from('shop_ratings')
        .select('id')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is the error code for "no rows returned"
        throw checkError;
      }
      
      let ratingResult;
      
      if (existingRating) {
        // Update existing rating
        ratingResult = await supabase
          .from('shop_ratings')
          .update({
            rating: rating,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRating.id);
      } else {
        // Create new rating
        ratingResult = await supabase
          .from('shop_ratings')
          .insert({
            shop_id: shopId,
            user_id: user.id,
            rating: rating
          });
      }
      
      if (ratingResult.error) throw ratingResult.error;
      
      // Refresh shop details to get updated ratings
      fetchShopDetails();
      
      // Reset form
      setRating(0);
      setReview('');
      
      // Close modal
      setRatingModalVisible(false);
      
      // Show success message
      Alert.alert('Thank you!', 'Your rating has been submitted successfully.');
      
      // Force refresh of the rating display by changing its key
      setRatingDisplayKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit your rating. Please try again.');
    }
  };

  // Get icon for category
  const getCategoryIcon = (category) => {
    if (!category) return "grid-outline";
    
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
      case "beverage":
        return "cafe-outline";
      case "blanket":
        return "bed-outline";
      case "meat":
        return "fast-food-outline";
      default:
        return "grid-outline";
    }
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state - shop not found
  if (error || !shop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={50} color="#FF3B30" />
          <Text style={styles.errorText}>
            Shop not found or an error occurred.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchShopDetails()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => handleGoBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => handleShopShare(shop.name)}
            >
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          style={styles.scrollViewStyling}
        >
          <View style={styles.heroSection}>
            <Image
              source={
                shop.banner_url
                  ? { uri: shop.banner_url }
                  : { uri: "https://via.placeholder.com/800x400/2B3147/FFFFFF?text=Shop+Banner" }
              }
              style={styles.background}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.85)"]}
              style={styles.overlay}
            />
            
            <View style={styles.shopProfileSection}>
              <View style={styles.shopLogoContainer}>
                <Image
                  source={
                    shop.logo_url
                      ? { uri: shop.logo_url }
                      : { uri: "https://via.placeholder.com/200/FFFFFF/2B3147?text=Shop" }
                  }
                  style={styles.shopLogo}
                  resizeMode="cover"
                />
              </View>
              
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <ReadMoreText text={shop.description || "No description provided"} limit={80} />
                
                <View style={styles.shopStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="people-outline" size={16} color="#fff" />
                    <Text style={styles.statText}>
                      {shop.followers_count || 0} Followers
                    </Text>
                  </View>
                  <Text style={styles.statDivider}>•</Text>
                  <View style={styles.statItem}>
                    <Ionicons name="cube-outline" size={16} color="#fff" />
                    <Text style={styles.statText}>
                      {shop.product_count || 0} Products
                    </Text>
                  </View>
                  <Text style={styles.statDivider}>•</Text>
                  <View style={styles.statItem}>
                    <Ionicons name="star-outline" size={16} color="#fff" />
                    <Text style={styles.statText}>
                      {shop.average_rating?.toFixed(1) || "0.0"} Rating
                    </Text>
                  </View>
                </View>
                
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      isFollowing && styles.followingButton,
                    ]}
                    onPress={toggleFollow}
                  >
                    <Ionicons
                      name={isFollowing ? "checkmark" : "add"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.followButtonText}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => 
                      navigation.navigate("ChatDetail", {
                        recipientId: shop.owner_id,
                        recipientName: shop.name,
                        recipientImage: shop.logo_url,
                      })
                    }
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.contentBody}>
            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === "all" && styles.selectedCategoryChip,
                ]}
                onPress={() => setSelectedCategory("all")}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons
                    name="grid-outline"
                    size={16}
                    color={selectedCategory === "all" ? "#fff" : COLORS.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === "all" && styles.selectedCategoryText,
                  ]}
                >
                  All Products
                </Text>
              </TouchableOpacity>

              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category &&
                      styles.selectedCategoryChip,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={styles.categoryIconContainer}>
                    <Ionicons
                      name={getCategoryIcon(category)}
                      size={16}
                      color={selectedCategory === category ? "#fff" : COLORS.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ratings Section */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <View style={styles.ratingTitleContainer}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={styles.ratingTitle}>Shop Ratings</Text>
                </View>
                {user && (
                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => setRatingModalVisible(true)}
                  >
                    <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.rateButtonText}>Rate Shop</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.ratingContent}>
                <View style={styles.ratingMain}>
                  <Text style={styles.averageRating}>
                    {shop.average_rating?.toFixed(1) || "0.0"}
                  </Text>
                  <View style={styles.starsContainer}>
                    {renderStars(shop.average_rating || 0)}
                  </View>
                  <Text style={styles.ratingCount}>
                    {shop.ratings_count || 0} ratings
                  </Text>
                </View>
                
                <View style={styles.ratingStats}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = shop.ratings_breakdown?.[star] || 0;
                    const percentage =
                      shop.ratings_count > 0
                        ? (count / shop.ratings_count) * 100
                        : 0;
                    return (
                      <View key={star} style={styles.statItem}>
                        <Text style={styles.statNumber}>{star}</Text>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <View style={styles.statBar}>
                          <View
                            style={[
                              styles.statBarFill,
                              { width: `${percentage}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.statCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Products Section */}
            <View style={styles.productsContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="grid-outline" size={20} color="#2B3147" />
                <Text style={styles.sectionTitle}>
                  {selectedCategory === "all"
                    ? "Products"
                    : `${selectedCategory} Products`}
                </Text>
              </View>

              {filteredProducts.length === 0 ? (
                <View style={styles.emptyProductsContainer}>
                  <MaterialIcons
                    name="shopping-bag"
                    size={48}
                    color="#DDD"
                  />
                  <Text style={styles.emptyProductsText}>
                    No products found in this category.
                  </Text>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onPress={handleProductPress}
                      onLikePress={handleLikePress}
                      isLiked={likedProducts[product.id]}
                      onAddToCart={handleAddToCart}
                      style={styles.productCardStyle}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.browseAllButton}
            onPress={() =>
              navigation.navigate("BrowseProducts", {
                shopId: shop.id,
                shopName: shop.name,
              })
            }
          >
            <Text style={styles.browseAllButtonText}>Browse All Products</Text>
            <Ionicons name="arrow-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </ScrollView>
        
        {/* Rating Modal */}
        <Modal
          visible={ratingModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRatingModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setRatingModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rate this Shop</Text>
                <Text style={styles.modalSubtitle}>
                  How would you rate your experience with {shop.name}?
                </Text>
                
                <View style={styles.starsRatingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                    >
                      <Ionicons
                        name={rating >= star ? "star" : "star-outline"}
                        size={36}
                        color={rating >= star ? "#FFD700" : "#DDD"}
                        style={styles.ratingStar}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Write your review (optional)"
                  multiline
                  numberOfLines={4}
                  value={review}
                  onChangeText={setReview}
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setRatingModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      rating === 0 && styles.disabledButton,
                    ]}
                    onPress={handleRatingSubmit}
                    disabled={rating === 0}
                  >
                    <Text style={styles.submitButtonText}>Submit Rating</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  heroSection: {
    position: 'relative',
    height: 300,
  },
  background: {
    width: "100%",
    height: 400,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    height: 400,
  },
  scrollViewStyling: {
    flex: 1,
  },
  shopProfileSection: {
    position: 'absolute',
    bottom: 0,
    top: 15,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  shopLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: "#fff",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "rgba(0, 0, 0, 0.1)",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
        }
      : {
          elevation: 10,
        }),
  },
  shopLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  shopInfo: {
    width: "100%",
  },
  shopName: {
    fontSize: 28,
    color: "#fff",
    marginBottom: 4,
    fontFamily: FONTS.bold,
  },
  shopDescription: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  shopStats: {
    flexDirection: "row",
    alignItems: "center",
    // marginTop: 8,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  statDivider: {
    color: "rgba(255, 255, 255, 0.6)",
    marginHorizontal: 8,
    fontSize: 16,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#fff",
  },
  followingButton: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  followButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#fff",
    fontFamily: FONTS.medium,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#fff",
    marginLeft: 10,
  },
  messageButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#fff",
    fontFamily: FONTS.medium,
  },
  contentBody: {
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 40,
    paddingTop: 8,
    paddingBottom: 24,
  },
  categoriesContainer: {
    marginBottom: 15,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: COLORS.primary,
  },
  categoryIconContainer: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    fontFamily: FONTS.medium,
  },
  selectedCategoryText: {
    color: "#FFF",
  },
  ratingSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0,0,0,0.05)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rateButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: 4,
  },
  ratingContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingMain: {
    alignItems: "center",
    flex: 1,
  },
  averageRating: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  starsContainer: {
    flexDirection: "row",
    marginVertical: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  ratingStats: {
    flex: 1.5,
    marginLeft: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statNumber: {
    width: 14,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  statBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  statCount: {
    width: 24,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    textAlign: "right",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#2B3147",
    marginLeft: 8,
    fontFamily: FONTS.semiBold,
  },
  productsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  productCardStyle: {
    width: "48%",
    marginBottom: 16,
  },
  emptyProductsContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyProductsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    fontFamily: FONTS.regular,
  },
  browseAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  browseAllButtonText: {
    fontSize: 16,
    color: "#007AFF",
    marginRight: 8,
    fontFamily: FONTS.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontFamily: FONTS.regular,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    fontFamily: FONTS.medium,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#2B3147",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  starsRatingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  ratingStar: {
    marginHorizontal: 8,
  },
  reviewInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  readMoreText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: FONTS.regular,
    lineHeight: 20,
    marginBottom: 12,
  },
});

export default ShopDetailsScreen;
