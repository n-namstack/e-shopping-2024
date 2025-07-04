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
  Platform,
  Alert,
} from "react-native";
import {
  BarChart,
  PieChart,
  LineChart,
  ProgressChart,
} from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
  AntDesign,
} from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
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
const CHART_WIDTH = width - 32;
const CARD_WIDTH = (width - 48) / 2;

const Analytics = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("all");
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("all"); // last7days, last30days, last90days, all
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  const [analytics, setAnalytics] = useState({
    // Core metrics
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    averageRating: 0,
    
    // Order status breakdown
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    
    // Performance metrics
    responseRate: 0,
    deliverySuccessRate: 0,
    monthlyGrowthRate: 0,
    
    // Product insights
    topProducts: [],
    topCategories: [],
    totalProducts: 0,
    
    // Chart data
    revenueChart: null,
    orderStatusChart: null,
    customerActivityChart: null,
    categoryChart: null,
    ratingDistribution: null,
  });

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      loadAnalyticsData();
    }
  }, [selectedShopId, dateRange]);

  const initializeAnalytics = async () => {
    try {
      await loadShops();
    } catch (error) {
      console.error("Error initializing analytics:", error);
      Alert.alert("Error", "Failed to load analytics data");
    }
  };

  const loadShops = async () => {
    try {
      const { data: shopsData, error } = await supabase
        .from("shops")
        .select("id, name, logo_url")
        .eq("owner_id", user.id);

      if (error) throw error;

      if (shopsData?.length) {
        const allShopsOption = {
          label: "All Shops",
          value: "all",
          icon: () => <FontAwesome5 name="store-alt" size={16} color={COLORS.primary} />
        };

        const formattedShops = shopsData.map((shop) => ({
          label: shop.name,
          value: shop.id,
          icon: () => <FontAwesome5 name="store" size={16} color={COLORS.primary} />
        }));

        setShops([allShopsOption, ...formattedShops]);
        
        if (!selectedShopId || selectedShopId === "all") {
          setSelectedShopId("all");
        }
      }
    } catch (error) {
      console.error("Error loading shops:", error);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    let startDate = null;

    switch (dateRange) {
      case "last7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "last30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "last90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return null;
    }

    return startDate?.toISOString();
  };

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);

      // Get shop IDs to query
      let shopIds = [];
      if (selectedShopId === "all") {
        shopIds = shops
          .filter((shop) => shop.value !== "all")
          .map((shop) => shop.value);
      } else {
        shopIds = [selectedShopId];
      }

      if (shopIds.length === 0) {
        setIsLoading(false);
        return;
      }

      const dateFilter = getDateFilter();

      // Build base query with date filter
      const buildQuery = (table) => {
        let query = supabase.from(table).select("*").in("shop_id", shopIds);
        if (dateFilter) {
          query = query.gte("created_at", dateFilter);
        }
        return query;
      };

      // Fetch all data in parallel
      const [
        { data: ordersData, error: ordersError },
        { data: statsData, error: statsError },
        { data: productsData, error: productsError },
        { data: reviewsData, error: reviewsError },
      ] = await Promise.all([
        buildQuery("orders"),
        supabase.from("seller_stats").select("*").in("shop_id", shopIds),
        supabase.from("products").select("id, name, category, shop_id").in("shop_id", shopIds),
        buildQuery("product_reviews"),
      ]);

      if (ordersError) throw ordersError;
      if (statsError) throw statsError;

      // Process the data
      const processedAnalytics = await processAnalyticsData({
        orders: ordersData || [],
        stats: statsData || [],
        products: productsData || [],
        reviews: reviewsData || [],
        shopIds,
      });

      setAnalytics(processedAnalytics);
    } catch (error) {
      console.error("Error loading analytics:", error);
      Alert.alert("Error", "Failed to load analytics data");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const processAnalyticsData = async ({ orders, stats, products, reviews, shopIds }) => {
    // Calculate core metrics from actual data
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);

    const totalOrders = orders.length;
    const totalCustomers = new Set(orders.map(o => o.buyer_id)).size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Order status breakdown
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
    const canceledOrders = orders.filter(o => ['cancelled', 'canceled'].includes(o.status)).length;

    // Calculate performance metrics
    const deliverySuccessRate = completedOrders > 0 ? 
      (orders.filter(o => o.status === 'delivered' && o.delivery_date && 
        new Date(o.delivery_date) <= new Date(o.expected_delivery_date || o.delivery_date)
      ).length / completedOrders) * 100 : 0;

    // Calculate monthly growth (simplified)
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    const currentMonthOrders = orders.filter(o => 
      new Date(o.created_at).getMonth() === currentMonth
    ).length;
    
    const lastMonthOrders = orders.filter(o => 
      new Date(o.created_at).getMonth() === lastMonth
    ).length;

    const monthlyGrowthRate = lastMonthOrders > 0 ? 
      ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0;

    // Process product insights
    const productSales = {};
    const categorySales = {};

    // Get order items to calculate sales
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price")
      .in("order_id", orders.map(o => o.id));

    (orderItems || []).forEach(item => {
      const sales = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
      
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = 0;
      }
      productSales[item.product_id] += sales;
    });

    // Map products and calculate category sales
    products.forEach(product => {
      const sales = productSales[product.id] || 0;
      if (!categorySales[product.category]) {
        categorySales[product.category] = 0;
      }
      categorySales[product.category] += sales;
    });

    // Get top products
    const topProducts = Object.entries(productSales)
      .map(([productId, sales]) => {
        const product = products.find(p => p.id === productId);
        return { 
          id: productId, 
          name: product?.name || 'Unknown Product', 
          sales: sales 
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Get top categories
    const topCategories = Object.entries(categorySales)
      .map(([category, sales]) => ({ category, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Calculate average rating
    const averageRating = reviews.length > 0 ? 
      reviews.reduce((sum, review) => sum + parseFloat(review.rating || 0), 0) / reviews.length : 0;

    // Generate chart data
    const chartData = generateChartData({
      orders,
      topProducts,
      topCategories,
      reviews,
      totalRevenue,
      pendingOrders,
      processingOrders,
      completedOrders,
      canceledOrders,
    });

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
      averageRating,
      pendingOrders,
      processingOrders,
      completedOrders,
      canceledOrders,
      responseRate: 85, // Placeholder - would need customer_messages data
      deliverySuccessRate,
      monthlyGrowthRate,
      topProducts,
      topCategories,
      totalProducts: products.length,
      ...chartData,
    };
  };

  const generateChartData = ({ 
    orders, 
    topProducts, 
    topCategories, 
    reviews,
    totalRevenue,
    pendingOrders,
    processingOrders,
    completedOrders,
    canceledOrders 
  }) => {
    // Revenue chart (last 6 months)
    const revenueChart = {
      labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        data: generateMonthlyRevenue(orders),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    // Order status chart
    const orderStatusChart = [
      {
        name: "Completed",
        population: completedOrders,
        color: "#22C55E",
        legendFontColor: "#64748B",
        legendFontSize: 12,
      },
      {
        name: "Processing",
        population: processingOrders,
        color: "#F59E0B",
        legendFontColor: "#64748B",
        legendFontSize: 12,
      },
      {
        name: "Pending",
        population: pendingOrders,
        color: "#3B82F6",
        legendFontColor: "#64748B",
        legendFontSize: 12,
      },
      {
        name: "Canceled",
        population: canceledOrders,
        color: "#EF4444",
        legendFontColor: "#64748B",
        legendFontSize: 12,
      },
    ].filter(item => item.population > 0);

    // Customer activity chart (last 7 days)
    const customerActivityChart = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{
        data: generateDailyActivity(orders),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 2,
      }],
    };

    // Category chart
    const categoryChart = topCategories.map((category, index) => {
      const colors = ["#8B5CF6", "#06B6D4", "#F97316", "#84CC16", "#EC4899"];
      return {
        name: category.category || "Other",
        population: category.sales,
        color: colors[index % colors.length],
        legendFontColor: "#64748B",
        legendFontSize: 12,
      };
    });

    // Rating distribution
    const ratingCounts = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      const rating = Math.floor(parseFloat(review.rating || 0));
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating - 1]++;
      }
    });

    const ratingDistribution = {
      labels: ["1★", "2★", "3★", "4★", "5★"],
      datasets: [{ data: ratingCounts }],
    };

    return {
      revenueChart,
      orderStatusChart,
      customerActivityChart,
      categoryChart,
      ratingDistribution,
    };
  };

  const generateMonthlyRevenue = (orders) => {
    const monthlyData = new Array(6).fill(0);
    const currentMonth = new Date().getMonth();
    
    orders.forEach(order => {
      if (order.payment_status === 'paid') {
        const orderDate = new Date(order.created_at);
        const monthDiff = currentMonth - orderDate.getMonth();
        if (monthDiff >= 0 && monthDiff < 6) {
          monthlyData[5 - monthDiff] += parseFloat(order.total_amount || 0);
        }
      }
    });
    
    return monthlyData;
  };

  const generateDailyActivity = (orders) => {
    const dailyData = new Array(7).fill(0);
    const today = new Date();
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dayDiff = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
      if (dayDiff >= 0 && dayDiff < 7) {
        const dayIndex = (7 - dayDiff - 1) % 7;
        dailyData[dayIndex]++;
      }
    });
    
    return dailyData;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalyticsData();
  }, [selectedShopId, dateRange]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  if (!fontsLoaded || isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </SafeAreaView>
    );
  }

  const renderMetricCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderChartCard = ({ title, children, height = 220 }) => (
    <View style={[styles.chartCard, { height: height + 60 }]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContainer}>
        {children}
      </View>
    </View>
  );

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#6366F1"
    },
    fillShadowGradient: "#6366F1",
    fillShadowGradientOpacity: 0.1,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Track your business performance
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        {/* Shop Selector */}
        <View style={styles.selectorContainer}>
          <DropDownPicker
            open={shopPickerOpen}
            value={selectedShopId}
            items={shops}
            setOpen={setShopPickerOpen}
            setValue={setSelectedShopId}
            placeholder="Select Shop"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={styles.dropdownText}
            zIndex={1000}
          />
        </View>

        {/* Date Range Filter */}
        <View style={styles.filterContainer}>
          {["all", "last7days", "last30days", "last90days"].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterButton,
                dateRange === range && styles.filterButtonActive,
              ]}
              onPress={() => setDateRange(range)}
            >
              <Text
                style={[
                  styles.filterText,
                  dateRange === range && styles.filterTextActive,
                ]}
              >
                {range === "all" ? "All Time" : 
                 range === "last7days" ? "7 Days" :
                 range === "last30days" ? "30 Days" : "90 Days"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          {renderMetricCard({
            title: "Total Revenue",
            value: formatCurrency(analytics.totalRevenue),
            icon: "wallet-outline",
            color: "#22C55E",
            subtitle: `${analytics.totalOrders} orders`,
          })}
          
          {renderMetricCard({
            title: "Customers",
            value: analytics.totalCustomers.toString(),
            icon: "people-outline",
            color: "#3B82F6",
            subtitle: "Total customers",
          })}
          
          {renderMetricCard({
            title: "Avg Order Value",
            value: formatCurrency(analytics.averageOrderValue),
            icon: "receipt-outline",
            color: "#F59E0B",
            subtitle: "Per order",
          })}
          
          {renderMetricCard({
            title: "Rating",
            value: analytics.averageRating.toFixed(1),
            icon: "star-outline",
            color: "#8B5CF6",
            subtitle: "Average rating",
          })}
        </View>

        {/* Performance Metrics */}
        <View style={styles.performanceContainer}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>
                {formatPercentage(analytics.deliverySuccessRate)}
              </Text>
              <Text style={styles.performanceLabel}>Delivery Success</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>
                {formatPercentage(analytics.monthlyGrowthRate)}
              </Text>
              <Text style={styles.performanceLabel}>Monthly Growth</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>
                {analytics.totalProducts}
              </Text>
              <Text style={styles.performanceLabel}>Total Products</Text>
            </View>
          </View>
        </View>

        {/* Charts */}
        {analytics.revenueChart && (
          renderChartCard({
            title: "Revenue Trend",
            children: (
              <LineChart
                data={analytics.revenueChart}
                width={CHART_WIDTH}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            ),
          })
        )}

        {analytics.orderStatusChart && analytics.orderStatusChart.length > 0 && (
          renderChartCard({
            title: "Order Status Distribution",
            children: (
              <PieChart
                data={analytics.orderStatusChart}
                width={CHART_WIDTH}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            ),
          })
        )}

        {analytics.customerActivityChart && (
          renderChartCard({
            title: "Customer Activity (Last 7 Days)",
            children: (
              <LineChart
                data={analytics.customerActivityChart}
                width={CHART_WIDTH}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                }}
                style={styles.chart}
              />
            ),
          })
        )}

        {analytics.categoryChart && analytics.categoryChart.length > 0 && (
          renderChartCard({
            title: "Top Categories",
            children: (
              <PieChart
                data={analytics.categoryChart}
                width={CHART_WIDTH}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            ),
          })
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontFamily: "Poppins_500Medium",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: COLORS.gray,
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  selectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    zIndex: 1000,
  },
  dropdown: {
    borderColor: "#E2E8F0",
    borderRadius: 12,
    minHeight: 48,
  },
  dropdownContainer: {
    borderColor: "#E2E8F0",
    borderRadius: 12,
  },
  dropdownText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: COLORS.gray,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  metricsGrid: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  metricTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: COLORS.gray,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: COLORS.dark,
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: COLORS.gray,
  },
  performanceContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: COLORS.dark,
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: "row",
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  performanceValue: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: COLORS.gray,
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: COLORS.dark,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    borderRadius: 12,
  },
  bottomSpace: {
    height: 20,
  },
});

export default Analytics;
