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
import { COLORS, FONTS } from "../../constants/theme";

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
  }, [shopId, user]);

  // Fetch liked products
  const fetchLikedProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('product_likes')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const likes = {};
      data.forEach(like => {
        likes[like.product_id] = true;
      });
      setLikedProducts(likes);
    } catch (error) {
      console.error('Error fetching liked products:', error);
    }
  };

  // Handle like press
  const handleLikePress = async (productId) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to like products.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }
        ]
      );
      return;
    }

    try {
      const isLiked = likedProducts[productId];
      
      if (isLiked) {
        // Unlike the product
        const { error } = await supabase
          .from('product_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) throw error;

        setLikedProducts(prev => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });
      } else {
        // Like the product
        const { error } = await supabase
          .from('product_likes')
          .insert([
            { user_id: user.id, product_id: productId }
          ]);

        if (error) throw error;

        setLikedProducts(prev => ({
          ...prev,
          [productId]: true
        }));
      }
    } catch (error) {
      console.error('Error updating like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  // Handle add to cart
  const handleAddToCart = async (product) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }
        ]
      );
      return;
    }

    try {
      addToCart(product);
      Alert.alert('Success', 'Item added to your cart!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
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
        .select(`
          *,
          shop:shops (
            id,
            name
          )
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Process products to handle stock status correctly
      const processedProducts = productsData?.map(product => ({
        ...product,
        in_stock: product.is_on_order !== undefined ? !product.is_on_order : (product.stock_quantity > 0)
      })) || [];

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
  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Shop Not Found"
          message="The shop you are looking for does not exist or has been removed."
          actionLabel="Go Back"
          onAction={handleGoBack}
          iconColor="#FF3B30"
        />
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={
          shop.banner_url
            ? { uri: shop.banner_url }
            : require("../../../assets/shop-background-ph1.jpg")
        }
        style={styles.background}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            {/* <Text style={styles.headerTitle}>{shop.name}</Text> */}
            <View style={styles.placeholder} />
          </View>

          <View style={styles.shopInfoContainer}>
            <View style={styles.shopLogoContainer}>
              <Image
                source={
                  shop.logo_url
                    ? { uri: shop.logo_url }
                    : require("../../../assets/logo-placeholder.png")
                }
                style={styles.shopLogo}
              />
            </View>

            <View style={styles.shopDetails}>
              <Text style={styles.shopName}>{shop.name}</Text>

              {/* Follow Button */}
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing ? styles.followingButton : {},
                ]}
                onPress={toggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={isFollowing ? "#fff" : "#007AFF"}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? "heart" : "heart-outline"}
                      size={16}
                      color={isFollowing ? "#fff" : "#007AFF"}
                    />
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing ? styles.followingButtonText : {},
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* <Text style={styles.shopDescription}>{shop.description}</Text> */}
              {/* <Text style={styles.shopDescription}> */}
              <ReadMoreText text={shop.description} limit={150} />
              {/* </Text> */}

              {/* Shop stats */}
              <View style={styles.shopStats}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="location-outline"
                    size={25}
                    color={COLORS.accent}
                  />
                  <Text style={styles.statText}>
                    {shop.location || "Namibia"}
                  </Text>
                </View>
                <Text style={styles.horizontalDivider}> | </Text>
                <View style={styles.statItem}>
                  <Ionicons
                    name="bag-outline"
                    size={25}
                    color={COLORS.accent}
                  />
                  <Text style={styles.statText}>
                    {products.length} Products
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Product categories */}
      {categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === "all" && styles.selectedCategoryChip,
              ]}
              onPress={() => setSelectedCategory("all")}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === "all" && styles.selectedCategoryText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.selectedCategoryChip,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
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
        </View>
      )}
      

      <ScrollView
        style={styles.scrollViewStyling}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
        }
      >
        {/* Shop products */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Products</Text>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProductsContainer}>
              <Ionicons name="basket-outline" size={64} color="#CCC" />
              <Text style={styles.emptyProductsText}>
                {selectedCategory === "all"
                  ? "This shop has no products yet."
                  : `No products found in "${selectedCategory}" category.`}
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map(item => (
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
          )}
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  placeholder: {
    width: 40,
  },
  background: {
    height: 200,
    width: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 20,
  },
  shopInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
    marginLeft: 30,
    // backgroundColor:'red'
  },
  shopLogoContainer: {
    width: 90,
    height: 90,
    backgroundColor:'yellow',
    borderRadius: 45,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    padding: 2,
    borderWidth: 2,
    borderColor: "#fff",
    ...(Platform.OS === 'ios' ? {
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    } : {
      elevation: 4,
    }),
  },
  shopLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
    fontFamily: FONTS.bold,
  },
  shopDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    // marginBottom: 8,
    fontFamily: FONTS.regular,
    width:'95%'
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#fff",
  },
  followingButton: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  followButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#fff",
    fontFamily: FONTS.medium,
  },
  followingButtonText: {
    color: "#fff",
  },
  shopStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    color: "#fff",
    marginLeft: 4,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  horizontalDivider: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.8,
    marginHorizontal: 8,
  },
  categoriesContainer: {
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginHorizontal: 6,
  },
  selectedCategoryChip: {
    backgroundColor: "#2B3147",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    fontFamily: FONTS.regular,
  },
  selectedCategoryText: {
    color: "#fff",
    fontFamily: FONTS.medium,
  },
  scrollViewStyling: {
    flex: 1,
  },
  productsContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2B3147",
    marginBottom: 16,
    fontFamily: FONTS.semiBold,
  },
  emptyProductsContainer: {
    padding: 32,
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
  productRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  productCard: {
    width: "48%",
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontFamily: FONTS.regular,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 5
  },
  browseAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  browseAllButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
    marginRight: 4,
    fontFamily: FONTS.medium,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    height:"97%"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    height:'97%',
  },
  text: {
    color: "white",
    fontSize: 24,
    zIndex: 1,
    fontFamily: FONTS.bold,
  },
  horizontalDivider: {
    color: COLORS.white,
    marginRight: 20,
  },
  scrollViewStyling: {
    flex: 1,
  },
  readMoreText: {
    fontSize: 14,
    color: "#666",
    fontFamily: FONTS.semiBold,
    color: COLORS.blueColor,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 30,
    maxHeight: "80%",
  },
  fullText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    fontFamily: FONTS.regular,
    textAlign: "justify",
  },
  closeButton: {
    marginTop: 20,
    alignSelf: "flex-end",
  },
  closeText: {
    color: COLORS.blueColor,
    fontFamily: FONTS.semiBold,
  },
});

export default ShopDetailsScreen;
