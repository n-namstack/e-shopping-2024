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
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userShops, setUserShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
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
      
      // Fetch stats from seller_stats for the selected shop
      const { data: statsData, error: statsError } = await supabase
        .from('seller_stats')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .single();
        
      if (statsError && statsError.code !== 'PGRST116') throw statsError;
      
      // Calculate additional metrics from orders data
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const completedOrders = ordersData.filter(order => 
        order.status === 'delivered' || order.status === 'completed'
      ).length;
      const cancelledOrders = ordersData.filter(order => order.status === 'cancelled').length;
      const averageOrderValue = ordersData.length > 0 ? totalRevenue / ordersData.length : 0;
      
      setShopStats({
        totalRevenue,
        totalOrders: ordersData.length,
        completedOrders,
        cancelledOrders,
        averageOrderValue,
        allTimeStats: statsData || null
      });
      
      // Fetch product data to get category sales
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *, 
          order:order_id(created_at, shop_id),
          product:product_id(category)
        `)
        .gte('order.created_at', startDateStr)
        .lte('order.created_at', endDateStr)
        .eq('order.shop_id', selectedShop.id);
        
      if (itemsError) throw itemsError;
      
      // Process data for category pie chart
      const categoryData = processCategoryData(orderItems);
      
      setSalesData({
        timeSeriesData: salesByDate,
        categorySales: categoryData
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error.message);
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
    return `N$${amount.toFixed(2)}`;
  };

  const handleShopChange = (shop) => {
    setSelectedShop(shop);
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
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

        {/* Sales Trend Chart */}
        {salesData.timeSeriesData && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <MaterialCommunityIcons name="chart-line-variant" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>Sales Trend</Text>
              </View>
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgba(65, 105, 225, 1)' }]} />
                  <Text style={styles.legendText}>Revenue</Text>
                </View>
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
            />
          </View>
        )}

        {/* Category Sales Chart */}
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
                  <View style={[styles.allTimeStatIconContainer, { backgroundColor: 'rgba(121, 85, 72, 0.1)' }]}>
                    <Ionicons name="time-outline" size={16} color="#795548" />
                  </View>
                  <Text style={styles.allTimeStatLabel}>Last Updated:</Text>
                </View>
                <Text style={styles.allTimeStatValue}>
                  {new Date(shopStats.allTimeStats.last_updated).toLocaleString()}
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
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
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
  },
  selectedShopButtonText: {
    color: '#fff',
    fontWeight: '500',
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
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeRangeIcon: {
    marginRight: 5,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    ...SHADOWS.small,
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
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
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
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  },
  allTimeStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default AnalyticsScreen; 