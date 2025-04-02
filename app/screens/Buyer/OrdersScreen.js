import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import EmptyState from '../../components/ui/EmptyState';

const OrderStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  AWAITING_PAYMENT: 'awaiting_payment',
  COMPLETED: 'completed',
};

const OrderStatusConfig = {
  [OrderStatus.PENDING]: {
    label: 'Pending',
    color: '#FF9800',
    icon: 'time-outline',
  },
  [OrderStatus.PROCESSING]: {
    label: 'Processing',
    color: '#2196F3',
    icon: 'refresh-outline',
  },
  [OrderStatus.SHIPPED]: {
    label: 'Shipped',
    color: '#9C27B0',
    icon: 'rocket-outline',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    color: '#4CAF50',
    icon: 'checkmark-circle-outline',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    color: '#F44336',
    icon: 'close-circle-outline',
  },
  [OrderStatus.AWAITING_PAYMENT]: {
    label: 'Awaiting Payment',
    color: '#FF5722',
    icon: 'card-outline',
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    color: '#4CAF50',
    icon: 'checkmark-done-circle-outline',
  },
};

const OrdersScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          shop:shop_id(*),
          order_items(*)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      Alert.alert('Error', 'Failed to load your orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchOrders();
  }, [user]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };
  
  const handleViewOrderDetails = (order) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };
  
  const formatPrice = (price) => {
    return Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const renderOrderCard = ({ item: order }) => {
    const statusConfig = OrderStatusConfig[order.status] || OrderStatusConfig[OrderStatus.PENDING];
    const itemCount = order.order_items ? order.order_items.length : 0;
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleViewOrderDetails(order)}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderId}>#{order.id}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Items:</Text>
            <Text style={styles.infoValue}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total:</Text>
            <Text style={styles.totalValue}>N${formatPrice(order.total_amount || 0)}</Text>
          </View>
          
          {order.has_on_order_items && (
            <View style={styles.onOrderBadge}>
              <Ionicons name="alert-circle-outline" size={14} color="#FF9800" />
              <Text style={styles.onOrderText}>Includes on-order items</Text>
            </View>
          )}
        </View>
        
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={18} color="#007AFF" />
        </View>
      </TouchableOpacity>
    );
  };
  
  // If not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="lock-closed"
          title="Login Required"
          message="Please login to view your orders"
          actionLabel="Login"
          onAction={() => navigation.navigate('Auth', { screen: 'Login' })}
        />
      </SafeAreaView>
    );
  }
  
  // Show loading indicator
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // If no orders, show empty state
  if (!loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="receipt-outline"
          title="No Orders Yet"
          message="You haven't placed any orders yet. Start shopping to see your orders here."
          actionLabel="Start Shopping"
          onAction={() => navigation.navigate('HomeTab')}
        />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  ordersList: {
    padding: 16,
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 12,
  },
  orderInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  onOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  onOrderText: {
    fontSize: 12,
    color: '#F57C00',
    marginLeft: 4,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default OrdersScreen; 