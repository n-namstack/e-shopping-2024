import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const OrdersScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0, 
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchQuery, selectedFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          shop:shops(
            id,
            name,
            logo_url
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = () => {
    const newStats = {
      total: orders.length,
      pending: orders.filter(order => order.status === 'pending').length,
      processing: orders.filter(order => order.status === 'processing').length,
      shipped: orders.filter(order => order.status === 'shipped').length,
      delivered: orders.filter(order => order.status === 'delivered').length,
      cancelled: orders.filter(order => order.status === 'cancelled').length
    };
    
    setStats(newStats);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filterOrders = () => {
    let result = [...orders];
    
    // Apply status filter
    if (selectedFilter !== 'all') {
      result = result.filter(order => order.status === selectedFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        order => 
          order.id.toString().includes(query) ||
          order.shop?.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredOrders(result);
  };

  const handleStatusFilter = (status) => {
    setSelectedFilter(status);
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'N$0.00';
    }
    return 'N$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'shipped':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <MaterialIcons name="hourglass-bottom" size={16} color="#FF9800" />;
      case 'processing':
        return <MaterialIcons name="sync" size={16} color="#2196F3" />;
      case 'shipped':
        return <MaterialIcons name="local-shipping" size={16} color="#9C27B0" />;
      case 'delivered':
        return <MaterialIcons name="check-circle" size={16} color="#4CAF50" />;
      case 'cancelled':
        return <MaterialIcons name="cancel" size={16} color="#F44336" />;
      default:
        return <MaterialIcons name="help" size={16} color="#757575" />;
    }
  };

  const getPaymentStatusUI = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <View style={styles.paymentStatusPaid}>
            <MaterialIcons name="payments" size={12} color="#4CAF50" />
            <Text style={styles.paymentStatusTextPaid}>Paid</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={styles.paymentStatusPending}>
            <MaterialIcons name="payment" size={12} color="#FF9800" />
            <Text style={styles.paymentStatusTextPending}>Pending</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderOrder = ({ item }) => {
    const orderDate = new Date(item.created_at);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const navigateToOrderDetails = () => {
      if (item && item.id) {
        navigation.navigate('OrderDetails', { orderId: item.id });
      } else {
        Alert.alert('Error', 'Cannot view details for this order.');
      }
    };

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={navigateToOrderDetails}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          style={styles.orderCardGradient}
        />
        
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            {getPaymentStatusUI(item.payment_status)}
          </View>
          
          <View
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item.status) + '20' }
            ]}
          >
            {getStatusIcon(item.status)}
            <Text 
              style={[
                styles.statusText, 
                { color: getStatusColor(item.status) }
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderContent}>
          <View style={styles.shopInfo}>
            <MaterialIcons name="storefront" size={16} color={COLORS.textSecondary} />
            <Text style={styles.shopName}>
              {item.shop?.name || 'Unknown Shop'}
            </Text>
          </View>
          
          <View style={styles.orderDetailRow}>
            <View style={styles.orderDetail}>
              <MaterialIcons name="date-range" size={14} color={COLORS.textSecondary} />
              <Text style={styles.orderDetailText}>{formattedDate}</Text>
            </View>
            
            <View style={styles.orderDetail}>
              <MaterialIcons name="payments" size={14} color={COLORS.textSecondary} />
              <Text style={styles.orderTotal}>{formatCurrency(item.total_amount || 0)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.orderFooter}>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={navigateToOrderDetails}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <MaterialIcons name="arrow-forward-ios" size={12} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyOrders = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['rgba(100, 120, 200, 0.2)', 'rgba(100, 120, 200, 0.1)']}
        style={styles.emptyIconContainer}
      >
        <MaterialCommunityIcons name="receipt-text-outline" size={60} color="#6478C8" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 
          `No orders match "${searchQuery}"` : 
          selectedFilter !== 'all' ?
            `No ${selectedFilter} orders found` :
            'You have no orders yet'
        }
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Order Stats */}
      <View style={styles.statsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollView}
        >
          <View style={[
            styles.statCard, 
            selectedFilter === 'all' && styles.selectedStatCard
          ]}>
            <TouchableOpacity 
              style={styles.statContent}
              onPress={() => handleStatusFilter('all')}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                <MaterialIcons name="receipt-long" size={18} color="#2196F3" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statCount}>{stats.total}</Text>
                <Text style={styles.statLabel}>All</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.statCard, 
            selectedFilter === 'pending' && styles.selectedStatCard
          ]}>
            <TouchableOpacity 
              style={styles.statContent}
              onPress={() => handleStatusFilter('pending')}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                <MaterialIcons name="hourglass-bottom" size={18} color="#FF9800" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statCount}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.statCard, 
            selectedFilter === 'processing' && styles.selectedStatCard
          ]}>
            <TouchableOpacity 
              style={styles.statContent}
              onPress={() => handleStatusFilter('processing')}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                <MaterialIcons name="sync" size={18} color="#2196F3" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statCount}>{stats.processing}</Text>
                <Text style={styles.statLabel}>Processing</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.statCard, 
            selectedFilter === 'shipped' && styles.selectedStatCard
          ]}>
            <TouchableOpacity 
              style={styles.statContent}
              onPress={() => handleStatusFilter('shipped')}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
                <MaterialIcons name="local-shipping" size={18} color="#9C27B0" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statCount}>{stats.shipped}</Text>
                <Text style={styles.statLabel}>Shipped</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.statCard, 
            selectedFilter === 'delivered' && styles.selectedStatCard
          ]}>
            <TouchableOpacity 
              style={styles.statContent}
              onPress={() => handleStatusFilter('delivered')}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statCount}>{stats.delivered}</Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.statCard, 
            selectedFilter === 'cancelled' && styles.selectedStatCard
          ]}>
            <TouchableOpacity 
              style={styles.statContent}
              onPress={() => handleStatusFilter('cancelled')}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                <MaterialIcons name="cancel" size={18} color="#F44336" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statCount}>{stats.cancelled}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      
      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyOrders}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  searchWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  statsContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statsScrollView: {
    paddingHorizontal: 15,
  },
  statCard: {
    marginRight: 12,
    padding: 2,
    borderRadius: 12,
  },
  selectedStatCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statInfo: {
    justifyContent: 'center',
  },
  statCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.small,
  },
  orderCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  orderIdContainer: {
    flexDirection: 'column',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  orderContent: {
    padding: 15,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    padding: 12,
    alignItems: 'flex-end',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 5,
  },
  paymentStatusPaid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  paymentStatusTextPaid: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 3,
  },
  paymentStatusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  paymentStatusTextPending: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OrdersScreen; 