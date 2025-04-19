import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { LineChart, BarChart, PieChart, ContributionGraph } from 'react-native-chart-kit';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold
} from "@expo-google-fonts/poppins";

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userShops, setUserShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold,Poppins_500Medium ,Poppins_600SemiBold});
  
  const [salesData, setSalesData] = useState({
    lastWeekSales: [],
    monthlySales: [],
    categorySales: [],
  });
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'
  const [shopStats, setShopStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      fetchAnalyticsData();
    }
  }, [selectedShop, timeRange]);

  const loadShops = async () => {
    try {
      const { data: shops, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (shops && shops.length > 0) {
        setUserShops(shops);
        setSelectedShop(shops[0]);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading shops:', error.message);
      setIsLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sales data by time range
      const timeRangeMap = {
        week: '7 days',
        month: '30 days',
        year: '365 days'
      };
      
      // Get dates for filtering
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 365);
      }
      
      // Format for Supabase query
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      // Fetch stats from seller_stats for the selected shop
      const { data: statsData, error: statsError } = await supabase
        .from('seller_stats')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .single();
        
      if (statsError && statsError.code !== 'PGRST116') throw statsError;
      
      // Use actual stats data or initialize with zeros
      const shopStatsData = statsData || {
        total_revenue: "0.00",
        total_orders: 0,
        completed_orders: 0,
        canceled_orders: 0,
        pending_orders: 0,
        processing_orders: 0,
        total_products: 0,
        average_order_value: 0,
        total_customers: 0,
        top_product_name: null,
        top_product_sales: 0,
        top_category: null,
        top_category_sales: 0,
        average_rating: 0
      };

      // Parse numeric values to ensure they're treated as numbers
      const totalRevenue = parseFloat(shopStatsData.total_revenue) || 0;
      const totalOrders = parseInt(shopStatsData.total_orders) || 0;
      const completedOrders = parseInt(shopStatsData.completed_orders) || 0;
      const cancelledOrders = parseInt(shopStatsData.canceled_orders || shopStatsData.cancelled_orders) || 0;
      const pendingOrders = parseInt(shopStatsData.pending_orders) || 0;
      const processingOrders = parseInt(shopStatsData.processing_orders) || 0;
      const averageOrderValue = parseFloat(shopStatsData.average_order_value) || 0;
      const totalCustomers = parseInt(shopStatsData.total_customers) || 0;
      
      // Set shop stats from the fetched data
      setShopStats({
        totalRevenue,
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        processingOrders,
        averageOrderValue: averageOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0),
        totalCustomers,
        allTimeStats: shopStatsData
      });
      
      // Fetch orders data for the selected time range
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: true });
      
      if (ordersError) throw ordersError;
      
      // Process data for line chart (sales over time)
      const salesByDate = processTimeSeriesData(ordersData, timeRange);
      
      // Fetch product data to get category sales
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *, 
          order:order_id(created_at, shop_id),
          product:product_id(name, category)
        `)
        .eq('order.shop_id', selectedShop.id)
        .gte('order.created_at', startDateStr)
        .lte('order.created_at', endDateStr);
        
      if (itemsError) throw itemsError;
      
      // Process data for category pie chart
      const categoryData = processCategoryData(orderItems);
      
      // Calculate order counts
      const pendingCount = ordersData.filter(o => o.status === 'pending').length;
      const processingCount = ordersData.filter(o => o.status === 'processing').length;

      // Fetch order status distribution with custom colors
      const orderStatusData = {
        labels: ['Completed', 'Pending', 'Cancelled', 'Processing'],
        datasets: [{
          data: [
            completedOrders,
            pendingOrders,
            cancelledOrders,
            processingOrders,
          ]
        }]
      };

      // Process product sales data for pie chart
      const productSalesMap = new Map();

      // Group order items by product and calculate total sales
      orderItems.forEach(item => {
        if (!item.product || !item.order) return;
        
        const productId = item.product_id;
        const productName = item.product.name || 'Unknown Product';
        // Make sure unit_price is parsed as a float and handle potential null/undefined values
        const unitPrice = parseFloat(item.unit_price) || 0;
        const quantity = item.quantity || 0;
        const totalSales = quantity * unitPrice;
        
        if (productSalesMap.has(productId)) {
          const existing = productSalesMap.get(productId);
          existing.value += totalSales;
          existing.quantity += quantity;
        } else {
          productSalesMap.set(productId, {
            name: productName,
            value: totalSales,
            quantity: quantity,
            color: getRandomColor(),
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
          });
        }
      });

      // Convert map to array and sort by value
      let productSalesArray = Array.from(productSalesMap.values())
        .filter(product => product.value > 0) // Only include products with sales > 0
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Show top 5 for cleaner display
      
      // If no products or all have 0 sales, use top product from stats if available
      if (productSalesArray.length === 0 && shopStatsData.top_product_name && parseFloat(shopStatsData.top_product_sales) > 0) {
        productSalesArray.push({
          name: shopStatsData.top_product_name,
          value: parseFloat(shopStatsData.top_product_sales),
          quantity: 0,
          color: getRandomColor(),
          legendFontColor: "#7F7F7F",
          legendFontSize: 12
        });
      }

      // Generate heat map data for daily sales
      const heatMapData = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const daySales = ordersData
          .filter(o => o.created_at.startsWith(dateStr))
          .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        
        heatMapData.push({
          date: dateStr,
          count: daySales
        });
      }

      setSalesData({
        timeSeriesData: salesByDate,
        categorySales: categoryData,
        orderStatusData,
        heatMapData,
        productSalesData: productSalesArray
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error.message);
      setSalesData({
        timeSeriesData: null,
        categorySales: [],
        orderStatusData: null,
        heatMapData: [],
        productSalesData: []
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const processTimeSeriesData = (ordersData, timeRange) => {
    // Group by date and sum sales
    const salesByDate = {};
    let labels = [];
    
    if (timeRange === 'week') {
      // For week view, show each day
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        salesByDate[dateStr] = 0;
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }
    } else if (timeRange === 'month') {
      // For month view, group by week
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { day: 'numeric' })}`;
        labels.push(weekLabel);
        
        // Use the week start date as the key
        const weekKey = weekStart.toISOString().split('T')[0];
        salesByDate[weekKey] = 0;
      }
    } else {
      // For year view, group by month
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
        salesByDate[monthStr] = 0;
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }
    }
    
    // Fill in the actual sales data
    ordersData.forEach(order => {
      const orderDate = new Date(order.created_at);
      let key;
      
      if (timeRange === 'week') {
        key = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (timeRange === 'month') {
        // Find the start of the week for this order
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = orderDate.toISOString().slice(0, 7); // YYYY-MM for monthly
      }
      
      if (salesByDate[key] !== undefined) {
        salesByDate[key] += order.total_amount || 0;
      }
    });
    
    // Convert to array format for chart
    const data = Object.values(salesByDate);
    
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };
  
  const processCategoryData = (orderItems) => {
    // Group by category and calculate totals
    const categoryTotals = {};
    const categoryColors = {
      'Electronics': '#FF6384',
      'Clothing': '#36A2EB',
      'Home': '#FFCE56',
      'Beauty': '#4BC0C0',
      'Food': '#9966FF',
      'Books': '#FF9F40',
      'Other': '#C9CBCF'
    };
    
    orderItems.forEach(item => {
      if (!item.product || !item.product.category) return;
      
      const category = item.product.category;
      const amount = (item.quantity || 0) * (item.unit_price || 0);
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = {
          value: 0,
          count: 0,
          color: categoryColors[category] || categoryColors['Other'],
          name: category
        };
      }
      
      categoryTotals[category].value += amount;
      categoryTotals[category].count += item.quantity || 0;
    });
    
    return Object.values(categoryTotals);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  const formatCurrency = (amount) => {
    // Ensure amount is treated as a number
    const numericAmount = parseFloat(amount) || 0;
    // Only show 2 decimal places if the amount is greater than 0
    return numericAmount > 0 ? `N$${numericAmount.toFixed(2)}` : "N/A";
  };

  const handleShopChange = (shop) => {
    setSelectedShop(shop);
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Helper function to generate visually pleasing colors for products
  const getRandomColor = () => {
    const colors = [
      '#4285F4', // Google Blue
      '#EA4335', // Google Red
      '#FBBC05', // Google Yellow
      '#34A853', // Google Green
      '#5E35B1', // Deep Purple
      '#00ACC1', // Cyan
      '#FF5722', // Deep Orange
      '#43A047', // Green
      '#1E88E5', // Blue
      '#F4511E', // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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

  if (!selectedShop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.emptyStateContainer}>
          <Ionicons name="analytics-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Shops Found</Text>
          <Text style={styles.emptyText}>
            You need to create a shop before you can view analytics.
          </Text>
          <TouchableOpacity
            style={styles.createShopButton}
            onPress={() => navigation.navigate('ShopsTab', { screen: 'CreateShop' })}
          >
            <Text style={styles.createShopButtonText}>Create a Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Shop Selector (if multiple shops) */}
        {userShops.length > 1 && (
          <View style={styles.shopSelector}>
            <View style={styles.shopSelectorHeader}>
              <MaterialIcons name="storefront" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Select Shop</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shopButtonsContainer}
            >
              {userShops.map(shop => (
                <TouchableOpacity
                  key={shop.id}
                  style={[
                    styles.shopButton,
                    selectedShop.id === shop.id && styles.selectedShopButton
                  ]}
                  onPress={() => handleShopChange(shop)}
                >
                  <MaterialIcons 
                    name="store" 
                    size={16} 
                    color={selectedShop.id === shop.id ? '#fff' : '#666'} 
                    style={styles.shopButtonIcon}
                  />
                  <Text 
                    style={[
                      styles.shopButtonText,
                      selectedShop.id === shop.id && styles.selectedShopButtonText
                    ]}
                  >
                    {shop.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Key Metrics Section */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(25, 118, 210, 0.1)' }]}>
                <MaterialIcons name="attach-money" size={22} color="#1976D2" />
              </View>
              <Text style={styles.metricValue}>{formatCurrency(shopStats.totalRevenue)}</Text>
              <Text style={styles.metricLabel}>Revenue</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(56, 142, 60, 0.1)' }]}>
                <FontAwesome name="shopping-cart" size={20} color="#388E3C" />
              </View>
              <Text style={styles.metricValue}>{shopStats.totalOrders}</Text>
              <Text style={styles.metricLabel}>Orders</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(245, 124, 0, 0.1)' }]}>
                <MaterialCommunityIcons name="chart-line" size={22} color="#F57C00" />
              </View>
              <Text style={styles.metricValue}>{formatCurrency(shopStats.averageOrderValue)}</Text>
              <Text style={styles.metricLabel}>Avg. Order</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(123, 31, 162, 0.1)' }]}>
                <MaterialCommunityIcons name="percent" size={22} color="#7B1FA2" />
              </View>
              <Text style={styles.metricValue}>
                {shopStats.totalOrders > 0 
                  ? `${Math.round((shopStats.completedOrders / shopStats.totalOrders) * 100)}%` 
                  : '0%'}
              </Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(3, 169, 244, 0.1)' }]}>
                <MaterialIcons name="people" size={22} color="#03A9F4" />
              </View>
              <Text style={styles.metricValue}>{shopStats.totalCustomers || 0}</Text>
              <Text style={styles.metricLabel}>Customers</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={[styles.metricIconContainer, { backgroundColor: 'rgba(255, 87, 34, 0.1)' }]}>
                <MaterialIcons name="star" size={22} color="#FF5722" />
              </View>
              <Text style={styles.metricValue}>
                {shopStats.allTimeStats && shopStats.allTimeStats.average_rating 
                  ? parseFloat(shopStats.allTimeStats.average_rating).toFixed(1) 
                  : '0.0'}
              </Text>
              <Text style={styles.metricLabel}>Avg. Rating</Text>
            </View>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeSelector}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeButtons}>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'week' && styles.selectedTimeRangeButton
              ]}
              onPress={() => handleTimeRangeChange('week')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={timeRange === 'week' ? '#fff' : '#666'} 
                style={styles.timeRangeIcon}
              />
              <Text 
                style={[
                  styles.timeRangeButtonText,
                  timeRange === 'week' && styles.selectedTimeRangeButtonText
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'month' && styles.selectedTimeRangeButton
              ]}
              onPress={() => handleTimeRangeChange('month')}
            >
              <Ionicons 
                name="calendar" 
                size={16} 
                color={timeRange === 'month' ? '#fff' : '#666'} 
                style={styles.timeRangeIcon}
              />
              <Text 
                style={[
                  styles.timeRangeButtonText,
                  timeRange === 'month' && styles.selectedTimeRangeButtonText
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'year' && styles.selectedTimeRangeButton
              ]}
              onPress={() => handleTimeRangeChange('year')}
            >
              <MaterialIcons 
                name="date-range" 
                size={16} 
                color={timeRange === 'year' ? '#fff' : '#666'} 
                style={styles.timeRangeIcon}
              />
              <Text 
                style={[
                  styles.timeRangeButtonText,
                  timeRange === 'year' && styles.selectedTimeRangeButtonText
                ]}
              >
                Year
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Sales Trend Chart */}
        {salesData.timeSeriesData && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <MaterialCommunityIcons name="chart-line-variant" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>Sales Trend</Text>
              </View>
            </View>
            <LineChart
              data={salesData.timeSeriesData}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#4169e1',
                  fill: '#ffffff'
                },
                propsForBackgroundLines: {
                  strokeDasharray: '5, 5',
                  strokeWidth: 1,
                  stroke: '#eeeeee',
                },
                formatYLabel: (value) => `N$${parseInt(value)}`,
              }}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withShadow={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              withDots={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisLabel="N$"
              yAxisSuffix=""
              yAxisInterval={1}
              segments={5}
            />
          </View>
        )}

        {/* Order Status Distribution Chart with custom colors */}
        {salesData.orderStatusData && salesData.orderStatusData.datasets && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <MaterialCommunityIcons name="chart-bar" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>Order Status Distribution</Text>
              </View>
            </View>
            <BarChart
              data={salesData.orderStatusData}
              width={width - 40}
              height={220}
              yAxisLabel=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1, index) => {
                  const colors = [
                    `rgba(76, 175, 80, ${opacity})`, // Green for completed
                    `rgba(33, 150, 243, ${opacity})`, // Blue for pending
                    `rgba(244, 67, 54, ${opacity})`, // Red for cancelled
                    `rgba(255, 193, 7, ${opacity})`, // Amber for processing
                  ];
                  return colors[index] || colors[0];
                },
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                barPercentage: 0.7,
                propsForBackgroundLines: {
                  strokeDasharray: '6',
                  stroke: "#e3e3e3",
                }
              }}
              style={styles.chart}
              showValuesOnTopOfBars={true}
              fromZero={true}
              segments={4}
            />
            <View style={styles.barLegend}>
              {salesData.orderStatusData.labels.map((label, index) => {
                const colors = [
                  '#4CAF50', // Green for completed
                  '#2196F3', // Blue for pending
                  '#F44336', // Red for cancelled
                  '#FFC107'  // Amber for processing
                ];
                return (
                  <View key={index} style={styles.barLegendItem}>
                    <View 
                      style={[
                        styles.barColor, 
                        { backgroundColor: colors[index] }
                      ]} 
                    />
                    <Text style={styles.barLegendText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Product Sales Pie Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <MaterialCommunityIcons name="chart-pie" size={20} color={COLORS.primary} />
              <Text style={styles.chartTitle}>Top Products by Sales</Text>
            </View>
          </View>
          {salesData.productSalesData && salesData.productSalesData.length > 0 ? (
            <>
              <View style={styles.pieChartContainer}>
                <PieChart
                  data={salesData.productSalesData}
                  width={width - 40}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="value"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                  hasLegend={false}
                  center={[(width - 40) / 2, 0]}
                  style={{
                    marginTop: -20,
                    marginBottom: -20
                  }}
                />
              </View>
              <View style={styles.productLegend}>
                {salesData.productSalesData.map((product, index) => (
                  <View key={index} style={styles.productLegendItem}>
                    <View style={styles.productNameContainer}>
                      <View style={[styles.productColor, { backgroundColor: product.color }]} />
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    </View>
                    <View style={styles.productValueContainer}>
                      <Text style={styles.productValue}>
                        {product.value > 0 ? formatCurrency(product.value) : 'N/A'}
                      </Text>
                      <Text style={styles.productQuantity}>({product.quantity} sold)</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="shopping-outline" size={50} color="#E0E0E0" />
              <Text style={styles.noDataText}>No product sales data available</Text>
              <Text style={styles.noDataSubText}>Start selling to see your top products</Text>
            </View>
          )}
        </View>

        {/* Sales Heat Map */}
        {salesData.heatMapData && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>Daily Sales Heat Map</Text>
              </View>
            </View>
            <ContributionGraph
              values={salesData.heatMapData}
              endDate={new Date()}
              numDays={30}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              style={styles.chart}
              tooltipDataAttrs={(value) => ({})}
              getMonthLabel={(month) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[month];
              }}
              square={true}
              showMonthLabels={true}
              showOutOfRangeDays={true}
            />
          </View>
        )}

        {/* Enhanced Category Sales Chart */}
        {salesData.categorySales && salesData.categorySales.length > 0 && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <MaterialCommunityIcons name="chart-pie" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>Sales by Category</Text>
              </View>
            </View>
            <PieChart
              data={salesData.categorySales}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend={false}
              avoidFalseZero
              center={[0, 0]}
              style={styles.chart}
            />
            <View style={styles.categoryLegend}>
              {salesData.categorySales.map((category, index) => (
                <View key={index} style={styles.categoryLegendItem}>
                  <View style={styles.categoryNameContainer}>
                    <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <Text style={styles.categoryValue}>{formatCurrency(category.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* All-Time Stats */}
        {shopStats.allTimeStats && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>All-Time Performance</Text>
              </View>
            </View>
            <View style={styles.allTimeStats}>
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(25, 118, 210, 0.1)' }]}>
                    <MaterialIcons name="attach-money" size={16} color="#1976D2" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Total Revenue:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {formatCurrency(shopStats.allTimeStats.total_revenue)}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(56, 142, 60, 0.1)' }]}>
                    <FontAwesome name="shopping-cart" size={14} color="#388E3C" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Total Orders:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.total_orders}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(0, 137, 123, 0.1)' }]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#00897B" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Completed Orders:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.completed_orders}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(245, 124, 0, 0.1)' }]}>
                    <MaterialCommunityIcons name="cube-outline" size={16} color="#F57C00" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Total Products:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.total_products}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(3, 169, 244, 0.1)' }]}>
                    <MaterialIcons name="people" size={16} color="#03A9F4" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Total Customers:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.total_customers || 0}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                    <MaterialIcons name="category" size={16} color="#4CAF50" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Top Category:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.top_category || 'N/A'} 
                  {shopStats.allTimeStats.top_category_sales > 0 ? 
                    ` (${formatCurrency(shopStats.allTimeStats.top_category_sales)})` : ''}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                    <FontAwesome name="trophy" size={16} color="#FFC107" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Top Product:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.top_product_name || 'N/A'}
                  {shopStats.allTimeStats.top_product_sales > 0 ? 
                    ` (${formatCurrency(shopStats.allTimeStats.top_product_sales)})` : ''}
                </Text>
              </View>
              
              <View style={styles.allTimeStatRow}>
                <View style={styles.allTimeStatLabelContainer}>
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(255, 87, 34, 0.1)' }]}>
                    <MaterialIcons name="star" size={16} color="#FF5722" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Average Rating:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {shopStats.allTimeStats.average_rating ? 
                    parseFloat(shopStats.allTimeStats.average_rating).toFixed(1) : '0.0'} / 5.0
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: FONTS.semiBold
  },
  backButton: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#333',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  shopSelector: {
    marginVertical: 15,
  },
  shopButtonsContainer: {
    paddingHorizontal: 15,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginLeft: 5,
  },
  selectedShopButton: {
    backgroundColor: COLORS.accent,
  },
  shopButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.regular
  },
  selectedShopButtonText: {
    color: '#fff',
    fontFamily: FONTS.medium
  },
  timeRangeSelector: {
    marginBottom: 15,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTimeRangeButton: {
    backgroundColor: COLORS.accent,
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.regular
  },
  selectedTimeRangeButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  metricsContainer: {
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'flex-start',
    ...SHADOWS.small,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 5,
    fontFamily: FONTS.bold
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular
  },
  timeRangeIcon: {
    marginRight: 5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 8,
    fontFamily: FONTS.semiBold
  },
  legendContainer: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular
  },
  categoryLegend: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  categoryLegendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular
  },
  categoryValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold
  },
  shopSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  shopButtonIcon: {
    marginRight: 5,
  },
  allTimeStats: {
    marginTop: 10,
  },
  allTimeStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  allTimeStatLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allTimeStatIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  allTimeStatIcon: {
    marginRight: 8,
  },
  allTimeStatLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.semiBold
  },
  allTimeStatValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: FONTS.regular
  },
  barLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 8,
  },
  barColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  barLegendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  productLegend: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  productLegendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  productColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  productName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  productValueContainer: {
    alignItems: 'flex-end',
  },
  productValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  productQuantity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  pieChartContainer: {
    height: 180, 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
    padding: 0
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#9E9E9E',
    fontFamily: FONTS.medium,
    marginTop: 10,
  },
  noDataSubText: {
    fontSize: 14,
    color: '#BDBDBD',
    fontFamily: FONTS.regular,
    marginTop: 5,
  },
});

export default AnalyticsScreen; 