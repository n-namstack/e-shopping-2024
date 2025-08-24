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
  Dimensions,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

const { width } = Dimensions.get("window");

const safeNumber = (value, decimals = 1) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num.toFixed(decimals);
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    completedOrders: 0,
    canceledOrders: 0,
    processingOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    averageRating: 0,
    topProduct: null,
    topCategory: null,
    monthlyGrowthRate: 0,
    followersCount: 0,
    shopRating: 0,
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

      // Fetch seller stats
      const { data: statsData, error: statsError } = await supabase
        .from("seller_stats")
        .select(
          `
          *,
          shop:shop_id (
            name,
            followers_count,
            verification_status
          )
        `
        )
        .in("shop_id", shopIds);

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        // Sum up stats across all shops
        const totalStats = statsData.reduce(
          (acc, stat) => ({
            totalOrders: acc.totalOrders + (stat.total_orders || 0),
            pendingOrders: acc.pendingOrders + (stat.pending_orders || 0),
            totalRevenue:
              acc.totalRevenue + parseFloat(stat.total_revenue || 0),
            totalProducts: acc.totalProducts + (stat.total_products || 0),
            completedOrders: acc.completedOrders + (stat.completed_orders || 0),
            canceledOrders: acc.canceledOrders + (stat.canceled_orders || 0),
            processingOrders:
              acc.processingOrders + (stat.processing_orders || 0),
            totalCustomers: acc.totalCustomers + (stat.total_customers || 0),
            // Calculate weighted average for rating
            totalRating:
              acc.totalRating +
              parseFloat(stat.average_rating || 0) * (stat.total_orders || 1),
            totalOrdersForRating:
              acc.totalOrdersForRating + (stat.total_orders || 1),
            // Sum up followers directly from seller_stats
            followersCount: acc.followersCount + (stat.followers_count || 0),
            // Calculate weighted average order value
            totalOrderValue:
              acc.totalOrderValue + parseFloat(stat.total_revenue || 0),
            // Track monthly growth as weighted average
            monthlyGrowth:
              acc.monthlyGrowth +
              parseFloat(stat.monthly_growth_rate || 0) *
                (stat.total_orders || 1),
          }),
          {
            totalOrders: 0,
            pendingOrders: 0,
            totalRevenue: 0,
            totalProducts: 0,
            completedOrders: 0,
            canceledOrders: 0,
            processingOrders: 0,
            totalCustomers: 0,
            totalRating: 0,
            totalOrdersForRating: 0,
            followersCount: 0,
            totalOrderValue: 0,
            monthlyGrowth: 0,
          }
        );

        // Calculate final averages
        const averageRating =
          totalStats.totalOrdersForRating > 0
            ? totalStats.totalRating / totalStats.totalOrdersForRating
            : 0;

        const averageOrderValue =
          totalStats.totalOrders > 0
            ? totalStats.totalOrderValue / totalStats.totalOrders
            : 0;

        const monthlyGrowthRate =
          totalStats.totalOrdersForRating > 0
            ? totalStats.monthlyGrowth / totalStats.totalOrdersForRating
            : 0;

        setStats({
          totalOrders: totalStats.totalOrders,
          pendingOrders: totalStats.pendingOrders,
          totalRevenue: totalStats.totalRevenue,
          totalProducts: totalStats.totalProducts,
          completedOrders: totalStats.completedOrders,
          canceledOrders: totalStats.canceledOrders,
          processingOrders: totalStats.processingOrders,
          averageOrderValue: averageOrderValue,
          totalCustomers: totalStats.totalCustomers,
          averageRating: averageRating,
          followersCount: totalStats.followersCount,
          monthlyGrowthRate: monthlyGrowthRate,
          topProduct: statsData[0]?.top_product_name || null,
          topCategory: statsData[0]?.top_category || null,
        });
      }

      // Fetch recent orders with shop details
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          shop:shop_id (
            name,
            logo_url
          ),
          order_items (
            product_id,
            quantity,
            price
          )
        `
        )
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false })
        .limit(2);

      if (ordersError) throw ordersError;
      setRecentOrders(ordersData || []);

      // Fetch low stock products with shop details
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(
          `
          *,
          shop:shop_id (
            name,
            logo_url
          )
        `
        )
        .in("shop_id", shopIds)
        .lt("stock_quantity", 10)
        .order("stock_quantity", { ascending: true })
        .limit(2);

      if (productsError) throw productsError;
      setLowStockProducts(productsData || []);
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextSection}>
              <Text style={styles.greetingText}>
                Hello,{" "}
                {user?.user_metadata?.full_name?.split(" ")[0] || "Seller"} 👋
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modernRefreshButton}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue Highlight Card */}
        <View style={styles.revenueHighlight}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.revenueGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.revenueContent}>
              <View style={styles.revenueHeader}>
                <View>
                  <Text style={styles.revenueTitle}>Total Revenue</Text>
                  <Text style={styles.revenueAmount}>
                    {formatCurrency(stats.totalRevenue || 0)}
                  </Text>
                </View>
                <View style={styles.revenueIcon}>
                  <Ionicons
                    name="trending-up"
                    size={24}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
              </View>

              <View style={styles.revenueStats}>
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatValue}>
                    {stats.totalOrders || 0}
                  </Text>
                  <Text style={styles.revenueStatLabel}>Orders</Text>
                </View>
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatValue}>
                    {formatCurrency(stats.averageOrderValue || 0)}
                  </Text>
                  <Text style={styles.revenueStatLabel}>Avg. Order</Text>
                </View>
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatValue}>
                    {safeNumber(stats.averageRating)}
                  </Text>
                  <Text style={styles.revenueStatLabel}>Rating</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Modern Stats Grid */}
        <View style={styles.modernStatsContainer}>
          <Text style={styles.statsTitle}>Business Overview</Text>

          <View style={styles.modernStatsGrid}>
            <View style={styles.statCardMini}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#FEF3C7" },
                ]}
              >
                <Ionicons name="basket" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValueMini}>
                {stats.pendingOrders || 0}
              </Text>
              <Text style={styles.statLabelMini}>Pending</Text>
            </View>

            <View style={styles.statCardMini}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#D1FAE5" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <Text style={styles.statValueMini}>
                {stats.completedOrders || 0}
              </Text>
              <Text style={styles.statLabelMini}>Completed</Text>
            </View>

            <View style={styles.statCardMini}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#DBEAFE" },
                ]}
              >
                <Ionicons name="cube" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statValueMini}>
                {stats.totalProducts || 0}
              </Text>
              <Text style={styles.statLabelMini}>Products</Text>
            </View>

            <View style={styles.statCardMini}>
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "#F3E8FF" },
                ]}
              >
                <Ionicons name="people" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.statValueMini}>
                {stats.totalCustomers || 0}
              </Text>
              <Text style={styles.statLabelMini}>Customers</Text>
            </View>
          </View>
        </View>

        {/* Modern Quick Actions */}
        <View style={styles.modernActionsContainer}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          <View style={styles.modernActionsGrid}>
            <TouchableOpacity
              style={[styles.modernActionCard, { backgroundColor: "#EFF6FF" }]}
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
              <View
                style={[
                  styles.modernActionIcon,
                  { backgroundColor: "#3B82F6" },
                ]}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.modernActionTitle}>Add Product</Text>
              <Text style={styles.modernActionSubtitle}>Create new items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modernActionCard, { backgroundColor: "#FEF3C7" }]}
              onPress={() => navigation.navigate("OrdersTab")}
            >
              <View
                style={[
                  styles.modernActionIcon,
                  { backgroundColor: "#F59E0B" },
                ]}
              >
                <Ionicons name="clipboard" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.modernActionTitle}>Orders</Text>
              <Text style={styles.modernActionSubtitle}>Manage orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modernActionCard, { backgroundColor: "#D1FAE5" }]}
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
              <View
                style={[
                  styles.modernActionIcon,
                  { backgroundColor: "#10B981" },
                ]}
              >
                <Ionicons name="storefront" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.modernActionTitle}>My Store</Text>
              <Text style={styles.modernActionSubtitle}>Store settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modernActionCard, { backgroundColor: "#F3E8FF" }]}
              onPress={() => navigation.navigate("Analytics")}
            >
              <View
                style={[
                  styles.modernActionIcon,
                  { backgroundColor: "#8B5CF6" },
                ]}
              >
                <Ionicons name="bar-chart" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.modernActionTitle}>Analytics</Text>
              <Text style={styles.modernActionSubtitle}>View insights</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Recent Orders Section */}
        <View style={styles.modernSectionContainer}>
          <View style={styles.modernSectionHeader}>
            <Text style={styles.modernSectionTitle}>Recent Orders</Text>
            <TouchableOpacity
              style={styles.modernSeeAllButton}
              onPress={() => navigation.navigate("Orders")}
            >
              <Text style={styles.modernSeeAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.modernEmptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.modernEmptyText}>No recent orders</Text>
              <Text style={styles.modernEmptySubtext}>
                New orders will appear here
              </Text>
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
                    <View style={styles.orderNumberContainer}>
                      <MaterialCommunityIcons
                        name="shopping"
                        size={18}
                        color={COLORS.accent}
                      />
                      <Text style={styles.orderNumber}>
                        #{order.order_number}
                      </Text>
                    </View>
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
          <View style={styles.lowProductHeader}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Low Stock Products</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllButtonContainer}
              onPress={() => navigation.navigate("ProductsTab")}
            >
              <Text style={styles.seeAllButton}>Manage Products</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {lowStockProducts.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Ionicons name="cube-outline" size={50} color="#e0e0e0" />
              <Text style={styles.emptyStateText}>No low stock products</Text>
              <Text style={styles.emptyStateSubText}>
                Products with low inventory will appear here
              </Text>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
  },
  // Modern Header Styles
  modernHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#6B7280",
  },
  modernRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  // Revenue Highlight Styles
  revenueHighlight: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  revenueGradient: {
    borderRadius: 20,
  },
  revenueContent: {
    padding: 24,
  },
  revenueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  revenueTitle: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  revenueStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  revenueStat: {
    alignItems: "center",
  },
  revenueStatValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  revenueStatLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.8)",
  },
  // Modern Stats Grid
  modernStatsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 16,
  },
  modernStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCardMini: {
    width: (width - 56) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    ...SHADOWS.small,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValueMini: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabelMini: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: "#6B7280",
    textAlign: "center",
  },
  // Modern Actions Styles
  modernActionsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 16,
  },
  modernActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  modernActionCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    ...SHADOWS.small,
  },
  modernActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modernActionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 4,
    textAlign: "center",
  },
  modernActionSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  // Modern Section Styles
  modernSectionContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  modernSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
  },
  modernSectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  modernSeeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  modernSeeAllText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginRight: 4,
  },
  modernEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 32,
    ...SHADOWS.small,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modernEmptyText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 8,
  },
  modernEmptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.shadow,
    ...SHADOWS.small,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderNumber: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  statusText: {
    color: "#EFF6FF",
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: "capitalize",
  },
  orderInfo: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
  },
  orderDetail: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  orderDetailLabel: {
    width: 100,
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  orderDetailValue: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: FONTS.medium,
    flex: 1,
  },
  productsContainer: {
    paddingHorizontal: 20,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    ...SHADOWS.small,
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  productName: {
    fontSize: 16,
    color: COLORS.primary,
    flex: 1,
    fontFamily: FONTS.semiBold,
  },
  productPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  productShop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  shopLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 8,
    fontFamily: FONTS.medium,
  },
  shopName: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 8,
    fontFamily: FONTS.medium,
  },
  stockValue: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  lowStock: {
    color: "#F59E0B",
  },
  outOfStock: {
    color: "#EF4444",
  },
  lowProductHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: FONTS.semiBold,
    color: COLORS.textDark,
  },
  seeAllButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  seeAllButton: {
    color: COLORS.white,
    fontSize: 14,
    marginRight: 6,
    fontFamily: FONTS.regular,
  },

  emptyStateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textDark,
  },
  emptyStateSubText: {
    marginTop: 6,
    fontSize: 14,
    color: "#7d7d7d",
    textAlign: "center",
    fontFamily: FONTS.regular,
  },
});

export default DashboardScreen;
