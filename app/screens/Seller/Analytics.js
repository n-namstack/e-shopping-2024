import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const Analytics = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    orderStats: {
      completed: 0,
      pending: 0,
      cancelled: 0,
      processing: 0,
    },
    revenueData: [],
    topProducts: [],
    topCategories: [],
  });
  const [userShops, setUserShops] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week'); // week, month, year

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const { data: shops, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;

      if (shops && shops.length > 0) {
        setUserShops(shops);
        loadAnalytics(shops.map(shop => shop.id));
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading shops:', error.message);
      setIsLoading(false);
    }
  };

  const loadAnalytics = async (shopIds) => {
    try {
      const { data: statsData, error } = await supabase
        .from('seller_stats')
        .select('*')
        .in('shop_id', shopIds);

      if (error) throw error;

      if (statsData) {
        const orderStats = statsData.reduce((acc, stat) => ({
          completed: acc.completed + (stat.completed_orders || 0),
          pending: acc.pending + (stat.pending_orders || 0),
          cancelled: acc.cancelled + (stat.canceled_orders || 0),
          processing: acc.processing + (stat.processing_orders || 0),
        }), { completed: 0, pending: 0, cancelled: 0, processing: 0 });

        setStats({
          orderStats,
          revenueData: statsData.map(stat => ({
            revenue: stat.total_revenue || 0,
            shop: stat.shop_id,
          })),
          topProducts: statsData
            .filter(stat => stat.top_product_name)
            .map(stat => ({
              name: stat.top_product_name,
              sales: stat.top_product_sales || 0,
            })),
          topCategories: statsData
            .filter(stat => stat.top_category)
            .map(stat => ({
              name: stat.top_category,
              sales: stat.top_category_sales || 0,
            })),
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error.message);
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(94, 109, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.accent,
    },
  };

  const orderData = {
    labels: ['Completed', 'Pending', 'Cancelled', 'Processing'],
    datasets: [
      {
        data: [
          stats.orderStats.completed,
          stats.orderStats.pending,
          stats.orderStats.cancelled,
          stats.orderStats.processing,
        ],
      },
    ],
  };

  const pieData = [
    {
      name: 'Completed',
      population: stats.orderStats.completed,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Pending',
      population: stats.orderStats.pending,
      color: '#2196F3',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Cancelled',
      population: stats.orderStats.cancelled,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Processing',
      population: stats.orderStats.processing,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.timeframeButtons}>
            <TouchableOpacity
              style={[
                styles.timeframeButton,
                selectedTimeframe === 'week' && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe('week')}
            >
              <Text
                style={[
                  styles.timeframeButtonText,
                  selectedTimeframe === 'week' && styles.timeframeButtonTextActive,
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeframeButton,
                selectedTimeframe === 'month' && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe('month')}
            >
              <Text
                style={[
                  styles.timeframeButtonText,
                  selectedTimeframe === 'month' && styles.timeframeButtonTextActive,
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeframeButton,
                selectedTimeframe === 'year' && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe('year')}
            >
              <Text
                style={[
                  styles.timeframeButtonText,
                  selectedTimeframe === 'year' && styles.timeframeButtonTextActive,
                ]}
              >
                Year
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Order Status Distribution</Text>
          <BarChart
            data={orderData}
            width={width - 32}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            fromZero={true}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Order Distribution</Text>
          <PieChart
            data={pieData}
            width={width - 32}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>

        <View style={styles.statsGrid}>
          {stats.topProducts.map((product, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statTitle}>{product.name}</Text>
              <Text style={styles.statValue}>{product.sales} sales</Text>
            </View>
          ))}
        </View>
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
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 15,
  },
  timeframeButtons: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  timeframeButtonText: {
    textAlign: 'center',
    fontSize: SIZES.body3,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  timeframeButtonTextActive: {
    color: COLORS.primary,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    ...SHADOWS.medium,
  },
  chartTitle: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    ...SHADOWS.small,
  },
  statTitle: {
    fontSize: SIZES.body3,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
});

export default Analytics; 