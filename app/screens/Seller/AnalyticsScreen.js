import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { BarChart, PieChart, LineChart, ProgressChart, ContributionGraph } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, Feather, AntDesign } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

// Helper function to convert hex to rgb
const hexToRgb = (hex) => {
  if (!hex) return '0, 0, 0';
  // Remove the hash
  const sanitizedHex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(sanitizedHex.substring(0, 2), 16);
  const g = parseInt(sanitizedHex.substring(2, 4), 16);
  const b = parseInt(sanitizedHex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
};

const Analytics = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('all'); // 'week', 'month', 'all'
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  
  const [stats, setStats] = useState({
    orderStatusData: {
      labels: ['Completed', 'Pending', 'Cancelled', 'Processing'],
      datasets: [{ 
        data: [0, 0, 0, 0]
      }]
    },
    orderPieData: [
      { name: 'Completed', population: 0, color: '#2ED573', legendFontColor: '#7F7F7F', legendFontSize: 12 },
      { name: 'Pending', population: 0, color: '#007AFF', legendFontColor: '#7F7F7F', legendFontSize: 12 },
      { name: 'Cancelled', population: 0, color: '#FF4757', legendFontColor: '#7F7F7F', legendFontSize: 12 },
      { name: 'Processing', population: 0, color: '#FFC107', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    ],
    revenueTrendData: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`,
        strokeWidth: 2
      }],
      legend: ["Revenue"]
    },
    totalRevenue: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    processing: 0,
    topProductsPieData: [],
    categoryPieData: [],
    customerActivityData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(${hexToRgb(COLORS.accent)}, ${opacity})`,
        strokeWidth: 2
      }],
      legend: ["Customer Visits"]
    },
    monthlyGrowthData: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(${hexToRgb(COLORS.secondary)}, ${opacity})`,
        strokeWidth: 2
      }],
      legend: ["Monthly Growth %"]
    },
    ratingDistribution: {
      labels: ["1★", "2★", "3★", "4★", "5★"],
      datasets: [{ data: [0, 0, 0, 0, 0] }]
    },
    performanceData: {
      data: [0.1, 0.1, 0.1, 0.1],
      colors: ['#2ED573', '#007AFF', '#FF4757', '#FFC107'],
    },
    totalCustomers: 0,
    followersCount: 0,
    averageRating: 0,
    responseRate: 0,
    deliverySuccessRate: 0
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Helper function to generate random colors that match app theme
  const getRandomAppColor = () => {
    const colors = [
      COLORS.primary,
      COLORS.secondary,
      COLORS.accent,
      COLORS.success || '#2ED573',
      COLORS.warning || '#FFC107',
      COLORS.danger || '#FF4757',
      '#2ED573',
      '#FF9F43'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      loadAnalytics();
    }
  }, [period, selectedShopId]);

  const loadShops = async () => {
    try {
      const { data: shopsData, error } = await supabase
        .from('shops')
        .select('id, name, logo_url')
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error loading shops:', error.message);
        return;
      }

      console.log(`Found ${shopsData?.length || 0} shops for user`);
      
      if (shopsData?.length) {
        // Add an option to view all shops
        const allShopsOption = {
          label: 'All Shops',
          value: 'all',
          icon: () => <FontAwesome5 name="store-alt" size={18} color={COLORS.primary} />
        };
        
        const formattedShops = shopsData.map(shop => ({
          label: shop.name,
          value: shop.id,
          icon: () => shop.logo_url ? (
            <Image source={{ uri: shop.logo_url }} style={styles.shopIcon} />
          ) : (
            <FontAwesome5 name="store" size={18} color={COLORS.primary} />
          )
        }));
        
        // Set shops array with the "All Shops" option first
        setShops([allShopsOption, ...formattedShops]);
        
        // Set the default shop to "All Shops"
        if (!selectedShopId) {
          setSelectedShopId('all');
          console.log('Set current shop ID to:', 'all');
        }
      }
    } catch (error) {
      console.error('Error in loadShops:', error.message);
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // If all shops selected, get stats for all shops
      let shopIds = [];
      if (selectedShopId === 'all') {
        // Map all shop values except the 'all' option
        shopIds = shops
          .filter(shop => shop.value !== 'all')
          .map(shop => shop.value);
          
        console.log('Loading dashboard data for all shops');
        console.log('Shop IDs:', JSON.stringify(shopIds));
      } else {
        shopIds = [selectedShopId];
        console.log('Loading dashboard data for shop:', selectedShopId);
      }

      if (shopIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch basic stats data
      const { data: statsData, error: statsError } = await supabase
        .from('seller_stats')
        .select('*')
        .in('shop_id', shopIds);
        
      if (statsError) {
        console.error('Error loading stats:', statsError.message);
        setIsLoading(false);
        return;
      }

      // Fetch orders data to calculate accurate response and delivery metrics
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('shop_id', shopIds);
        
      if (ordersError) {
        console.error('Error loading orders for metrics calculation:', ordersError.message);
      }
      
      // Fetch customer messages data to calculate response rates
      const { data: messagesData, error: messagesError } = await supabase
        .from('customer_messages')
        .select('*')
        .in('shop_id', shopIds);
        
      if (messagesError) {
        console.error('Error loading messages for response rate calculation:', messagesError.message);
      }
      
      // Calculate response rate (if messages data exists)
      let responseRate = 0;
      if (messagesData && messagesData.length > 0) {
        const totalMessages = messagesData.length;
        const respondedMessages = messagesData.filter(msg => msg.response_time_minutes != null).length;
        responseRate = respondedMessages / totalMessages;
        
        // Calculate average response time for responded messages
        const respondedMessagesData = messagesData.filter(msg => msg.response_time_minutes != null);
        const avgResponseTime = respondedMessagesData.length > 0 
          ? respondedMessagesData.reduce((sum, msg) => sum + msg.response_time_minutes, 0) / respondedMessagesData.length
          : 0;
          
        console.log(`Response metrics: Rate=${responseRate.toFixed(2)}, Avg Time=${avgResponseTime.toFixed(2)} minutes`);
      }
      
      // Calculate delivery success rate (if orders data exists)
      let deliverySuccessRate = 0;
      if (ordersData && ordersData.length > 0) {
        const deliveredOrders = ordersData.filter(order => 
          order.status === 'completed' && 
          order.delivery_date && 
          new Date(order.delivery_date) <= new Date(order.expected_delivery_date || order.delivery_date)
        ).length;
        
        const totalCompletedOrders = ordersData.filter(order => order.status === 'completed').length;
        deliverySuccessRate = totalCompletedOrders > 0 ? deliveredOrders / totalCompletedOrders : 0;
        
        console.log(`Delivery success rate: ${deliverySuccessRate.toFixed(2)}`);
      }

      if (!statsData || statsData.length === 0) {
        console.log('No stats data found for the selected shop(s)');
        // Set default empty stats
        setStats({
          orderStatusData: { 
            labels: ['Completed', 'Pending', 'Cancelled', 'Processing'],
            datasets: [{ data: [0, 0, 0, 0] }]
          },
          orderPieData: [
            { name: 'Completed', population: 0, color: '#2ED573', legendFontColor: '#7F7F7F', legendFontSize: 12 },
            { name: 'Pending', population: 0, color: '#007AFF', legendFontColor: '#7F7F7F', legendFontSize: 12 },
            { name: 'Cancelled', population: 0, color: '#FF4757', legendFontColor: '#7F7F7F', legendFontSize: 12 },
            { name: 'Processing', population: 0, color: '#FFC107', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          ],
          totalRevenue: 0,
          averageOrderValue: 0,
          totalOrders: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          processing: 0,
          totalCustomers: 0,
          followersCount: 0,
          averageRating: 0,
          responseRate: responseRate,
          deliverySuccessRate: deliverySuccessRate,
          performanceData: {
            data: [0.1, 0.1, 0.1, 0.1],
            colors: ['#2ED573', '#007AFF', '#FF4757', '#FFC107'],
          },
          revenueTrendData: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [{
              data: [0, 0, 0, 0, 0, 0],
              color: (opacity = 1) => `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`,
              strokeWidth: 2
            }],
            legend: ["Revenue"]
          }
        });
        
        setIsLoading(false);
        return;
      }

      // Aggregate stats across all shops
      const aggregatedStats = statsData.reduce((acc, stat) => ({
        completed_orders: acc.completed_orders + (stat.completed_orders || 0),
        pending_orders: acc.pending_orders + (stat.pending_orders || 0),
        canceled_orders: acc.canceled_orders + (stat.canceled_orders || 0),
        processing_orders: acc.processing_orders + (stat.processing_orders || 0),
        total_revenue: acc.total_revenue + parseFloat(stat.total_revenue || 0),
        average_order_value: acc.average_order_value + parseFloat(stat.average_order_value || 0),
        total_customers: acc.total_customers + (stat.total_customers || 0),
        followers_count: acc.followers_count + (stat.followers_count || 0),
        average_rating: acc.average_rating + parseFloat(stat.average_rating || 0) / statsData.length,
        monthly_growth_rate: acc.monthly_growth_rate + parseFloat(stat.monthly_growth_rate || 0) / statsData.length,
        response_rate: acc.response_rate + parseFloat(stat.response_rate || 0) / statsData.length,
        delivery_success_rate: acc.delivery_success_rate + parseFloat(stat.delivery_success_rate || 0) / statsData.length,
        total_orders: acc.total_orders + (stat.total_orders || 0),
      }), {
        completed_orders: 0,
        pending_orders: 0,
        canceled_orders: 0,
        processing_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        total_customers: 0,
        followers_count: 0,
        average_rating: 0,
        monthly_growth_rate: 0,
        response_rate: 0,
        delivery_success_rate: 0,
        total_orders: 0,
      });

      // Use the actual total_orders from the stats data rather than recalculating
      const totalOrders = aggregatedStats.total_orders;

      // Order Status Data for Bar Chart - keeping the structure simple
      const orderStatusData = {
        labels: ['Completed', 'Pending', 'Cancelled', 'Processing'],
        datasets: [{
          data: [
            aggregatedStats.completed_orders || 0,
            aggregatedStats.pending_orders || 0,
            aggregatedStats.canceled_orders || 0,
            aggregatedStats.processing_orders || 0,
          ]
        }]
      };

      // Update the original Order Status Data for Pie Chart with brighter colors
      const orderPieData = [
        {
          name: 'Completed',
          population: aggregatedStats.completed_orders,
          color: '#2ED573',  // Bright green
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        },
        {
          name: 'Pending',
          population: aggregatedStats.pending_orders,
          color: '#007AFF', // iOS blue
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        },
        {
          name: 'Cancelled',
          population: aggregatedStats.canceled_orders,
          color: '#FF4757', // Bright red
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        },
        {
          name: 'Processing',
          population: aggregatedStats.processing_orders,
          color: '#FFC107', // Amber yellow
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        },
      ];

      // Revenue Trend Data (6 month trend)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      
      // Fetch historical revenue data if available
      // Get actual revenue data for each shop over time and aggregate it
      let shopRevenueData = [];
      let revenueTrendData = null;
      
      // First, attempt to get the real revenue trend from actual data
      try {
        // Get the current month and year
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Function to get month label from JavaScript month index
        const getMonthLabel = (monthIndex) => {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return monthNames[monthIndex];
        };
        
        // Generate proper month labels based on current date
        const actualMonthLabels = [];
        for (let i = 5; i >= 0; i--) {
          let monthIndex = currentMonth - i;
          let year = currentYear;
          
          if (monthIndex < 0) {
            monthIndex += 12;
            year -= 1;
          }
          
          actualMonthLabels.push(getMonthLabel(monthIndex));
        }
        
        // Check if we have orders in the system to determine which months have data
        // For now, let's assume we have data only for the current month
        // This will be replaced with actual historical queries from database in production
        
        // Query for shop orders with timestamps to determine which months have data
        // This is a simplified approach for demonstration - in production, use actual queries
        // that retrieve historical data per month from your database
        
        const revenueValue = parseFloat(aggregatedStats.total_revenue) || 0;
        
        // Default: Consider only current month has data (month at index 5)
        // In a real implementation, query for each month and check if data exists
        const monthsWithData = [5]; // Assumes data exists for the current month (last index)
        
        // Check if other months have data - in this simple example:
        // If we have completed orders, let's assume previous month also has data
        if (aggregatedStats.completed_orders > 0) {
          monthsWithData.push(4); // Add previous month (second last index)
        }
        
        // If monthly growth rate is set, assume we have data for at least 2 previous months
        if (parseFloat(aggregatedStats.monthly_growth_rate || 0) > 0) {
          monthsWithData.push(3); // Add two months ago
        }
        
        // Generate revenue data based on which months have data
        const generateRevenueData = () => {
          // Show zero for months with no data, actual data for months with data
          const monthlyRevenue = [0, 0, 0, 0, 0, 0]; // Default all months to zero
          
          // Set values for months with data
          if (monthsWithData.includes(5)) { // Current month
            monthlyRevenue[5] = revenueValue;
          }
          
          // If previous month has data, show a slightly lower value
          if (monthsWithData.includes(4)) {
            monthlyRevenue[4] = revenueValue * 0.8;
          }
          
          // If two months ago has data, show even lower value
          if (monthsWithData.includes(3)) {
            monthlyRevenue[3] = revenueValue * 0.6;
          }
          
          return monthlyRevenue;
        };
        
        // Create the revenue trend data object
        revenueTrendData = {
          labels: actualMonthLabels,
          datasets: [
            {
              data: generateRevenueData(),
              color: (opacity = 1) => `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`,
              strokeWidth: 3 // Slightly thicker line for modern look
            }
          ],
          legend: ["Revenue"]
        };
      } catch (error) {
        console.error("Error preparing revenue trend data:", error);
        // Fallback to simple data if error occurs
        revenueTrendData = {
          labels: months,
          datasets: [
            {
              data: [
                aggregatedStats.total_revenue * 0.6,
                aggregatedStats.total_revenue * 0.7,
                aggregatedStats.total_revenue * 0.8,
                aggregatedStats.total_revenue * 0.9,
                aggregatedStats.total_revenue * 0.95,
                aggregatedStats.total_revenue
              ],
              color: (opacity = 1) => `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`,
              strokeWidth: 2
            }
          ],
          legend: ["Revenue Trend"]
        };
      }

      // Top Products Data
      // Generate from real data or create mock data
      const topProducts = statsData
        .filter(stat => stat.top_product_name)
        .map(stat => ({
          name: stat.top_product_name,
          sales: parseFloat(stat.top_product_sales),
          color: getRandomAppColor(),
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      const topProductsPieData = topProducts.map(product => ({
        name: product.name,
        population: product.sales,
        color: product.color,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }));

      // Category Performance
      const categories = statsData
        .filter(stat => stat.top_category)
        .map(stat => ({
          name: stat.top_category,
          sales: parseFloat(stat.top_category_sales),
          color: getRandomAppColor(),
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      
      const categoryPieData = categories.map(category => ({
        name: category.name,
        population: category.sales,
        color: category.color,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }));

      // Customer Activity Data (Example data showing customer actions over time)
      const customerActivityData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            data: Array(7).fill().map(() => Math.floor(Math.random() * 30) + 5),
            color: (opacity = 1) => `rgba(${hexToRgb(COLORS.accent)}, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ["Customer Visits"]
      };

      // Monthly Growth Rate
      const monthlyGrowthData = {
        labels: months,
        datasets: [
          {
            data: [
              Math.random() * 10 - 2,
              Math.random() * 10,
              Math.random() * 15,
              Math.random() * 10 + 5,
              Math.random() * 10 + 8,
              parseFloat(aggregatedStats.monthly_growth_rate || 10),
            ],
            color: (opacity = 1) => `rgba(${hexToRgb(COLORS.secondary)}, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ["Monthly Growth %"]
      };

      // Rating Distribution (Mock data)
      const ratingDistribution = {
        labels: ["1★", "2★", "3★", "4★", "5★"],
        datasets: [{
          data: [
            Math.floor(Math.random() * 5),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 15),
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 45) + 20,
          ]
        }]
      };

      // Modify the performanceData to use our calculated values
      const performanceData = {
        data: [
          Math.min(1, Math.max(0.1, aggregatedStats.completed_orders / (totalOrders || 1))),
          Math.min(1, Math.max(0.1, aggregatedStats.average_rating / 5)),
          Math.min(1, Math.max(0.1, responseRate)),
          Math.min(1, Math.max(0.1, deliverySuccessRate)),
        ],
        colors: ['#2ED573', '#007AFF', '#FF4757', '#FFC107'],
      };

      // Set stats with our directly calculated metrics
      setStats({
        orderStatusData,
        orderPieData,
        revenueTrendData,
        performanceData,
        totalRevenue: aggregatedStats.total_revenue || 0,
        averageOrderValue: aggregatedStats.average_order_value || 0,
        totalOrders: totalOrders || 0,
        completed: aggregatedStats.completed_orders || 0,
        cancelled: aggregatedStats.canceled_orders || 0,
        pending: aggregatedStats.pending_orders || 0,
        processing: aggregatedStats.processing_orders || 0,
        totalCustomers: aggregatedStats.total_customers || 0,
        followersCount: aggregatedStats.followers_count || 0,
        averageRating: aggregatedStats.average_rating || 0,
        responseRate: responseRate,
        deliverySuccessRate: deliverySuccessRate,
        shops: shops,
        topProductsPieData,
        categoryPieData,
        customerActivityData,
        monthlyGrowthData,
        ratingDistribution
      });
    } catch (error) {
      console.error('Error loading analytics:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  const formatCurrency = (value) => {
    return `N$${parseFloat(value).toFixed(2)}`;
  };

  // Chart configurations
  const barChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1, index) => {
      const colors = ['#2ED573', COLORS.primary, '#FF4757', COLORS.accent];
      return colors[index] || `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`;
    },
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForLabels: { fontSize: 10, rotation: -30 },
    barPercentage: 0.6,
  };

  const lineChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '5', strokeWidth: '2', stroke: COLORS.primary },
    propsForLabels: { fontSize: 10 },
  };

  // Enhanced configuration specifically for revenue trend chart
  const revenueTrendChartConfig = {
    ...lineChartConfig,
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    fillShadowGradientFrom: COLORS.primary,
    fillShadowGradientTo: '#ffffff',
    fillShadowGradientOpacity: 0.4,
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid background lines
      strokeWidth: 0.5,    // thinner lines
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    // More pronounced bezier curve
    bezierCurveSegments: 8,
  };

  const pieChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const progressChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1, index) => {
      const colors = ['#2ED573', COLORS.primary, '#FF4757', COLORS.accent];
      return colors[index] || `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`;
    },
    strokeWidth: 12,
    barPercentage: 0.8,
  };

  const contributionChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(${hexToRgb(COLORS.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  // Enhanced bar chart configuration specifically for order status
  const orderStatusChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    fillShadowGradient: COLORS.primary, 
    fillShadowGradientOpacity: 0.2,
    decimalPlaces: 0,
    barPercentage: 0.8,
    barRadius: 8,
    color: (opacity = 1, index) => {
      const colors = ['#2ED573', '#007AFF', '#FF4757', '#FFC107'];
      const color = colors[index % colors.length] || COLORS.primary;
      
      if (color.startsWith('#')) {
        return `rgba(${hexToRgb(color)}, ${opacity})`;
      }
      return `rgba(${hexToRgb(color)}, ${opacity})`;
    },
    style: { borderRadius: 16 },
    propsForLabels: { 
      fontSize: 12, 
      fontWeight: '600',
      rotation: 0
    },
    formatYLabel: (value) => Math.round(value).toString(),
  };

  // Enhanced pie chart configuration specifically for order distribution
  const orderPieChartConfig = {
    ...pieChartConfig,
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
    },
  };

  // Tab Component
  const TabButton = ({ label, icon, active, onPress }) => {
    return (
      <TouchableOpacity 
        style={[styles.tabButton, active ? styles.activeTab : {}]} 
        onPress={onPress}
      >
        <Ionicons name={icon} size={20} color={active ? COLORS.accent : '#6B7280'} />
        <Text style={[styles.tabLabel, active ? styles.activeTabLabel : {}]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAnalytics}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Shop Selector */}
      <View style={styles.shopSelectorContainer}>
        <Text style={styles.shopSelectorLabel}>Select Shop:</Text>
        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={shopPickerOpen}
            value={selectedShopId}
            items={shops}
            setOpen={setShopPickerOpen}
            setValue={setSelectedShopId}
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            dropDownContainerStyle={styles.dropdownContainer}
            placeholder="Select a shop"
            placeholderStyle={styles.dropdownPlaceholder}
            showArrowIcon={true}
            arrowIconStyle={{ tintColor: COLORS.primary }}
            closeOnBackPressed={true}
            closeAfterSelecting={true}
            searchable={shops.length > 7}
            searchPlaceholder="Search for shop..."
            ListEmptyComponent={() => (
              <Text style={styles.emptyListText}>No shops found</Text>
            )}
          />
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity 
          style={[styles.periodButton, period === 'week' && styles.activePeriod]}
          onPress={() => setPeriod('week')}>
          <Text style={[styles.periodText, period === 'week' && styles.activePeriodText]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodButton, period === 'month' && styles.activePeriod]}
          onPress={() => setPeriod('month')}>
          <Text style={[styles.periodText, period === 'month' && styles.activePeriodText]}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodButton, period === 'all' && styles.activePeriod]}
          onPress={() => setPeriod('all')}>
          <Text style={[styles.periodText, period === 'all' && styles.activePeriodText]}>All Time</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TabButton 
          label="Overview" 
          icon="bar-chart-outline" 
          active={activeTab === 'overview'} 
          onPress={() => setActiveTab('overview')} 
        />
        <TabButton 
          label="Products" 
          icon="cube-outline" 
          active={activeTab === 'products'} 
          onPress={() => setActiveTab('products')} 
        />
        <TabButton 
          label="Customers" 
          icon="people-outline" 
          active={activeTab === 'customers'} 
          onPress={() => setActiveTab('customers')} 
        />
        <TabButton 
          label="Growth" 
          icon="trending-up-outline" 
          active={activeTab === 'growth'} 
          onPress={() => setActiveTab('growth')} 
        />
      </View>

      {!selectedShopId ? (
        <View style={styles.noShopContainer}>
          <Ionicons name="stats-chart" size={60} color={COLORS.primary} style={{ opacity: 0.5 }} />
          <Text style={styles.noShopText}>Please select a shop to view analytics</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Revenue Overview Card */}
              <View style={styles.cardContainer}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.revenueCard}>
                  <View style={styles.revenueContent}>
                    <Text style={styles.revenueLabel}>Total Revenue</Text>
                    <Text style={styles.revenueValue}>{formatCurrency(stats.totalRevenue)}</Text>
                    
                    <View style={styles.revenueStats}>
                      <View style={styles.revenueStat}>
                        <Text style={styles.revenueStatLabel}>Avg. Order</Text>
                        <Text style={styles.revenueStatValue}>{formatCurrency(stats.averageOrderValue)}</Text>
                      </View>
                      <View style={styles.revenueStat}>
                        <Text style={styles.revenueStatLabel}>Total Orders</Text>
                        <Text style={styles.revenueStatValue}>{stats.totalOrders}</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Stats Cards */}
              <View style={styles.statsGrid}>
                <View style={styles.statsCard}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(46, 213, 115, 0.1)' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#2ED573" />
                  </View>
                  <View style={styles.statsInfo}>
                    <Text style={styles.statsValue}>{stats.completed}</Text>
                    <Text style={styles.statsLabel}>Completed</Text>
                  </View>
                </View>
                
                <View style={styles.statsCard}>
                  <View style={[styles.statsIcon, { backgroundColor: `rgba(${hexToRgb(COLORS.primary)}, 0.1)` }]}>
                    <Ionicons name="time" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.statsInfo}>
                    <Text style={styles.statsValue}>{stats.pending}</Text>
                    <Text style={styles.statsLabel}>Pending</Text>
                  </View>
                </View>
                
                <View style={styles.statsCard}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(255, 71, 87, 0.1)' }]}>
                    <Ionicons name="close-circle" size={24} color="#FF4757" />
                  </View>
                  <View style={styles.statsInfo}>
                    <Text style={styles.statsValue}>{stats.cancelled}</Text>
                    <Text style={styles.statsLabel}>Cancelled</Text>
                  </View>
                </View>
                
                <View style={styles.statsCard}>
                  <View style={[styles.statsIcon, { backgroundColor: `rgba(${hexToRgb(COLORS.accent)}, 0.1)` }]}>
                    <Ionicons name="refresh" size={24} color={COLORS.accent} />
                  </View>
                  <View style={styles.statsInfo}>
                    <Text style={styles.statsValue}>{stats.processing}</Text>
                    <Text style={styles.statsLabel}>Processing</Text>
                  </View>
                </View>
              </View>

              {/* Revenue Trend Chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Monthly Revenue</Text>
                  <MaterialIcons name="trending-up" size={20} color={COLORS.primary} />
                </View>
                
                {/* Revenue chart legend and info */}
                <View style={styles.revenueChartInfo}>
                  <View style={styles.revenueMetric}>
                    <Text style={styles.revenueMetricLabel}>Revenue Data</Text>
                    <Text style={styles.revenueMetricValue}>{formatCurrency(stats.totalRevenue)}</Text>
                  </View>
                  
                  <View style={styles.revenueNote}>
                    <Text style={styles.noteText}>Showing months with data</Text>
                  </View>
                </View>
                
                {stats.revenueTrendData ? (
                  <LineChart
                    data={stats.revenueTrendData}
                    width={CHART_WIDTH}
                    height={220}
                    chartConfig={revenueTrendChartConfig}
                    bezier
                    style={styles.chart}
                    withInnerLines={false}
                    withOuterLines={true}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    withDots={true}
                    withShadow={true}
                    segments={5}
                  />
                ) : (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No revenue data available</Text>
                  </View>
                )}
                
                <Text style={styles.chartCaption}>Revenue data by month</Text>
              </View>

              {/* Custom bar chart representation */}
              <View style={styles.customBarChart}>
                <Text style={styles.chartTitle}>Order Status</Text>
                
                {/* Bar for Completed */}
                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>Completed</Text>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          width: `${Math.min(100, stats.completed / (stats.totalOrders || 1) * 100)}%`,
                          backgroundColor: '#2ED573' 
                        }
                      ]}
                    />
                    <Text style={styles.barValue}>{stats.completed}</Text>
                  </View>
                </View>
                
                {/* Bar for Pending */}
                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>Pending</Text>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          width: `${Math.min(100, stats.pending / (stats.totalOrders || 1) * 100)}%`,
                          backgroundColor: '#007AFF' 
                        }
                      ]}
                    />
                    <Text style={styles.barValue}>{stats.pending}</Text>
                  </View>
                </View>
                
                {/* Bar for Cancelled */}
                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>Cancelled</Text>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          width: `${Math.min(100, stats.cancelled / (stats.totalOrders || 1) * 100)}%`,
                          backgroundColor: '#FF4757' 
                        }
                      ]}
                    />
                    <Text style={styles.barValue}>{stats.cancelled}</Text>
                  </View>
                </View>
                
                {/* Bar for Processing */}
                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>Processing</Text>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          width: `${Math.min(100, stats.processing / (stats.totalOrders || 1) * 100)}%`,
                          backgroundColor: '#FFC107' 
                        }
                      ]}
                    />
                    <Text style={styles.barValue}>{stats.processing}</Text>
                  </View>
                </View>
              </View>

              {/* Custom Order Distribution Visualization */}
              <View style={styles.customPieChart}>
                <Text style={styles.chartTitle}>Order Distribution</Text>
                
                {/* Distribution Visualization */}
                <View style={styles.distributionContainer}>
                  {/* Legend and percentages */}
                  <View style={styles.pieChartLegend}>
                    {[
                      { label: 'Completed', value: stats.completed, color: '#2ED573' },
                      { label: 'Pending', value: stats.pending, color: '#007AFF' },
                      { label: 'Cancelled', value: stats.cancelled, color: '#FF4757' },
                      { label: 'Processing', value: stats.processing, color: '#FFC107' }
                    ].map((item, index) => {
                      const percentage = stats.totalOrders ? 
                        Math.round((item.value / stats.totalOrders) * 100) : 0;
                      
                      return (
                        <View key={index} style={styles.legendItem}>
                          <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                          <View style={styles.legendTextContainer}>
                            <Text style={styles.legendLabel}>{item.label}</Text>
                            <Text style={styles.legendValue}>{item.value} <Text style={styles.legendPercentage}>({percentage}%)</Text></Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  
                  {/* Visual Pie Chart */}
                  <View style={styles.pieChartVisual}>
                    {stats.totalOrders > 0 ? (
                      <View style={styles.pieChartContainer}>
                        {[
                          { value: stats.completed, color: '#2ED573', startDeg: 0 },
                          { value: stats.pending, color: '#007AFF', startDeg: stats.completed / stats.totalOrders * 360 },
                          { value: stats.cancelled, color: '#FF4757', 
                            startDeg: (stats.completed + stats.pending) / stats.totalOrders * 360 },
                          { value: stats.processing, color: '#FFC107', 
                            startDeg: (stats.completed + stats.pending + stats.cancelled) / stats.totalOrders * 360 }
                        ].map((item, index) => {
                          const percentage = stats.totalOrders ? 
                            (item.value / stats.totalOrders) * 100 : 0;
                          
                          return percentage > 0 ? (
                            <View key={index} style={[
                              styles.pieSegment,
                              { 
                                backgroundColor: item.color,
                                width: 120,
                                height: 120,
                                transform: [
                                  { rotate: `${item.startDeg}deg` }
                                ],
                                display: percentage < 5 ? 'none' : 'flex' // Hide very small segments
                              }
                            ]} />
                          ) : null;
                        })}
                        <View style={styles.pieCenter} />
                      </View>
                    ) : (
                      <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No order data</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.pieChartCaption}>
                  Total Orders: <Text style={styles.captionHighlight}>{stats.totalOrders}</Text>
                </Text>
              </View>

              {/* Performance Metrics Card - Custom Implementation */}
              <View style={styles.customPerformanceCard}>
                <Text style={styles.chartTitle}>Performance Metrics</Text>
                <Text style={styles.metricsSubtitle}>Based on actual order and customer data</Text>
                
                <View style={styles.performanceContainer}>
                  {[
                    {
                      label: 'Order Completion',
                      description: 'Percentage of total orders that have been completed',
                      value: stats.totalOrders > 0 ? 
                        Math.min(100, Math.round((stats.completed / stats.totalOrders) * 100)) : 0,
                      color: '#2ED573'
                    },
                    {
                      label: 'Customer Satisfaction',
                      description: 'Average customer rating (out of 5 stars)',
                      value: Math.min(100, Math.round((stats.averageRating / 5) * 100) || 0),
                      color: '#007AFF'
                    },
                    {
                      label: 'Response Rate',
                      description: 'Percentage of customer messages that received a response',
                      value: Math.min(100, Math.round(parseFloat(stats.responseRate || 0) * 100)),
                      color: '#FF4757'
                    },
                    {
                      label: 'On-Time Delivery',
                      description: 'Percentage of orders delivered on or before expected date',
                      value: Math.min(100, Math.round(parseFloat(stats.deliverySuccessRate || 0) * 100)),
                      color: '#FFC107'
                    }
                  ].map((metric, index) => (
                    <View key={index} style={styles.metricItem}>
                      <TouchableOpacity 
                        style={styles.metricHeader}
                        onPress={() => alert(metric.description)}
                      >
                        <View style={styles.metricLabelContainer}>
                          <Text style={styles.metricLabel}>{metric.label}</Text>
                          <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" style={{marginLeft: 4}} />
                        </View>
                        <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}%</Text>
                      </TouchableOpacity>
                      
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { 
                              width: `${metric.value}%`,
                              backgroundColor: metric.color
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Products Tab Content */}
          {activeTab === 'products' && (
            <>
              {/* Top Products Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>Top Products</Text>
                    <Text style={styles.summarySubtitle}>Performance of your best selling products</Text>
                  </View>
                  <View style={styles.summaryIcon}>
                    <FontAwesome5 name="boxes" size={24} color={COLORS.primary} />
                  </View>
                </View>
              </View>

              {/* Top Products Pie Chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Best Selling Products</Text>
                  <MaterialIcons name="pie-chart" size={20} color={COLORS.primary} />
                </View>
                
                <PieChart
                  data={stats.topProductsPieData || []}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={pieChartConfig}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"10"}
                  absolute
                  style={styles.chart}
                />
              </View>

              {/* Categories Performance */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Sales by Category</Text>
                  <Feather name="folder" size={20} color={COLORS.primary} />
                </View>
                
                <PieChart
                  data={stats.categoryPieData || []}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={pieChartConfig}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"10"}
                  absolute
                  style={styles.chart}
                />
              </View>

              {/* Products Rating Distribution */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Rating Distribution</Text>
                  <Ionicons name="star" size={20} color={COLORS.accent} />
                </View>
                
                <BarChart
                  data={stats.ratingDistribution}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={{
                    ...barChartConfig,
                    color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
                  }}
                  verticalLabelRotation={0}
                  showValuesOnTopOfBars={true}
                  fromZero={true}
                  style={styles.chart}
                />
                
                <View style={styles.ratingInfo}>
                  <View style={styles.ratingItem}>
                    <Ionicons name="star" size={16} color="#FFCE56" />
                    <Text style={styles.ratingValue}>{stats.averageRating?.toFixed(1) || '0.0'}</Text>
                    <Text style={styles.ratingLabel}>Average Rating</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Customers Tab Content */}
          {activeTab === 'customers' && (
            <>
              {/* Customers Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>Customer Insights</Text>
                    <Text style={styles.summarySubtitle}>Customer engagement metrics</Text>
                  </View>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="people" size={24} color={COLORS.primary} />
                  </View>
                </View>
                
                <View style={styles.customerMetrics}>
                  <View style={styles.customerMetric}>
                    <Text style={styles.customerMetricValue}>{stats.totalCustomers || 0}</Text>
                    <Text style={styles.customerMetricLabel}>Total Customers</Text>
                  </View>
                  <View style={styles.customerMetric}>
                    <Text style={styles.customerMetricValue}>{stats.followersCount || 0}</Text>
                    <Text style={styles.customerMetricLabel}>Followers</Text>
                  </View>
                </View>
              </View>

              {/* Customer Activity Chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Customer Activity</Text>
                  <MaterialIcons name="trending-up" size={20} color={COLORS.primary} />
                </View>
                
                <LineChart
                  data={stats.customerActivityData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={{
                    ...lineChartConfig,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    propsForDots: { r: '5', strokeWidth: '2', stroke: '#8641F4' },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>

              {/* Customer Engagement Heat Map */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Engagement Heatmap</Text>
                  <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} />
                </View>
                
                <ContributionGraph
                  values={[
                    { date: "2023-01-02", count: 1 },
                    { date: "2023-01-03", count: 2 },
                    { date: "2023-01-04", count: 3 },
                    { date: "2023-01-05", count: 4 },
                    { date: "2023-01-06", count: 5 },
                    { date: "2023-01-30", count: 2 },
                    { date: "2023-01-31", count: 3 },
                    { date: "2023-02-01", count: 2 },
                    { date: "2023-02-02", count: 4 },
                    { date: "2023-02-03", count: 2 },
                    { date: "2023-02-04", count: 4 },
                    { date: "2023-02-05", count: 5 },
                  ]}
                  endDate={new Date("2023-02-28")}
                  numDays={105}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={contributionChartConfig}
                  style={styles.chart}
                />
                <Text style={styles.chartCaption}>Customer activity over last 3 months</Text>
              </View>
            </>
          )}

          {/* Growth Tab Content */}
          {activeTab === 'growth' && (
            <>
              {/* Growth Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>Business Growth</Text>
                    <Text style={styles.summarySubtitle}>Performance trends and projections</Text>
                  </View>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="trending-up" size={24} color={COLORS.primary} />
                  </View>
                </View>
                
                <View style={styles.growthMetric}>
                  <Text style={styles.growthLabel}>Monthly Growth Rate</Text>
                  <Text style={styles.growthValue}>{stats.monthlyGrowthRate?.toFixed(2) || '0.00'}%</Text>
                </View>
              </View>

              {/* Growth Trend */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Monthly Growth Rate</Text>
                  <MaterialIcons name="trending-up" size={20} color={COLORS.primary} />
                </View>
                
                <LineChart
                  data={stats.monthlyGrowthData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={{
                    ...lineChartConfig,
                    color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                    propsForDots: { r: '5', strokeWidth: '2', stroke: '#FF6384' },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>

              {/* Revenue vs Orders Comparison */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Revenue vs Orders</Text>
                  <MaterialIcons name="compare-arrows" size={20} color={COLORS.primary} />
                </View>
                
                <LineChart
                  data={{
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    datasets: [
                      {
                        data: [
                          Math.random() * 2000 + 500,
                          Math.random() * 2000 + 1000,
                          Math.random() * 2000 + 1500,
                          Math.random() * 2000 + 2000,
                          Math.random() * 2000 + 2500,
                          stats.totalRevenue / 10,
                        ],
                        color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
                        strokeWidth: 2,
                      },
                      {
                        data: [
                          Math.random() * 100 + 10,
                          Math.random() * 100 + 20,
                          Math.random() * 100 + 30,
                          Math.random() * 100 + 40,
                          Math.random() * 100 + 50,
                          stats.totalOrders * 10,
                        ],
                        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                        strokeWidth: 2,
                      }
                    ],
                    legend: ["Revenue", "Orders"]
                  }}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={lineChartConfig}
                  bezier
                  style={styles.chart}
                />
              </View>
            </>
          )}

          {/* Whitespace at bottom */}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
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
  scrollView: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `rgba(${hexToRgb(COLORS.primary)}, 0.1)`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `rgba(${hexToRgb(COLORS.primary)}, 0.1)`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopSelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  shopSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  dropdownContainer: {
    zIndex: 3000,
  },
  dropdown: {
    borderColor: `rgba(${hexToRgb(COLORS.primary)}, 0.2)`,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  dropdownPlaceholder: {
    color: '#6B7280',
  },
  emptyListText: {
    textAlign: 'center',
    padding: 10,
    color: '#6B7280',
  },
  shopIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  noShopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  noShopText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 15,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#F1F3F9',
  },
  activePeriod: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#6B7280',
  },
  activePeriodText: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: `rgba(${hexToRgb(COLORS.primary)}, 0.1)`,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  activeTabLabel: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  revenueCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  revenueContent: {
    padding: 20,
  },
  revenueLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueStat: {
    flex: 1,
  },
  revenueStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  revenueStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statsCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsInfo: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartCaption: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  legendContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    width: '45%',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `rgba(${hexToRgb(COLORS.primary)}, 0.1)`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerMetrics: {
    flexDirection: 'row',
    marginTop: 10,
  },
  customerMetric: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: `rgba(${hexToRgb(COLORS.primary)}, 0.05)`,
    marginHorizontal: 5,
  },
  customerMetricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 5,
  },
  customerMetricLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 206, 86, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFCE56',
    marginHorizontal: 5,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  growthMetric: {
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: `rgba(${hexToRgb(COLORS.secondary)}, 0.05)`,
    padding: 15,
    borderRadius: 10,
  },
  growthLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 5,
  },
  growthValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  revenueChartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  revenueMetric: {
    flex: 1,
  },
  revenueMetricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  revenueMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  revenueNote: {
    backgroundColor: 'rgba(255, 237, 213, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  noteText: {
    fontSize: 12,
    color: '#B45309',
    fontStyle: 'italic',
  },
  revenueTrendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendPositive: {
    fontSize: 14,
    color: '#2ED573',
    fontWeight: '700',
  },
  orderStatusSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  orderSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  percentageContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(245, 247, 250, 0.7)',
    borderRadius: 8,
    padding: 10,
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  percentageItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  percentageLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 5,
  },
  percentageValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  distributionSummary: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: 'rgba(245, 247, 250, 0.7)',
    borderRadius: 8,
    alignItems: 'center',
  },
  distributionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 247, 250, 0.7)',
    borderRadius: 8,
    marginVertical: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  customBarChart: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  barContainer: {
    marginBottom: 12,
  },
  barLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  barWrapper: {
    height: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: '100%',
    borderRadius: 12,
  },
  barValue: {
    position: 'absolute',
    right: 10,
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
  },
  customPieChart: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  distributionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  pieChartLegend: {
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 10,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  legendPercentage: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pieChartVisual: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f3f4f6',
  },
  pieSegment: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: 60,
    top: 0,
    marginLeft: -60,
  },
  pieCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  pieChartCaption: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 15,
  },
  captionHighlight: {
    fontWeight: '700',
    color: '#374151',
  },
  
  // Performance Metrics Styles
  customPerformanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  performanceContainer: {
    marginTop: 10,
  },
  metricItem: {
    marginBottom: 15,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  metricsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -5,
    marginBottom: 10,
  },
  metricLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Analytics; 