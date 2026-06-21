import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";

const { width } = Dimensions.get("window");

const safeNumber = (value, decimals = 1) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num.toFixed(decimals);
};

const ORDER_STATUS = {
  pending:    { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "time-outline",             label: "Pending" },
  confirmed:  { color: "#6366F1", bg: "rgba(99,102,241,0.12)",  icon: "checkmark-circle-outline", label: "Confirmed" },
  processing: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: "sync-outline",             label: "Processing" },
  shipped:    { color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",  icon: "car-outline",              label: "Shipped" },
  delivered:  { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   icon: "checkmark-circle-outline", label: "Delivered" },
  cancelled:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "close-circle-outline",     label: "Cancelled" },
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors }                  = useTheme();
  const [stats, setStats] = useState({
    totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalProducts: 0,
    completedOrders: 0, canceledOrders: 0, processingOrders: 0,
    averageOrderValue: 0, totalCustomers: 0, averageRating: 0,
    topProduct: null, topCategory: null, monthlyGrowthRate: 0,
    followersCount: 0, shopRating: 0,
  });
  const [recentOrders, setRecentOrders]         = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [userShops, setUserShops]               = useState([]);
  const [currentShopId, setCurrentShopId]       = useState(null);
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_700Bold, Jost_500Medium, Jost_600SemiBold });

  useEffect(() => { loadShops(); }, []);
  useEffect(() => { if (currentShopId) loadDashboardData(); }, [currentShopId]);

  const loadShops = async () => {
    try {
      const { data: shops, error } = await supabase
        .from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      if (shops && shops.length > 0) {
        setUserShops(shops);
        setCurrentShopId(shops[0].id);
      } else {
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
      if (!userShops || userShops.length === 0) { setIsLoading(false); return; }
      const shopIds = userShops.map((s) => s.id);

      const { data: statsData, error: statsError } = await supabase
        .from("seller_stats")
        .select(`*, shop:shop_id (name, followers_count, verification_status)`)
        .in("shop_id", shopIds);
      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        const t = statsData.reduce(
          (acc, stat) => ({
            totalOrders:          acc.totalOrders          + (stat.total_orders || 0),
            pendingOrders:        acc.pendingOrders        + (stat.pending_orders || 0),
            totalRevenue:         acc.totalRevenue         + parseFloat(stat.total_revenue || 0),
            totalProducts:        acc.totalProducts        + (stat.total_products || 0),
            completedOrders:      acc.completedOrders      + (stat.completed_orders || 0),
            canceledOrders:       acc.canceledOrders       + (stat.canceled_orders || 0),
            processingOrders:     acc.processingOrders     + (stat.processing_orders || 0),
            totalCustomers:       acc.totalCustomers       + (stat.total_customers || 0),
            totalRating:          acc.totalRating          + parseFloat(stat.average_rating || 0) * (stat.total_orders || 1),
            totalOrdersForRating: acc.totalOrdersForRating + (stat.total_orders || 1),
            followersCount:       acc.followersCount       + (stat.followers_count || 0),
            totalOrderValue:      acc.totalOrderValue      + parseFloat(stat.total_revenue || 0),
            monthlyGrowth:        acc.monthlyGrowth        + parseFloat(stat.monthly_growth_rate || 0) * (stat.total_orders || 1),
          }),
          { totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalProducts: 0, completedOrders: 0, canceledOrders: 0, processingOrders: 0, totalCustomers: 0, totalRating: 0, totalOrdersForRating: 0, followersCount: 0, totalOrderValue: 0, monthlyGrowth: 0 }
        );
        setStats({
          totalOrders:       t.totalOrders,
          pendingOrders:     t.pendingOrders,
          totalRevenue:      t.totalRevenue,
          totalProducts:     t.totalProducts,
          completedOrders:   t.completedOrders,
          canceledOrders:    t.canceledOrders,
          processingOrders:  t.processingOrders,
          averageOrderValue: t.totalOrders > 0 ? t.totalOrderValue / t.totalOrders : 0,
          totalCustomers:    t.totalCustomers,
          averageRating:     t.totalOrdersForRating > 0 ? t.totalRating / t.totalOrdersForRating : 0,
          followersCount:    t.followersCount,
          monthlyGrowthRate: t.totalOrdersForRating > 0 ? t.monthlyGrowth / t.totalOrdersForRating : 0,
          topProduct:        statsData[0]?.top_product_name || null,
          topCategory:       statsData[0]?.top_category || null,
        });
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`*, shop:shop_id (name, logo_url), order_items (product_id, quantity, price)`)
        .in("shop_id", shopIds).order("created_at", { ascending: false }).limit(2);
      if (ordersError) throw ordersError;
      setRecentOrders(ordersData || []);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`*, shop:shop_id (name, logo_url)`)
        .in("shop_id", shopIds).lt("stock_quantity", 10).order("stock_quantity", { ascending: true }).limit(2);
      if (productsError) throw productsError;
      setLowStockProducts(productsData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };
  const formatCurrency = (amount) =>
    `N$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  if (isLoading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
  if (!fontsLoaded) return null;

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Seller";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── GRADIENT HERO HEADER ── */}
      <LinearGradient
        colors={["#312E81", "#4338CA", "#6366F1"]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={styles.header}
      >
        <View style={[styles.blob, styles.blobTL]} />
        <View style={[styles.blob, styles.blobBR]} />

        <SafeAreaView>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
              <Text style={styles.dateText}>{today}</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Frosted revenue card */}
          <View style={styles.revCard}>
            <View style={styles.revTopRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.revLabel}>Total Revenue</Text>
                <Text style={styles.revAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatCurrency(stats.totalRevenue || 0)}
                </Text>
              </View>
              <View style={styles.revIconBox}>
                <Ionicons name="trending-up" size={22} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
            <View style={styles.revLine} />
            <View style={styles.revStatsRow}>
              {[
                { label: "Orders",    value: String(stats.totalOrders || 0) },
                { label: "Avg Order", value: formatCurrency(stats.averageOrderValue || 0) },
                { label: "Rating",    value: safeNumber(stats.averageRating) },
              ].map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  <View style={styles.revStat}>
                    <Text style={styles.revStatVal}>{item.value}</Text>
                    <Text style={styles.revStatLabel}>{item.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.revSep} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── SCROLLABLE BODY ── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} tintColor="#6366F1" />
        }
      >
        {/* Business Overview */}
        <Text style={[styles.secTitle, { color: colors.text }]}>Business Overview</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: "basket",           iconColor: "#F59E0B", bg: "#FEF3C7", value: stats.pendingOrders,   label: "Pending" },
            { icon: "checkmark-circle", iconColor: "#10B981", bg: "#D1FAE5", value: stats.completedOrders, label: "Completed" },
            { icon: "cube",             iconColor: "#3B82F6", bg: "#DBEAFE", value: stats.totalProducts,   label: "Products" },
            { icon: "people",           iconColor: "#8B5CF6", bg: "#F3E8FF", value: stats.totalCustomers,  label: "Customers" },
          ].map((item) => (
            <View key={item.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{item.value || 0}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.secTitle, { color: colors.text, marginTop: 24 }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#EFF6FF" }]}
            onPress={() => {
              if (userShops.length === 0) {
                Alert.alert("No Shops", "You need to create a shop first before adding products.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Create Shop", onPress: () => navigation.navigate("ShopsTab", { screen: "CreateShop" }) },
                ]);
              } else if (userShops.length === 1) {
                navigation.navigate("ProductsTab", { screen: "AddProduct", params: { shopId: userShops[0].id } });
              } else {
                navigation.navigate("ShopsTab");
              }
            }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#3B82F6" }]}>
              <Ionicons name="add" size={22} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Add Product</Text>
            <Text style={styles.actionSub}>Create new items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#FEF3C7" }]}
            onPress={() => navigation.navigate("OrdersTab")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#F59E0B" }]}>
              <Ionicons name="clipboard" size={22} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Orders</Text>
            <Text style={styles.actionSub}>Manage orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#D1FAE5" }]}
            onPress={() => {
              if (userShops.length === 0) {
                Alert.alert("No Shops", "You need to create a shop first");
              } else if (userShops.length === 1) {
                navigation.navigate("ShopsTab", { screen: "ShopDetails", params: { shopId: userShops[0].id } });
              } else {
                navigation.navigate("ShopsTab");
              }
            }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#10B981" }]}>
              <Ionicons name="storefront" size={22} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>My Store</Text>
            <Text style={styles.actionSub}>Store settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#F3E8FF" }]}
            onPress={() => navigation.navigate("Analytics")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#8B5CF6" }]}>
              <Ionicons name="bar-chart" size={22} color="#fff" />
            </View>
            <Text style={styles.actionTitle}>Analytics</Text>
            <Text style={styles.actionSub}>View insights</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        <View style={[styles.secRow, { marginTop: 24 }]}>
          <Text style={[styles.secTitle, { color: colors.text, marginBottom: 0 }]}>Recent Orders</Text>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate("OrdersTab")}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color="#6366F1" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14 }}>
          {recentOrders.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={28} color="#9CA3AF" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No recent orders</Text>
              <Text style={styles.emptySub}>New orders will appear here</Text>
            </View>
          ) : recentOrders.map((order) => {
            const s = ORDER_STATUS[order.status] || { color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: "help-circle-outline", label: order.status };
            return (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, { backgroundColor: colors.card, borderLeftColor: s.color }]}
                onPress={() => navigation.navigate("OrdersTab", { screen: "OrderDetails", params: { orderId: order.id } })}
              >
                <View style={styles.orderTop}>
                  <View style={styles.orderIdRow}>
                    <View style={styles.orderIconBox}>
                      <Ionicons name="receipt-outline" size={15} color="#6366F1" />
                    </View>
                    <Text style={[styles.orderId, { color: colors.text }]}>#{order.id.substring(0, 8).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon} size={11} color={s.color} />
                    <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>

                <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />

                <View style={styles.orderMeta}>
                  {[
                    ["Shop",     order.shop?.name || "Unknown Shop"],
                    ["Customer", `Customer #${order.buyer_id?.substring(0, 6) || "—"}`],
                    ["Date",     formatDate(order.created_at)],
                    ["Amount",   formatCurrency(order.total_amount)],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{label}</Text>
                      <Text style={[
                        styles.metaValue,
                        { color: label === "Amount" ? "#6366F1" : colors.text },
                        label === "Amount" && { fontFamily: FONTS.bold },
                      ]}>
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Low Stock */}
        <View style={[styles.secRow, { marginTop: 24 }]}>
          <Text style={[styles.secTitle, { color: colors.text, marginBottom: 0 }]}>Low Stock</Text>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: "#6366F1" }]}
            onPress={() => navigation.navigate("ProductsTab")}
          >
            <Text style={[styles.viewAllText, { color: "#fff" }]}>Manage</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14, marginBottom: 8 }}>
          {lowStockProducts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All products well-stocked</Text>
              <Text style={styles.emptySub}>Low stock items will appear here</Text>
            </View>
          ) : lowStockProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.stockCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate("EditProduct", { productId: product.id })}
            >
              <View style={[styles.stockIconBox, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
                <Ionicons name="cube-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.stockInfo}>
                <Text style={[styles.stockName, { color: colors.text }]} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.stockShop}>{product.shop?.name || "Unknown Shop"}</Text>
              </View>
              <View style={styles.stockRight}>
                <Text style={styles.stockPrice}>{formatCurrency(product.price)}</Text>
                <View style={[styles.stockBadge, {
                  backgroundColor: product.stock_quantity <= 0 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                }]}>
                  <Text style={[styles.stockBadgeText, {
                    color: product.stock_quantity <= 0 ? "#EF4444" : "#F59E0B",
                  }]}>
                    {product.stock_quantity <= 0 ? "Out of stock" : `${product.stock_quantity} left`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#F5F7FF" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FF" },

  // Header
  header: { paddingBottom: 28 },
  blob:   { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  blobTL: { width: 200, height: 200, top: -70, left: -60 },
  blobBR: { width: 250, height: 250, bottom: -70, right: -70 },

  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 22, paddingTop: Platform.OS === "android" ? 16 : 8, marginBottom: 20,
  },
  greeting:   { fontSize: 22, fontFamily: FONTS.bold,    color: "#fff", marginBottom: 3 },
  dateText:   { fontSize: 13, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.75)" },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },

  // Revenue frosted card
  revCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  revTopRow:    { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  revLabel:     { fontSize: 14, fontFamily: FONTS.medium, color: "rgba(255,255,255,0.85)", marginBottom: 4 },
  revAmount:    { fontSize: 32, fontFamily: FONTS.bold,   color: "#fff" },
  revIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  revLine:      { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 16 },
  revStatsRow:  { flexDirection: "row", alignItems: "center" },
  revStat:      { flex: 1, alignItems: "center" },
  revStatVal:   { fontSize: 14, fontFamily: FONTS.bold,    color: "#fff", marginBottom: 2, textAlign: "center" },
  revStatLabel: { fontSize: 11, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.75)", textAlign: "center" },
  revSep:       { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)" },

  // Body
  body:        { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 36 },

  // Section helpers
  secTitle: { fontSize: 17, fontFamily: FONTS.semiBold, marginBottom: 14 },
  secRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  viewAllText: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#6366F1" },

  // Stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16, padding: 18, alignItems: "center",
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statValue:   { fontSize: 26, fontFamily: FONTS.bold,   marginBottom: 3 },
  statLabel:   { fontSize: 13, fontFamily: FONTS.medium, color: "#6B7280" },

  // Actions grid
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  actionCard: {
    width: (width - 52) / 2,
    borderRadius: 16, padding: 18, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  actionTitle:   { fontSize: 14, fontFamily: FONTS.semiBold, color: "#111827", marginBottom: 2, textAlign: "center" },
  actionSub:     { fontSize: 11, fontFamily: FONTS.regular,  color: "#6B7280", textAlign: "center" },

  // Order card
  orderCard: {
    borderRadius: 16, marginBottom: 12, borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  orderTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 12 },
  orderIdRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  orderIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  orderId:      { fontSize: 14, fontFamily: FONTS.semiBold },
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontSize: 11, fontFamily: FONTS.semiBold },
  orderDivider: { height: 1, marginHorizontal: 16 },
  orderMeta:    { padding: 16, paddingTop: 12, gap: 8 },
  metaRow:      { flexDirection: "row", justifyContent: "space-between" },
  metaLabel:    { fontSize: 13, fontFamily: FONTS.regular, color: "#9CA3AF" },
  metaValue:    { fontSize: 13, fontFamily: FONTS.medium },

  // Stock card
  stockCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#F59E0B",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  stockIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  stockInfo:    { flex: 1 },
  stockName:    { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 2 },
  stockShop:    { fontSize: 12, fontFamily: FONTS.regular,  color: "#9CA3AF" },
  stockRight:   { alignItems: "flex-end" },
  stockPrice:   { fontSize: 14, fontFamily: FONTS.bold, color: "#6366F1", marginBottom: 4 },
  stockBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stockBadgeText: { fontSize: 11, fontFamily: FONTS.semiBold },

  // Empty state
  emptyCard: {
    borderRadius: 16, padding: 28, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontFamily: FONTS.semiBold, marginBottom: 4, textAlign: "center" },
  emptySub:   { fontSize: 13, fontFamily: FONTS.regular,  color: "#9CA3AF", textAlign: "center" },
});

export default DashboardScreen;
