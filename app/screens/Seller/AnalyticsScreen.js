import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { BarChart, PieChart, LineChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 48;

const PRIMARY   = "#6366F1";
const DATE_RANGES = [
  { key: "all",       label: "All" },
  { key: "last7days", label: "7D"  },
  { key: "last30days",label: "30D" },
  { key: "last90days",label: "90D" },
];

const Analytics = ({ navigation }) => {
  const { user }   = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [isLoading, setIsLoading]         = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [shops, setShops]                 = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("all");
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [dateRange, setDateRange]         = useState("all");
  const [networkError, setNetworkError]   = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [errorMessage, setErrorMessage]   = useState("");

  const [analytics, setAnalytics] = useState({
    totalRevenue: 0, totalOrders: 0, totalCustomers: 0,
    averageOrderValue: 0, averageRating: 0, pendingOrders: 0,
    processingOrders: 0, completedOrders: 0, canceledOrders: 0,
    responseRate: 0, deliverySuccessRate: 0, monthlyGrowthRate: 0,
    topProducts: [], topCategories: [], totalProducts: 0,
    revenueChart: null, orderStatusChart: null,
    customerActivityChart: null, categoryChart: null, ratingDistribution: null,
  });

  useEffect(() => { initializeAnalytics(); }, []);
  useEffect(() => { if (selectedShopId) loadAnalyticsData(); }, [selectedShopId, dateRange]);

  const initializeAnalytics = async () => {
    try {
      const shopIds = await loadShops();
      await loadAnalyticsData(shopIds);
    } catch (error) {
      console.error("Error initializing analytics:", error);
      handleNetworkError(error);
    }
  };

  const isNetworkError = (error) =>
    error.message?.includes("Network request failed") ||
    error.message?.includes("fetch") ||
    error.message?.includes("ERR_NETWORK") ||
    error.message?.includes("ERR_INTERNET_DISCONNECTED") ||
    error.code === "NETWORK_ERROR" ||
    error.name === "NetworkError";

  const handleNetworkError = (error) => {
    console.error("Network error:", error);
    if (isNetworkError(error)) {
      setNetworkError(true);
      setErrorMessage("Unable to connect. Please check your internet connection.");
      if (retryAttempts < 3) {
        setTimeout(() => { setRetryAttempts((p) => p + 1); loadAnalyticsData(); }, 2000 * Math.pow(2, retryAttempts));
      }
    } else {
      setNetworkError(true);
      setErrorMessage("Failed to load analytics data. Please try again.");
    }
  };

  const retryWithBackoff = async (fn, attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); }
      catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  };

  const loadShops = async () => {
    try {
      const { data: shopsData } = await retryWithBackoff(async () => {
        const result = await supabase.from("shops").select("id, name, logo_url").eq("owner_id", user.id);
        if (result.error) throw result.error;
        return result;
      });
      if (shopsData?.length) {
        const allOption = { label: "All Shops", value: "all", icon: () => <FontAwesome5 name="store-alt" size={14} color={PRIMARY} /> };
        const formatted = shopsData.map((s) => ({ label: s.name, value: s.id, icon: () => <FontAwesome5 name="store" size={14} color={PRIMARY} /> }));
        setShops([allOption, ...formatted]);
        if (!selectedShopId || selectedShopId === "all") setSelectedShopId("all");
        setNetworkError(false); setErrorMessage("");
        return formatted.map((s) => s.value);
      }
      return [];
    } catch (error) {
      console.error("Error loading shops:", error);
      handleNetworkError(error);
      return [];
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    const map = { last7days: 7, last30days: 30, last90days: 90 };
    const days = map[dateRange];
    if (!days) return null;
    return new Date(now.getTime() - days * 86400000).toISOString();
  };

  const loadAnalyticsData = async (initialShopIds = null) => {
    try {
      setIsLoading(true); setNetworkError(false); setErrorMessage("");
      let shopIds = [];
      if (initialShopIds) {
        shopIds = initialShopIds;
      } else if (selectedShopId === "all") {
        shopIds = shops.filter((s) => s.value !== "all").map((s) => s.value);
      } else {
        shopIds = [selectedShopId];
      }
      if (!shopIds.length) { setIsLoading(false); return; }

      const dateFilter = getDateFilter();
      const buildQuery = (table, fields = "*") => {
        let q = supabase.from(table).select(fields);
        if (["orders","product_reviews","products","seller_stats"].includes(table)) q = q.in("shop_id", shopIds);
        if (dateFilter && ["orders","product_reviews"].includes(table)) q = q.gte("created_at", dateFilter);
        return q;
      };

      const [ordersResult, statsResult, productsResult] = await Promise.allSettled([
        retryWithBackoff(() => buildQuery("orders")),
        retryWithBackoff(() => buildQuery("seller_stats")),
        retryWithBackoff(() => buildQuery("products", "id, name, category, shop_id")),
      ]);

      const ordersData   = ordersResult.status   === "fulfilled" ? ordersResult.value.data   || [] : [];
      const statsData    = statsResult.status    === "fulfilled" ? statsResult.value.data    || [] : [];
      const productsData = productsResult.status === "fulfilled" ? productsResult.value.data || [] : [];

      let reviewsData = [];
      if (shopIds.length) {
        const { data: r } = await supabase.from("shop_ratings").select("rating, created_at").in("shop_id", shopIds);
        reviewsData = r || [];
      }

      if ([ordersResult, statsResult, productsResult].every((r) => r.status === "rejected")) throw new Error("All requests failed");

      const processed = await processAnalyticsData({ orders: ordersData, products: productsData, reviews: reviewsData, shopIds });
      setAnalytics(processed);
      setRetryAttempts(0); setNetworkError(false); setErrorMessage("");
    } catch (error) {
      console.error("Error loading analytics:", error);
      handleNetworkError(error);
    } finally {
      setIsLoading(false); setRefreshing(false);
    }
  };

  const processAnalyticsData = async ({ orders, products, reviews }) => {
    // Always compute revenue from orders directly — seller_stats can double-count
    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    const totalOrders  = orders.length;
    const totalCustomers = new Set(orders.map((o) => o.buyer_id || o.user_id)).size;
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const normalizeStatus = (s) => {
      if (!s) return "pending";
      const n = s.toLowerCase();
      if (n.includes("cancel")) return "cancelled";
      if (n.includes("complet") || n.includes("deliver")) return "completed";
      if (n.includes("process")) return "processing";
      return n;
    };
    const sc = orders.reduce((a, o) => { const s = normalizeStatus(o.status); a[s] = (a[s] || 0) + 1; return a; }, {});
    const pendingOrders = sc.pending || 0, processingOrders = sc.processing || 0, completedOrders = sc.completed || 0, canceledOrders = sc.cancelled || 0;

    const deliverySuccessRate = completedOrders
      ? (orders.filter((o) => { if (normalizeStatus(o.status) !== "completed") return false; if (!o.delivery_date || !o.expected_delivery_date) return true; return new Date(o.delivery_date) <= new Date(o.expected_delivery_date); }).length / completedOrders) * 100
      : 0;

    const now = new Date(), cm = now.getMonth(), cy = now.getFullYear(), lm = cm === 0 ? 11 : cm - 1, ly = cm === 0 ? cy - 1 : cy;
    const cmo = orders.filter((o) => { const d = new Date(o.created_at); return d.getMonth() === cm && d.getFullYear() === cy; }).length;
    const lmo = orders.filter((o) => { const d = new Date(o.created_at); return d.getMonth() === lm && d.getFullYear() === ly; }).length;
    const monthlyGrowthRate = lmo ? ((cmo - lmo) / lmo) * 100 : 0;

    const productSales = {}, categorySales = {};
    const { data: orderItems } = await supabase.from("order_items").select("product_id, quantity, unit_price, price").in("order_id", orders.map((o) => o.id));
    (orderItems || []).forEach((item) => {
      const sales = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || item.price || 0);
      productSales[item.product_id] = (productSales[item.product_id] || 0) + sales;
    });
    products.forEach((p) => {
      const cat = p.category || "Uncategorized";
      categorySales[cat] = (categorySales[cat] || 0) + (productSales[p.id] || 0);
    });

    const topProducts = Object.entries(productSales).map(([id, sales]) => ({ id, name: products.find((p) => p.id === id)?.name || "Unknown", sales })).sort((a, b) => b.sales - a.sales).slice(0, 5);
    const allZero = Object.values(categorySales).every((s) => s === 0);
    const catCountMap = {};
    if (allZero) products.forEach((p) => { const c = p.category || "Uncategorized"; catCountMap[c] = (catCountMap[c] || 0) + 1; });
    const topCategories = Object.entries(allZero ? catCountMap : categorySales).map(([category, sales]) => ({ category, sales })).sort((a, b) => b.sales - a.sales).slice(0, 5);
    const averageRating = reviews.length ? reviews.reduce((s, r) => s + parseFloat(r.rating || 0), 0) / reviews.length : 0;

    const chartData = generateChartData({ orders, topProducts, topCategories, reviews, totalRevenue, pendingOrders, processingOrders, completedOrders, canceledOrders });
    return { totalRevenue, totalOrders, totalCustomers, averageOrderValue, averageRating, pendingOrders, processingOrders, completedOrders, canceledOrders, responseRate: 85, deliverySuccessRate, monthlyGrowthRate, topProducts, topCategories, totalProducts: products.length, ...chartData };
  };

  const generateChartData = ({ orders, topProducts, topCategories, reviews, totalRevenue, pendingOrders, processingOrders, completedOrders, canceledOrders }) => {
    const revenueData   = generateMonthlyRevenue(orders);
    const activityData  = generateDailyActivity(orders);
    const ratingCounts  = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { const v = Math.floor(parseFloat(r.rating || 0)); if (v >= 1 && v <= 5) ratingCounts[v - 1]++; });

    const revenueChart = { labels: generateMonthLabels(), datasets: [{ data: revenueData.length ? revenueData : [0,0,0,0,0,0], color: (o=1) => `rgba(34,197,94,${o})`, strokeWidth: 3 }] };

    const orderStatusChart = [
      { name: "Completed",  population: completedOrders,  color: "#22C55E", legendFontColor: "#94A3B8", legendFontSize: 11 },
      { name: "Processing", population: processingOrders, color: "#F59E0B", legendFontColor: "#94A3B8", legendFontSize: 11 },
      { name: "Pending",    population: pendingOrders,    color: "#6366F1", legendFontColor: "#94A3B8", legendFontSize: 11 },
      { name: "Cancelled",  population: canceledOrders,   color: "#EF4444", legendFontColor: "#94A3B8", legendFontSize: 11 },
    ].filter((i) => i.population > 0);
    if (!orderStatusChart.length) orderStatusChart.push({ name: "No Orders", population: 1, color: "#E5E7EB", legendFontColor: "#94A3B8", legendFontSize: 11 });

    const customerActivityChart = { labels: generateDayLabels(), datasets: [{ data: activityData.length ? activityData : [0,0,0,0,0,0,0], color: (o=1) => `rgba(99,102,241,${o})`, strokeWidth: 2 }] };

    const catColors = ["#8B5CF6","#06B6D4","#F97316","#84CC16","#EC4899"];
    const categoryChart = topCategories.length
      ? topCategories.map((c, i) => ({ name: c.category || "Other", population: c.sales, color: catColors[i % 5], legendFontColor: "#94A3B8", legendFontSize: 11 }))
      : [{ name: "No Categories", population: 1, color: "#E5E7EB", legendFontColor: "#94A3B8", legendFontSize: 11 }];

    const ratingDistribution = { labels: ["1★","2★","3★","4★","5★"], datasets: [{ data: ratingCounts.every((c) => c === 0) ? [0,0,0,0,1] : ratingCounts }] };

    return { revenueChart, orderStatusChart, customerActivityChart, categoryChart, ratingDistribution };
  };

  const generateMonthLabels = () => { const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const now = new Date(); return Array.from({length:6},(_,i) => M[(now.getMonth()-5+i+12)%12]); };
  const generateDayLabels   = () => { const D = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; const now = new Date(); return Array.from({length:7},(_,i) => D[(now.getDay()-6+i+7)%7]); };

  const generateMonthlyRevenue = (orders) => {
    const data = new Array(6).fill(0);
    const now = new Date(), cm = now.getMonth(), cy = now.getFullYear();
    orders.forEach((o) => {
      const d = new Date(o.created_at), diff = (cy - d.getFullYear()) * 12 + (cm - d.getMonth());
      if (diff >= 0 && diff < 6) data[5 - diff] += parseFloat(o.total_amount || 0);
    });
    return data;
  };

  const generateDailyActivity = (orders) => {
    const data = new Array(7).fill(0);
    const now = new Date(); now.setHours(0,0,0,0);
    orders.forEach((o) => {
      const d = new Date(o.created_at); d.setHours(0,0,0,0);
      const diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < 7) data[6 - diff]++;
    });
    return data;
  };

  const formatCurrency = (v) => "N$" + parseFloat(v || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  const formatPct      = (v) => `${Math.round(v)}%`;

  const onRefresh = useCallback(() => {
    setRefreshing(true); setNetworkError(false); setErrorMessage(""); setRetryAttempts(0); loadAnalyticsData();
  }, [selectedShopId, dateRange]);

  // ── Derived UI values ──────────────────────────────────────────────────────
  const surface  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted    = isDarkMode ? "#9CA3AF" : "#6B7280";
  const subtle   = isDarkMode ? "rgba(255,255,255,0.06)" : "#F8FAFC";
  const chartBg  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const chartLbl = isDarkMode ? "rgba(156,163,175,1)" : "rgba(100,116,139,1)";

  const chartConfig = {
    backgroundColor: chartBg,
    backgroundGradientFrom: chartBg,
    backgroundGradientTo: chartBg,
    decimalPlaces: 0,
    color: (o = 1) => `rgba(99,102,241,${o})`,
    labelColor: () => chartLbl,
    style: { borderRadius: 12 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: PRIMARY },
    fillShadowGradient: PRIMARY,
    fillShadowGradientOpacity: 0.12,
  };

  // ── Metric cards config ────────────────────────────────────────────────────
  const METRICS = [
    { label: "Revenue",   value: formatCurrency(analytics.totalRevenue),      sub: `${analytics.totalOrders} orders`,  icon: "wallet",        color: "#22C55E" },
    { label: "Customers", value: String(analytics.totalCustomers),            sub: "Unique buyers",                    icon: "people",        color: "#6366F1" },
    { label: "Avg Order", value: formatCurrency(analytics.averageOrderValue), sub: "Per order",                        icon: "receipt",       color: "#F59E0B" },
    { label: "Rating",    value: analytics.averageRating.toFixed(1),          sub: "Store average",                    icon: "star",          color: "#8B5CF6" },
  ];

  const PERF = [
    { label: "Delivery",   value: formatPct(analytics.deliverySuccessRate), color: "#22C55E" },
    { label: "MoM Growth", value: `${analytics.monthlyGrowthRate >= 0 ? "+" : ""}${formatPct(analytics.monthlyGrowthRate)}`, color: analytics.monthlyGrowthRate >= 0 ? "#22C55E" : "#EF4444" },
    { label: "Products",   value: String(analytics.totalProducts), color: PRIMARY },
    { label: "Pending",    value: String(analytics.pendingOrders), color: "#F59E0B" },
  ];

  // ── Error screen ───────────────────────────────────────────────────────────
  if (networkError && retryAttempts >= 3) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
        <View style={[s.flex, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
          <Ionicons name="cloud-offline-outline" size={64} color="#EF4444" />
          <Text style={[s.errorTitle, { color: colors.text }]}>Connection Issue</Text>
          <Text style={[s.errorMsg, { color: muted }]}>{errorMessage}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setNetworkError(false); setRetryAttempts(0); loadAnalyticsData(); }}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>

      {/* Offline banner */}
      {networkError && retryAttempts < 3 && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#EF4444" />
          <Text style={s.offlineTxt}>Connection issues — retrying…</Text>
        </View>
      )}

      <ScrollView
        style={s.flex}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <LinearGradient colors={["#312E81","#4F46E5","#7C3AED"]} style={s.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroTitle}>Analytics</Text>
              <Text style={s.heroSub}>Business performance overview</Text>
            </View>
            <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate("Settings")}>
              <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{formatCurrency(analytics.totalRevenue)}</Text>
              <Text style={s.heroStatLabel}>Total Revenue</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{analytics.totalOrders}</Text>
              <Text style={s.heroStatLabel}>Orders</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{analytics.totalCustomers}</Text>
              <Text style={s.heroStatLabel}>Customers</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ── Shop selector ───────────────────────────────────────────────── */}
          <View style={{ zIndex: 1000, marginBottom: 14 }}>
            <DropDownPicker
              open={shopPickerOpen}
              value={selectedShopId}
              items={shops}
              setOpen={setShopPickerOpen}
              setValue={setSelectedShopId}
              placeholder="Select Shop"
              listMode="SCROLLVIEW"
              style={[s.dropdown, { backgroundColor: surface, borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#E5E7EB" }]}
              dropDownContainerStyle={[s.dropdownList, { backgroundColor: surface, borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#E5E7EB" }]}
              textStyle={[s.dropdownTxt, { color: colors.text }]}
              zIndex={1000}
            />
          </View>

          {/* ── Date filter ─────────────────────────────────────────────────── */}
          <View style={[s.dateRow, { backgroundColor: surface }]}>
            {DATE_RANGES.map(({ key, label }) => (
              <TouchableOpacity key={key} onPress={() => setDateRange(key)}
                style={[s.dateBtn, dateRange === key && s.dateBtnActive]}>
                <Text style={[s.dateTxt, { color: dateRange === key ? "#fff" : muted }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Loading overlay ──────────────────────────────────────────────── */}
          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={[s.loadingTxt, { color: muted }]}>Loading analytics…</Text>
            </View>
          ) : (
            <>
              {/* ── 2×2 Metric grid ────────────────────────────────────────── */}
              <View style={s.metricGrid}>
                {METRICS.map(({ label, value, sub, icon, color }) => (
                  <View key={label} style={[s.metricCard, { backgroundColor: surface }]}>
                    <View style={[s.metricIcon, { backgroundColor: `${color}18` }]}>
                      <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <Text style={[s.metricValue, { color: colors.text }]}>{value}</Text>
                    <Text style={[s.metricLabel, { color: colors.text }]}>{label}</Text>
                    <Text style={[s.metricSub, { color: muted }]}>{sub}</Text>
                  </View>
                ))}
              </View>

              {/* ── Performance strip ──────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Performance</Text>
                <View style={s.perfRow}>
                  {PERF.map(({ label, value, color }) => (
                    <View key={label} style={s.perfCell}>
                      <Text style={[s.perfValue, { color }]}>{value}</Text>
                      <Text style={[s.perfLabel, { color: muted }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Revenue trend ──────────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Revenue — Last 6 Months</Text>
                {analytics.totalRevenue > 0 ? (
                  <LineChart
                    data={analytics.revenueChart}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={{ ...chartConfig, color: (o=1) => `rgba(34,197,94,${o})`, fillShadowGradient: "#22C55E" }}
                    bezier
                    style={s.chart}
                    withInnerLines={false}
                    withOuterLines={false}
                  />
                ) : (
                  <View style={s.emptyChart}>
                    <Ionicons name="bar-chart-outline" size={40} color={isDarkMode ? "#374151" : "#E5E7EB"} />
                    <Text style={[s.emptyTxt, { color: muted }]}>No revenue data yet</Text>
                  </View>
                )}
              </View>

              {/* ── Customer activity ──────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Activity — Last 7 Days</Text>
                {analytics.totalOrders > 0 ? (
                  <LineChart
                    data={analytics.customerActivityChart}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    style={s.chart}
                    withInnerLines={false}
                    withOuterLines={false}
                  />
                ) : (
                  <View style={s.emptyChart}>
                    <Ionicons name="trending-up-outline" size={40} color={isDarkMode ? "#374151" : "#E5E7EB"} />
                    <Text style={[s.emptyTxt, { color: muted }]}>No activity this week</Text>
                  </View>
                )}
              </View>

              {/* ── Order status ───────────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Order Status</Text>
                {analytics.totalOrders > 0 && analytics.orderStatusChart ? (
                  <PieChart
                    data={analytics.orderStatusChart}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="10"
                    style={s.chart}
                  />
                ) : (
                  <View style={s.emptyChart}>
                    <Ionicons name="pie-chart-outline" size={40} color={isDarkMode ? "#374151" : "#E5E7EB"} />
                    <Text style={[s.emptyTxt, { color: muted }]}>No orders yet</Text>
                  </View>
                )}
              </View>

              {/* ── Top categories ─────────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Top Categories</Text>
                {analytics.categoryChart && analytics.categoryChart[0]?.name !== "No Categories" ? (
                  <PieChart
                    data={analytics.categoryChart}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="10"
                    style={s.chart}
                  />
                ) : (
                  <View style={s.emptyChart}>
                    <Ionicons name="grid-outline" size={40} color={isDarkMode ? "#374151" : "#E5E7EB"} />
                    <Text style={[s.emptyTxt, { color: muted }]}>No category data</Text>
                  </View>
                )}
              </View>

              {/* ── Rating distribution ────────────────────────────────────── */}
              <View style={[s.card, { backgroundColor: surface }]}>
                <Text style={[s.cardTitle, { color: colors.text }]}>Rating Distribution</Text>
                {analytics.ratingDistribution ? (
                  <BarChart
                    data={analytics.ratingDistribution}
                    width={CHART_WIDTH}
                    height={180}
                    fromZero
                    segments={Math.max(Math.max(...(analytics.ratingDistribution.datasets?.[0]?.data || [4])), 4)}
                    chartConfig={{ ...chartConfig, color: (o=1) => `rgba(251,191,36,${o})`, formatYLabel: (v) => Math.round(Number(v)).toString() }}
                    style={s.chart}
                    withInnerLines={false}
                  />
                ) : (
                  <View style={s.emptyChart}>
                    <Ionicons name="stats-chart-outline" size={40} color={isDarkMode ? "#374151" : "#E5E7EB"} />
                    <Text style={[s.emptyTxt, { color: muted }]}>No rating data yet</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  // Offline banner
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  offlineTxt: { fontSize: 12, fontFamily: FONTS.medium, color: "#EF4444" },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroTitle: { fontSize: 26, fontFamily: FONTS.bold, color: "#fff" },
  heroSub:   { fontSize: 13, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 16,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { fontSize: 18, fontFamily: FONTS.bold, color: "#fff" },
  heroStatLabel: { fontSize: 11, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 8 },

  // Body
  body: { padding: 16, gap: 14 },

  // Dropdown
  dropdown:     { borderRadius: 12, minHeight: 48 },
  dropdownList: { borderRadius: 12 },
  dropdownTxt:  { fontSize: 14, fontFamily: FONTS.medium },

  // Date filter
  dateRow: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  dateBtnActive: { backgroundColor: PRIMARY },
  dateTxt: { fontSize: 13, fontFamily: FONTS.bold },

  // Loading
  loadingWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingTxt:  { fontSize: 14, fontFamily: FONTS.regular },

  // Metric grid (2×2)
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  metricValue: { fontSize: 20, fontFamily: FONTS.bold },
  metricLabel: { fontSize: 13, fontFamily: FONTS.medium },
  metricSub:   { fontSize: 11, fontFamily: FONTS.regular },

  // Card
  card: {
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 16 },

  // Performance strip
  perfRow:   { flexDirection: "row" },
  perfCell:  { flex: 1, alignItems: "center", gap: 4 },
  perfValue: { fontSize: 18, fontFamily: FONTS.bold },
  perfLabel: { fontSize: 11, fontFamily: FONTS.regular, textAlign: "center" },

  // Chart
  chart: { borderRadius: 12 },

  // Empty chart
  emptyChart: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyTxt:   { fontSize: 13, fontFamily: FONTS.regular },

  // Error screen
  errorTitle: { fontSize: 22, fontFamily: FONTS.bold, marginTop: 16, marginBottom: 8 },
  errorMsg:   { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  retryBtn:   { backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  retryTxt:   { color: "#fff", fontSize: 15, fontFamily: FONTS.bold },
});

export default Analytics;
