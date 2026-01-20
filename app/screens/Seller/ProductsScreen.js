import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

const ProductsScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  // Extract shopId from route params if available
  const shopId = route.params?.shopId;
  const fromShop = route.params?.fromShop;
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, in-stock, out-of-stock, on-order
  const [currentShopId, setCurrentShopId] = useState(shopId || null);
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    onOrder: 0,
  });

  // Add this effect to reset when going back
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      // Reset the shop filter when leaving the screen
      if (fromShop) {
        navigation.setParams({ shopId: null, fromShop: false });
      }
    });

    return unsubscribe;
  }, [navigation, fromShop]);

  useEffect(() => {
    loadProducts();
  }, [shopId]);

  useEffect(() => {
    filterProducts();
    calculateStats();
  }, [searchQuery, products, filter]);

  const calculateStats = () => {
    const newStats = {
      total: products.length,
      inStock: products.filter(
        (product) => product.stock_quantity > 0 && !product.is_on_order
      ).length,
      outOfStock: products.filter(
        (product) => product.stock_quantity <= 0 && !product.is_on_order
      ).length,
      onOrder: products.filter((product) => product.is_on_order).length,
    };
    setStats(newStats);
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      console.log("Loading products for user:", user.id);

      let shopIds = [];

      // If shopId is provided in route params, only load products for that shop
      if (shopId) {
        console.log("Filtering products by shop ID:", shopId);
        shopIds = [shopId];
        setCurrentShopId(shopId);
      } else {
        // Otherwise, load products from all user's shops
        console.log("Loading products from all user shops");

        // Fetch all user shops
        const { data: shops, error: shopsError } = await supabase
          .from("shops")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (shopsError) {
          console.error("Error fetching shops:", shopsError.message);
          throw shopsError;
        }

        console.log("Shops found:", shops ? shops.length : 0);

        if (!shops || shops.length === 0) {
          console.log("No shops found for user");
          setProducts([]);
          setCurrentShopId(null);
          Alert.alert(
            "No Shops Found",
            "Please create a shop first before adding products."
          );
          return;
        }

        // Get all shop IDs
        shopIds = shops.map((shop) => shop.id);

        // Store first shop ID for add product functionality
        setCurrentShopId(shops[0].id);
      }

      if (shopIds.length === 0) {
        setProducts([]);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      console.log("Fetching products for shop IDs:", shopIds);

      // Get products from shops with shop information
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          shop:shop_id(id, name)
        `
        )
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error.message);
        throw error;
      }

      console.log("Products found:", data ? data.length : 0);
      if (data && data.length > 0) {
        console.log("First product sample:", JSON.stringify(data[0]));
      }

      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error.message);
      Alert.alert("Error", `Failed to load products: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let results = [...products];

    // Apply search filter
    if (searchQuery) {
      results = results.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (product.category &&
            product.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category/stock filter
    if (filter !== "all") {
      if (filter === "in-stock") {
        results = results.filter(
          (product) => product.stock_quantity > 0 && !product.is_on_order
        );
      } else if (filter === "out-of-stock") {
        results = results.filter(
          (product) => product.stock_quantity <= 0 && !product.is_on_order
        );
      } else if (filter === "on-order") {
        results = results.filter((product) => product.is_on_order);
      }
    }

    setFilteredProducts(results);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${productName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", productId);

              if (error) throw error;

              // Update the products list
              setProducts(
                products.filter((product) => product.id !== productId)
              );
              Alert.alert("Success", "Product deleted successfully");
            } catch (error) {
              console.error("Error deleting product:", error.message);
              Alert.alert("Error", "Failed to delete product");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "N$0.00";
    }
    return (
      "N$" +
      parseFloat(amount)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")
    );
  };

  const getStockStatusColor = (product) => {
    if (product.is_on_order) return "#FF9800"; // Orange for on order
    if (product.stock_quantity <= 0) return "#F44336"; // Red for out of stock
    if (product.stock_quantity < 5) return "#FF9800"; // Orange for low stock
    return "#4CAF50"; // Green for in stock
  };

  const getStockStatusText = (product) => {
    if (product.is_on_order) return "On Order";
    if (product.stock_quantity <= 0) return "Out of Stock";
    if (product.stock_quantity < 5)
      return `Low Stock (${product.stock_quantity})`;
    return `In Stock (${product.stock_quantity})`;
  };

  const getStockStatusIcon = (product) => {
    if (product.is_on_order) {
      return <MaterialIcons name="schedule" size={16} color="#FF9800" />;
    }
    if (product.stock_quantity <= 0) {
      return <MaterialIcons name="highlight-off" size={16} color="#F44336" />;
    }
    if (product.stock_quantity < 5) {
      return <MaterialIcons name="warning" size={16} color="#FF9800" />;
    }
    return <MaterialIcons name="check-circle" size={16} color="#4CAF50" />;
  };

  if (!fontsLoaded) {
    return null;
  }

  const renderProductItem = ({ item }) => (
    <View style={[styles.modernProductCard, { backgroundColor: colors.card }]}>
      <View style={styles.modernProductHeader}>
        <View style={styles.modernProductImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.modernProductImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialIcons
                name="image-not-supported"
                size={30}
                color="#BBBBBB"
              />
            </View>
          )}
        </View>
        <View style={styles.modernProductInfo}>
          <Text
            style={[styles.modernProductName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={styles.modernProductPrice}>
            {formatCurrency(item.price)}
          </Text>
          <View style={styles.modernProductDetailRow}>
            <MaterialIcons
              name="store"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.modernProductDetailValue}>
              {item.shop?.name || "Unknown Shop"}
            </Text>
          </View>
          <View style={styles.modernProductDetailRow}>
            <MaterialIcons
              name="category"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.modernProductDetailValue}>
              {item.category || "Uncategorized"}
            </Text>
          </View>
          <View style={styles.modernStatusBadge}>
            {getStockStatusIcon(item)}
            <Text
              style={[
                styles.modernStatusText,
                { color: getStockStatusColor(item) },
              ]}
            >
              {getStockStatusText(item)}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.modernProductActions,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.modernEditButton, { borderRightColor: colors.border }]}
          onPress={() =>
            navigation.navigate("EditProduct", { productId: item.id })
          }
        >
          <Ionicons name="create-outline" size={18} color={COLORS.accent} />
          <Text style={styles.modernEditText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modernDeleteButton}
          onPress={() => handleDeleteProduct(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.modernDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {fromShop && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.headerTitle,
            fromShop && { marginLeft: 16 },
            { color: colors.text },
          ]}
        >
          {fromShop ? `Shop Products` : "Products"}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (currentShopId) {
              // If coming from shop details, don't show shop selection
              if (fromShop) {
                navigation.navigate("AddProduct", { shopId: currentShopId });
              } else {
                // Show shop selection dialog if multiple shops
                if (
                  products.length > 0 &&
                  new Set(products.map((p) => p.shop_id)).size > 1
                ) {
                  Alert.alert(
                    "Select Shop",
                    "Which shop would you like to add a product to?",
                    [
                      ...new Set(
                        products.map((p) => ({
                          id: p.shop_id,
                          name: p.shop?.name || "Unknown Shop",
                        }))
                      ),
                    ]
                      .map((shop) => ({
                        text: shop.name,
                        onPress: () =>
                          navigation.navigate("AddProduct", {
                            shopId: shop.id,
                          }),
                      }))
                      .concat([{ text: "Cancel", style: "cancel" }])
                  );
                } else {
                  navigation.navigate("AddProduct", { shopId: currentShopId });
                }
              }
            } else {
              Alert.alert(
                "No Shop Selected",
                "Please create a shop first to add products."
              );
            }
          }}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.addButtonGradient}
          >
            <MaterialIcons name="add" size={24} color={colors.text} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchWrapper,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput]}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons
                name="close-circle"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Product Stats */}
      <View
        style={[
          styles.statsContainer,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            borderTopColor: colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollView}
        >
          <View
            style={[
              styles.statCard,
              filter === "all" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => setFilter("all")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(33, 150, 243, 0.1)" },
                ]}
              >
                <MaterialIcons name="inventory" size={18} color="#2196F3" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.total}
                </Text>
                <Text style={styles.statLabel}>All</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              filter === "in-stock" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => setFilter("in-stock")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(76, 175, 80, 0.1)" },
                ]}
              >
                <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.inStock}
                </Text>
                <Text style={styles.statLabel}>In Stock</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              filter === "out-of-stock" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => setFilter("out-of-stock")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(244, 67, 54, 0.1)" },
                ]}
              >
                <MaterialIcons name="highlight-off" size={18} color="#F44336" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.outOfStock}
                </Text>
                <Text style={styles.statLabel}>Out of Stock</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              filter === "on-order" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => setFilter("on-order")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(255, 152, 0, 0.1)" },
                ]}
              >
                <MaterialIcons name="schedule" size={18} color="#FF9800" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.onOrder}
                </Text>
                <Text style={styles.statLabel}>On Order</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={["rgba(33, 150, 243, 0.2)", "rgba(33, 150, 243, 0.1)"]}
            style={styles.emptyIconContainer}
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={60}
              color="#2196F3"
            />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Products Found
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || filter !== "all"
              ? "No products match your search or filter"
              : "No products added yet"}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              if (currentShopId) {
                navigation.navigate("AddProduct", { shopId: currentShopId });
              } else {
                Alert.alert(
                  "No Shop Selected",
                  "Please select a shop first to add products."
                );
              }
            }}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.emptyButtonGradient}
            >
              <MaterialIcons
                name="add"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.emptyButtonText}>Add Your First Product</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  addButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  searchWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  statsContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  statsScrollView: {
    paddingHorizontal: 15,
  },
  statCard: {
    marginRight: 12,
    padding: 2,
    borderRadius: 12,
  },
  selectedStatCard: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statInfo: {
    justifyContent: "center",
  },
  statCount: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
    lineHeight: 22,
    fontFamily: FONTS.regular,
  },
  emptyButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FONTS.medium,
    // fontWeight: "600",
  },
  productsList: {
    padding: 15,
  },
  modernProductCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginBottom: 18,
    padding: 0,
    ...SHADOWS.medium,
    overflow: "hidden",
  },
  modernProductHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  modernProductImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
    backgroundColor: "#F5F5F5",
    ...SHADOWS.small,
  },
  modernProductImage: {
    width: "100%",
    height: "100%",
  },
  modernProductInfo: {
    flex: 1,
  },
  modernProductName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modernProductPrice: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    marginBottom: 8,
  },
  modernProductDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  modernProductDetailValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    marginLeft: 6,
  },
  modernStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFF7E6",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  modernStatusText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
  modernProductActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceMedium,
    backgroundColor: COLORS.white,
  },
  modernEditButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.surfaceMedium,
  },
  modernEditText: {
    fontSize: 15,
    color: COLORS.accent,
    fontFamily: FONTS.medium,
    marginLeft: 6,
  },
  modernDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  modernDeleteText: {
    fontSize: 15,
    color: COLORS.error,
    fontFamily: FONTS.medium,
    marginLeft: 6,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 10,
  },
});

export default ProductsScreen;
