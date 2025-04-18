import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [userShops, setUserShops] = useState([]);
  const [currentShopId, setCurrentShopId] = useState(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (currentShopId) {
      loadDashboardData();
    }
  }, [currentShopId]);

  const loadShops = async () => {
    try {
      console.log("Loading shops for user:", user.id);

      const { data: shops, error } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(`Found ${shops?.length || 0} shops for user`);

      if (shops && shops.length > 0) {
        setUserShops(shops);
        setCurrentShopId(shops[0].id);
        console.log("Set current shop ID to:", shops[0].id);
      } else {
        console.log("No shops found for user");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error loading shops:", error.message);
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      if (!userShops || userShops.length === 0) {
        console.log("No shops available");
        setIsLoading(false);
        return;
      }

      console.log("Loading dashboard data for all shops");

      // Get all shop IDs
      const shopIds = userShops.map((shop) => shop.id);
      console.log("Shop IDs:", shopIds);

      // Fetch shop stats
      const fetchStats = async () => {
        try {
          // Get all stats from seller_stats table
          const { data: statsData, error: statsError } = await supabase
            .from("seller_stats")
            .select(
              "total_revenue, total_orders, completed_orders, total_products"
            )
            .in("shop_id", shopIds);

          if (statsError) throw statsError;

          if (!statsData || statsData.length === 0) {
            // Fallback to calculating stats manually if no stats found
            console.log("No seller_stats found, calculating manually");
            return await calculateStatsManually();
          }

          // Sum up stats across all shops
          const totalStats = statsData.reduce(
            (acc, stat) => {
              return {
                totalRevenue: acc.totalRevenue + (stat.total_revenue || 0),
                totalOrders: acc.totalOrders + (stat.total_orders || 0),
                pendingOrders: acc.pendingOrders, // Will be calculated separately
                totalProducts: acc.totalProducts + (stat.total_products || 0),
              };
            },
            {
              totalRevenue: 0,
              totalOrders: 0,
              pendingOrders: 0,
              totalProducts: 0,
            }
          );

          // Pending orders - across all shops
          const { count: pendingOrders, error: pendingError } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .in("shop_id", shopIds)
            .in("status", ["pending", "confirmed", "processing"]);

          if (pendingError) throw pendingError;

          return {
            ...totalStats,
            pendingOrders: pendingOrders || 0,
          };
        } catch (error) {
          console.error(
            "Error fetching stats from seller_stats:",
            error.message
          );
          // Fallback to calculating stats manually
          return await calculateStatsManually();
        }
      };

      // Fallback function to calculate stats manually
      const calculateStatsManually = async () => {
        try {
          // Total orders - across all shops
          const { count: totalOrders, error: ordersError } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .in("shop_id", shopIds);

          if (ordersError) throw ordersError;

          // Pending orders - across all shops
          const { count: pendingOrders, error: pendingError } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .in("shop_id", shopIds)
            .in("status", ["pending", "confirmed", "processing"]);

          if (pendingError) throw pendingError;

          // Total revenue - across all shops
          const { data: revenueData, error: revenueError } = await supabase
            .from("orders")
            .select("total_amount")
            .in("shop_id", shopIds)
            .eq("payment_status", "paid");

          if (revenueError) throw revenueError;

          const totalRevenue = revenueData.reduce(
            (sum, order) => sum + (order.total_amount || 0),
            0
          );

          // Total products - across all shops
          const { count: totalProducts, error: productsError } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .in("shop_id", shopIds);

          if (productsError) throw productsError;

          console.log(
            "Aggregated stats across all shops - products:",
            totalProducts,
            "orders:",
            totalOrders
          );

          return {
            totalOrders: totalOrders || 0,
            pendingOrders: pendingOrders || 0,
            totalRevenue: totalRevenue || 0,
            totalProducts: totalProducts || 0,
          };
        } catch (error) {
          console.error("Error calculating stats manually:", error.message);
          return {
            totalOrders: 0,
            pendingOrders: 0,
            totalRevenue: 0,
            totalProducts: 0,
          };
        }
      };

      // Fetch recent orders - from all shops
      const fetchRecentOrders = async () => {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select(
              `
              *,
              shop:shop_id(id, name)
            `
            )
            .in("shop_id", shopIds)
            .order("created_at", { ascending: false })
            .limit(2);

          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error("Error fetching recent orders:", error.message);
          return [];
        }
      };

      // Fetch low stock products - from all shops
      const fetchLowStockProducts = async () => {
        try {
          const { data, error } = await supabase
            .from("products")
            .select(
              `
              *,
              shop:shop_id(name)
            `
            )
            .in("shop_id", shopIds)
            .lt("stock_quantity", 10)
            .order("stock_quantity", { ascending: true })
            .limit(2);

          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error("Error fetching low stock products:", error.message);
          return [];
        }
      };

      // Execute all queries in parallel
      const [statsData, ordersData, productsData] = await Promise.all([
        fetchStats(),
        fetchRecentOrders(),
        fetchLowStockProducts(),
      ]);

      setStats(statsData);
      setRecentOrders(ordersData);
      setLowStockProducts(productsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (amount) => {
    return `N$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOrderStatusColor = (status) => {
    const statusColors = {
      pending: "#FF9800",
      confirmed: "#2196F3",
      processing: "#673AB7",
      shipped: "#3F51B5",
      delivered: "#4CAF50",
      cancelled: "#F44336",
    };
    return statusColors[status] || "#999";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
          />
        }
      >
        <View style={styles.refreshButtonContainer}>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(65, 105, 225, 0.1)" },
                ]}
              >
                <Ionicons name="cart" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stats.totalOrders}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(65, 105, 225, 0.1)" },
                ]}
              >
                <Ionicons name="time" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                <Text style={styles.statLabel}>Pending Orders</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(65, 105, 225, 0.1)" },
                ]}
              >
                <Ionicons name="cash" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>
                  {formatCurrency(stats.totalRevenue)}
                </Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(65, 105, 225, 0.1)" },
                ]}
              >
                <Ionicons name="cube" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="receipt-outline" size={40} color="#ccc" />
              <Text style={styles.emptyStateText}>No orders yet</Text>
            </View>
          ) : (
            <View style={styles.ordersContainer}>
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() =>
                    navigation.navigate("OrdersTab", {
                      screen: "OrderDetails",
                      params: { orderId: order.id },
                    })
                  }
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>
                      #{order.order_number}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getOrderStatusColor(order.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderInfo}>
                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Shop:</Text>
                      <Text style={styles.orderDetailValue}>
                        {order.shop?.name || "Unknown Shop"}
                      </Text>
                    </View>

                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Customer:</Text>
                      <Text style={styles.orderDetailValue}>
                        Customer #{order.buyer_id?.substring(0, 6) || "Unknown"}
                      </Text>
                    </View>

                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Date:</Text>
                      <Text style={styles.orderDetailValue}>
                        {formatDate(order.created_at)}
                      </Text>
                    </View>

                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Amount:</Text>
                      <Text style={styles.orderDetailValue}>
                        {formatCurrency(order.total_amount)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Low Stock Products Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Low Stock Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Products")}>
              <Text style={styles.seeAllButton}>Manage Products</Text>
            </TouchableOpacity>
          </View>

          {lowStockProducts.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="cube-outline" size={40} color="#ccc" />
              <Text style={styles.emptyStateText}>No low stock products</Text>
            </View>
          ) : (
            <View style={styles.productsContainer}>
              {lowStockProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() =>
                    navigation.navigate("EditProduct", {
                      productId: product.id,
                    })
                  }
                >
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(product.price)}
                    </Text>
                  </View>

                  <View style={styles.productShop}>
                    <Text style={styles.shopLabel}>Shop:</Text>
                    <Text style={styles.shopName}>
                      {product.shop?.name || "Unknown Shop"}
                    </Text>
                  </View>

                  <View style={styles.stockInfo}>
                    <Text style={styles.stockLabel}>Stock:</Text>
                    <Text
                      style={[
                        styles.stockValue,
                        product.stock_quantity <= 0
                          ? styles.outOfStock
                          : styles.lowStock,
                      ]}
                    >
                      {product.stock_quantity <= 0
                        ? "Out of Stock"
                        : product.stock_quantity}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (userShops.length === 0) {
                  Alert.alert(
                    "No Shops",
                    "You need to create a shop first before adding products.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Create Shop",
                        onPress: () =>
                          navigation.navigate("ShopsTab", {
                            screen: "CreateShop",
                          }),
                      },
                    ]
                  );
                } else if (userShops.length === 1) {
                  navigation.navigate("ProductsTab", {
                    screen: "AddProduct",
                    params: { shopId: userShops[0].id },
                  });
                } else {
                  navigation.navigate("ShopsTab");
                }
              }}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
              onPress={() => navigation.navigate("OrdersTab")}
            >
              <Ionicons name="list" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Process Orders</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.accent }]}
              onPress={() => {
                if (userShops.length === 0) {
                  Alert.alert("No Shops", "You need to create a shop first");
                } else if (userShops.length === 1) {
                  navigation.navigate("ShopsTab", {
                    screen: "ShopDetails",
                    params: { shopId: userShops[0].id },
                  });
                } else {
                  navigation.navigate("ShopsTab");
                }
              }}
            >
              <Ionicons name="settings" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Store Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
              onPress={() => {
                // TODO: Implement analytics screen navigation
                navigation.navigate("Analytics");
              }}
            >
              <Ionicons name="bar-chart" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>View Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
  },
  refreshButtonContainer: {
    alignItems: "flex-end",
    paddingTop: 15,
    paddingRight: 15,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    ...SHADOWS.small,
  },
  statsContainer: {
    padding: 15,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    ...SHADOWS.small,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 5,
    fontFamily: FONTS.bold,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  seeAllButton: {
    fontSize: 14,
    color: COLORS.accent,
    fontFamily: FONTS.medium,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    padding: 30,
    margin: 15,
    borderRadius: 15,
    ...SHADOWS.small,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  ordersContainer: {
    paddingHorizontal: 15,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  orderInfo: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  orderDetail: {
    flexDirection: "row",
    marginBottom: 5,
  },
  orderDetailLabel: {
    width: 80,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  orderDetailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
    fontFamily: FONTS.medium,
  },
  productsContainer: {
    paddingHorizontal: 15,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.primary,
    flex: 1,
    fontFamily: FONTS.medium,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 5,
    fontFamily: FONTS.regular,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: FONTS.medium,
  },
  lowStock: {
    color: COLORS.warning,
  },
  outOfStock: {
    color: COLORS.error,
  },
  actionsContainer: {
    padding: 15,
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 15,
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.small,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    marginLeft: 10,
    fontFamily: FONTS.semiBold
  },
  productShop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  shopLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 5,
    fontFamily: FONTS.regular
  },
  shopName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
});

export default DashboardScreen;
