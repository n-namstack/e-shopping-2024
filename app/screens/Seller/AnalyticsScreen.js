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
import { dark, useTheme } from "@react-navigation/native";
import { Colors } from "react-native/Libraries/NewAppScreen";

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
  const [dateRange, setDateRange] = useState("all");
  const [networkError, setNetworkError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const { colors } = useTheme();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    averageRating: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    responseRate: 0,
    deliverySuccessRate: 0,
    monthlyGrowthRate: 0,
    topProducts: [],
    topCategories: [],
    totalProducts: 0,
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
      handleNetworkError(error);
    }
  };

  const isNetworkError = (error) => {
    return (
      error.message?.includes("Network request failed") ||
      error.message?.includes("fetch") ||
      error.message?.includes("ERR_NETWORK") ||
      error.message?.includes("ERR_INTERNET_DISCONNECTED") ||
      error.code === "NETWORK_ERROR" ||
      error.name === "NetworkError"
    );
  };

  const handleNetworkError = (error) => {
    console.error("Network error:", error);

    if (isNetworkError(error)) {
      setNetworkError(true);
      setErrorMessage(
        "Unable to connect to the server. Please check your internet connection."
      );

      // Auto-retry with exponential backoff
      if (retryAttempts < 3) {
        setTimeout(() => {
          setRetryAttempts((prev) => prev + 1);
          loadAnalyticsData();
        }, 2000 * Math.pow(2, retryAttempts));
      }
    } else {
      setNetworkError(true);
      setErrorMessage("Failed to load analytics data. Please try again.");
    }
  };

  const retryWithBackoff = async (fn, attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
  };

  const loadShops = async () => {
    try {
      const { data: shopsData, error } = await retryWithBackoff(async () => {
        const result = await supabase
          .from("shops")
          .select("id, name, logo_url")
          .eq("owner_id", user.id);

        if (result.error) throw result.error;
        return result;
      });

      if (shopsData?.length) {
        const allShopsOption = {
          label: "All Shops",
          value: "all",
          icon: () => (
            <FontAwesome5 name="store-alt" size={16} color={colors.primary} />
          ),
        };

        const formattedShops = shopsData.map((shop) => ({
          label: shop.name,
          value: shop.id,
          icon: () => (
            <FontAwesome5 name="store" size={16} color={colors.primary} />
          ),
        }));

        setShops([allShopsOption, ...formattedShops]);

        if (!selectedShopId || selectedShopId === "all") {
          setSelectedShopId("all");
        }

        setNetworkError(false);
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Error loading shops:", error);
      handleNetworkError(error);
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
      setNetworkError(false);
      setErrorMessage("");

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
      const buildQuery = (table, selectFields = "*") => {
        let query = supabase.from(table).select(selectFields);

        if (table === "orders" || table === "product_reviews") {
          query = query.in("shop_id", shopIds);
        } else if (table === "products") {
          query = query.in("shop_id", shopIds);
        } else if (table === "seller_stats") {
          query = query.in("shop_id", shopIds);
        }

        if (dateFilter && (table === "orders" || table === "product_reviews")) {
          query = query.gte("created_at", dateFilter);
        }

        return query;
      };

      // Fetch data with retry logic
      const [ordersResult, statsResult, productsResult, reviewsResult] =
        await Promise.allSettled([
          retryWithBackoff(() => buildQuery("orders")),
          retryWithBackoff(() => buildQuery("seller_stats")),
          retryWithBackoff(() =>
            buildQuery("products", "id, name, category, shop_id")
          ),
          retryWithBackoff(() => buildQuery("product_reviews")),
        ]);

      // Handle results and fallback to empty arrays if failed
      const ordersData =
        ordersResult.status === "fulfilled"
          ? ordersResult.value.data || []
          : [];
      const statsData =
        statsResult.status === "fulfilled" ? statsResult.value.data || [] : [];
      const productsData =
        productsResult.status === "fulfilled"
          ? productsResult.value.data || []
          : [];
      const reviewsData =
        reviewsResult.status === "fulfilled"
          ? reviewsResult.value.data || []
          : [];

      // Log any failures
      if (ordersResult.status === "rejected") {
        console.error("Orders fetch failed:", ordersResult.reason);
        handleNetworkError(ordersResult.reason);
      }
      if (statsResult.status === "rejected") {
        console.error("Stats fetch failed:", statsResult.reason);
      }
      if (productsResult.status === "rejected") {
        console.error("Products fetch failed:", productsResult.reason);
      }
      if (reviewsResult.status === "rejected") {
        console.error("Reviews fetch failed:", reviewsResult.reason);
      }

      // Check if all requests failed
      const allFailed = [
        ordersResult,
        statsResult,
        productsResult,
        reviewsResult,
      ].every((result) => result.status === "rejected");

      if (allFailed) {
        throw new Error("All data requests failed");
      }

      // Process the data
      const processedAnalytics = await processAnalyticsData({
        orders: ordersData,
        stats: statsData,
        products: productsData,
        reviews: reviewsData,
        shopIds,
      });

      setAnalytics(processedAnalytics);
      setRetryAttempts(0);
      setNetworkError(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Error loading analytics:", error);
      handleNetworkError(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const processAnalyticsData = async ({
    orders,
    stats,
    products,
    reviews,
    shopIds,
  }) => {
    // Calculate core metrics from actual data
    const paidOrders = orders.filter(
      (o) =>
        o.payment_status === "paid" ||
        o.status === "completed" ||
        o.status === "delivered"
    );
    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_amount || 0),
      0
    );

    const totalOrders = orders.length;
    const totalCustomers = new Set(orders.map((o) => o.buyer_id || o.user_id))
      .size;
    const averageOrderValue =
      paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Order status breakdown with normalized status names
    const normalizeStatus = (status) => {
      if (!status) return "pending";
      const normalized = status.toLowerCase();
      if (normalized.includes("cancel")) return "cancelled";
      if (normalized.includes("complet") || normalized.includes("deliver"))
        return "completed";
      if (normalized.includes("process")) return "processing";
      return normalized;
    };

    const statusCounts = orders.reduce((acc, order) => {
      const status = normalizeStatus(order.status);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const pendingOrders = statusCounts.pending || 0;
    const processingOrders = statusCounts.processing || 0;
    const completedOrders = statusCounts.completed || 0;
    const canceledOrders = statusCounts.cancelled || 0;

    // Calculate performance metrics
    const deliverySuccessRate =
      completedOrders > 0
        ? (orders.filter((o) => {
            const isDelivered = normalizeStatus(o.status) === "completed";
            if (!isDelivered) return false;
            if (!o.delivery_date || !o.expected_delivery_date) return true; // Assume success if no dates
            return (
              new Date(o.delivery_date) <= new Date(o.expected_delivery_date)
            );
          }).length /
            completedOrders) *
          100
        : 0;

    // Calculate monthly growth with proper date handling
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthOrders = orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate.getMonth() === currentMonth &&
        orderDate.getFullYear() === currentYear
      );
    }).length;

    const lastMonthOrders = orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate.getMonth() === lastMonth &&
        orderDate.getFullYear() === lastMonthYear
      );
    }).length;

    const monthlyGrowthRate =
      lastMonthOrders > 0
        ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
        : 0;

    // Process product insights
    const productSales = {};
    const categorySales = {};

    // Get order items to calculate sales
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, unit_price, price")
      .in(
        "order_id",
        orders.map((o) => o.id)
      );

    (orderItems || []).forEach((item) => {
      const unitPrice = parseFloat(item.unit_price || item.price || 0);
      const quantity = parseFloat(item.quantity || 0);
      const sales = quantity * unitPrice;

      if (!productSales[item.product_id]) {
        productSales[item.product_id] = 0;
      }
      productSales[item.product_id] += sales;
    });

    // Map products and calculate category sales
    products.forEach((product) => {
      const sales = productSales[product.id] || 0;
      const category = product.category || "Uncategorized";
      if (!categorySales[category]) {
        categorySales[category] = 0;
      }
      categorySales[category] += sales;
    });

    // Get top products
    const topProducts = Object.entries(productSales)
      .map(([productId, sales]) => {
        const product = products.find((p) => p.id === productId);
        return {
          id: productId,
          name: product?.name || "Unknown Product",
          sales: sales,
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
    const averageRating =
      reviews.length > 0
        ? reviews.reduce(
            (sum, review) => sum + parseFloat(review.rating || 0),
            0
          ) / reviews.length
        : 0;

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
    canceledOrders,
  }) => {
    // Revenue chart (last 6 months) - Fixed date calculation
    const revenueData = generateMonthlyRevenue(orders);
    const monthLabels = generateMonthLabels();

    const revenueChart = {
      labels: monthLabels,
      datasets: [
        {
          data: revenueData.length > 0 ? revenueData : [0, 0, 0, 0, 0, 0],
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    // Order status chart - Only include non-zero values
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
    ].filter((item) => item.population > 0);

    // If no orders, show a placeholder
    if (orderStatusChart.length === 0) {
      orderStatusChart.push({
        name: "No Orders",
        population: 1,
        color: "#E5E7EB",
        legendFontColor: "#64748B",
        legendFontSize: 12,
      });
    }

    // Customer activity chart (last 7 days) - Fixed day calculation
    const activityData = generateDailyActivity(orders);
    const dayLabels = generateDayLabels();

    const customerActivityChart = {
      labels: dayLabels,
      datasets: [
        {
          data: activityData.length > 0 ? activityData : [0, 0, 0, 0, 0, 0, 0],
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    // Category chart - Only show if there are categories
    const categoryChart =
      topCategories.length > 0
        ? topCategories.map((category, index) => {
            const colors = [
              "#8B5CF6",
              "#06B6D4",
              "#F97316",
              "#84CC16",
              "#EC4899",
            ];
            return {
              name: category.category || "Other",
              population: category.sales,
              color: colors[index % colors.length],
              legendFontColor: "#64748B",
              legendFontSize: 12,
            };
          })
        : [
            {
              name: "No Categories",
              population: 1,
              color: "#E5E7EB",
              legendFontColor: "#64748B",
              legendFontSize: 12,
            },
          ];

    // Rating distribution - Fixed calculation
    const ratingCounts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const rating = Math.floor(parseFloat(review.rating || 0));
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating - 1]++;
      }
    });

    const ratingDistribution = {
      labels: ["1★", "2★", "3★", "4★", "5★"],
      datasets: [
        {
          data: ratingCounts.every((count) => count === 0)
            ? [0, 0, 0, 0, 1]
            : ratingCounts,
        },
      ],
    };

    return {
      revenueChart,
      orderStatusChart,
      customerActivityChart,
      categoryChart,
      ratingDistribution,
    };
  };

  const generateMonthLabels = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentDate.getMonth() - i + 12) % 12;
      labels.push(months[monthIndex]);
    }

    return labels;
  };

  const generateDayLabels = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const labels = [];
    const currentDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const dayIndex = (currentDate.getDay() - i + 7) % 7;
      labels.push(days[dayIndex]);
    }

    return labels;
  };

  const generateMonthlyRevenue = (orders) => {
    const monthlyData = new Array(6).fill(0);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    orders.forEach((order) => {
      if (
        order.payment_status === "paid" ||
        order.status === "completed" ||
        order.status === "delivered"
      ) {
        const orderDate = new Date(order.created_at);
        const orderMonth = orderDate.getMonth();
        const orderYear = orderDate.getFullYear();

        // Calculate month difference properly handling year changes
        let monthDiff =
          (currentYear - orderYear) * 12 + (currentMonth - orderMonth);

        if (monthDiff >= 0 && monthDiff < 6) {
          monthlyData[5 - monthDiff] += parseFloat(order.total_amount || 0);
        }
      }
    });

    return monthlyData;
  };

  const generateDailyActivity = (orders) => {
    const dailyData = new Array(7).fill(0);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currentDate - orderDate) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff >= 0 && dayDiff < 7) {
        dailyData[6 - dayDiff]++;
      }
    });

    return dailyData;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNetworkError(false);
    setErrorMessage("");
    setRetryAttempts(0);
    loadAnalyticsData();
  }, [selectedShopId, dateRange]);

  const renderNetworkError = () => (
    <View style={styles.networkErrorContainer}>
      <Ionicons name="cloud-offline-outline" size={64} color="#EF4444" />
      <Text style={[styles.networkErrorTitle, { color: colors.text }]}>
        Connection Issue
      </Text>
      <Text style={[styles.networkErrorMessage, { color: colors.text }]}>
        {errorMessage}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setNetworkError(false);
          setRetryAttempts(0);
          loadAnalyticsData();
        }}
      >
        <Text style={[styles.retryButtonText, { color: colors.text }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOfflineIndicator = () => (
    <View style={[styles.offlineIndicator, { color: colors.text }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#EF4444" />
      <Text style={[styles.offlineText, { color: colors.text }]}>
        Connection Issues
      </Text>
    </View>
  );

  if (!fontsLoaded) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  if (networkError && errorMessage && retryAttempts >= 3) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {renderNetworkError()}
      </SafeAreaView>
    );
  }

  const renderMetricCard = ({ title, value, icon, color, subtitle }) => (
    <View
      style={[
        styles.metricCard,
        { borderLeftColor: color, backgroundColor: colors.card },
      ]}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.metricTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: colors.text }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const renderChartCard = ({ title, children, height = 220 }) => (
    <View
      style={[
        styles.chartCard,
        { height: height + 60, backgroundColor: colors.card },
      ]}
    >
      <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.chartContainer, { color: colors.text }]}>
        {children}
      </View>
    </View>
  );

  const renderEmptyChart = (message) => (
    <View style={styles.emptyChart}>
      <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
      <Text style={styles.emptyChartText}>{message}</Text>
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
      stroke: "#6366F1",
    },
    fillShadowGradient: "#6366F1",
    fillShadowGradientOpacity: 0.1,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {networkError &&
        errorMessage &&
        retryAttempts < 3 &&
        renderOfflineIndicator()}

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Analytics Dashboard
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.text }]}>
              Track your business performance
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading Analytics...</Text>
          </View>
        )}

        {/* Content */}
        {!isLoading && (
          <>
            {/* Shop Selector */}
            <View style={styles.selectorContainer}>
              <DropDownPicker
                open={shopPickerOpen}
                value={selectedShopId}
                items={shops}
                setOpen={setShopPickerOpen}
                setValue={setSelectedShopId}
                placeholder="Select Shop"
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                textStyle={[styles.dropdownText, { color: colors.text }]}
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
                    dateRange !== range && {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setDateRange(range)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      dateRange === range && styles.filterTextActive,
                      dateRange !== range && { color: colors.text },
                    ]}
                  >
                    {range === "all"
                      ? "All Time"
                      : range === "last7days"
                      ? "7 Days"
                      : range === "last30days"
                      ? "30 Days"
                      : "90 Days"}
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Performance Metrics
              </Text>
              <View style={[styles.performanceGrid, { color: colors.text }]}>
                <View
                  style={[
                    styles.performanceCard,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[styles.performanceValue, { color: colors.text }]}
                  >
                    {formatPercentage(analytics.deliverySuccessRate)}
                  </Text>
                  <Text
                    style={[styles.performanceLabel, { color: colors.text }]}
                  >
                    Delivery Success
                  </Text>
                </View>
                <View
                  style={[
                    styles.performanceCard,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[styles.performanceValue, { color: colors.text }]}
                  >
                    {formatPercentage(analytics.monthlyGrowthRate)}
                  </Text>
                  <Text
                    style={[styles.performanceLabel, { color: colors.text }]}
                  >
                    Monthly Growth
                  </Text>
                </View>
                <View
                  style={[
                    styles.performanceCard,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[styles.performanceValue, { color: colors.text }]}
                  >
                    {analytics.totalProducts}
                  </Text>
                  <Text
                    style={[styles.performanceLabel, { color: colors.text }]}
                  >
                    Total Products
                  </Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            {analytics.revenueChart &&
              renderChartCard({
                title: "Revenue Trend (Last 6 Months)",
                children:
                  analytics.totalRevenue > 0 ? (
                    <LineChart
                      data={analytics.revenueChart}
                      width={CHART_WIDTH}
                      height={200}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                    />
                  ) : (
                    renderEmptyChart("No revenue data available")
                  ),
              })}

            {analytics.orderStatusChart &&
              analytics.orderStatusChart.length > 0 &&
              renderChartCard({
                title: "Order Status Distribution",
                children:
                  analytics.totalOrders > 0 ? (
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
                  ) : (
                    renderEmptyChart("No orders data available")
                  ),
              })}

            {analytics.customerActivityChart &&
              renderChartCard({
                title: "Customer Activity (Last 7 Days)",
                children:
                  analytics.totalOrders > 0 ? (
                    <LineChart
                      data={analytics.customerActivityChart}
                      width={CHART_WIDTH}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) =>
                          dark
                            ? `rgba(129, 140, 248, ${opacity})` // Lighter indigo for dark mode
                            : `rgba(99, 102, 241, ${opacity})`,
                      }}
                      style={[styles.chart]}
                    />
                  ) : (
                    renderEmptyChart("No activity data available")
                  ),
              })}

            {analytics.categoryChart &&
              analytics.categoryChart.length > 0 &&
              renderChartCard({
                title: "Top Categories",
                children:
                  analytics.categoryChart[0].name !== "No Categories" ? (
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
                  ) : (
                    renderEmptyChart("No category data available")
                  ),
              })}

            {analytics.ratingDistribution &&
              renderChartCard({
                title: "Rating Distribution",
                children:
                  analytics.averageRating > 0 ? (
                    <BarChart
                      data={analytics.ratingDistribution}
                      width={CHART_WIDTH}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) =>
                          `rgba(251, 191, 36, ${opacity})`,
                      }}
                      style={styles.chart}
                    />
                  ) : (
                    renderEmptyChart("No rating data available")
                  ),
              })}
          </>
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
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontFamily: "Poppins_500Medium",
  },
  networkErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  networkErrorTitle: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  networkErrorMessage: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  offlineText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#EF4444",
    marginLeft: 8,
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
    fontFamily: FONTS.bold,
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
  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#94A3B8",
    marginTop: 8,
  },
  bottomSpace: {
    height: 20,
  },
});

export default Analytics;
