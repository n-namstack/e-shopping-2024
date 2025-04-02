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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

const OrdersScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  useEffect(() => {
    fetchOrders();
  }, []);
  
  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, selectedFilter]);
  
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching orders for user:', user.id);
      
      // Fetch shop_ids for the user
      const { data: shops, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id);
      
      if (shopError) {
        console.error('Error fetching shops:', shopError.message);
        throw shopError;
      }
      
      if (!shops || shops.length === 0) {
        // No shops found
        console.log('No shops found');
        setOrders([]);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Get all shop IDs
      const shopIds = shops.map(shop => shop.id);
      console.log('Fetching orders for shop IDs:', shopIds);
      
      // Fetch orders for all shops (without joined data)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Orders fetch error:', error.message);
        throw error;
      }
      
      console.log('Found orders:', data?.length || 0);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
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
          (order.buyer_id && order.buyer_id.toLowerCase().includes(query))
      );
    }
    
    setFilteredOrders(result);
  };
  
  const handleStatusFilter = (status) => {
    setSelectedFilter(status);
  };
  
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      // If the order is being marked as delivered or completed, also update payment_status
      if (newStatus === 'delivered' || newStatus === 'completed') {
        updateData.payment_status = 'paid';
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, ...(updateData.payment_status && { payment_status: updateData.payment_status }) } 
          : order
      ));
      
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error.message);
      Alert.alert('Error', 'Failed to update order status');
    }
  };
  
  const showActionSheet = (order) => {
    const options = [];
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        options.push('Accept Order', 'Reject Order');
        actions.push(
          () => handleUpdateStatus(order.id, 'processing'),
          () => handleUpdateStatus(order.id, 'cancelled')
        );
        break;
      case 'processing':
        options.push('Mark as Shipped');
        actions.push(() => handleUpdateStatus(order.id, 'shipped'));
        break;
      case 'shipped':
        options.push('Mark as Delivered');
        actions.push(() => handleUpdateStatus(order.id, 'delivered'));
        break;
      default:
        break;
    }
    
    if (options.length > 0) {
      options.push('Cancel');
      Alert.alert(
        'Update Order Status',
        'Choose an action:',
        [
          ...options.map((option, index) => ({
            text: option,
            onPress: option === 'Cancel' ? undefined : actions[index],
            style: option === 'Reject Order' || option === 'Cancel' ? 'cancel' : 'default',
          })),
        ]
      );
    }
  };
  
  const formatCurrency = (amount) => {
    return 'N$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFC107';
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
  
  const renderOrder = ({ item }) => {
    const orderDate = new Date(item.created_at);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            <Text style={styles.orderDate}>{formattedDate}</Text>
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
            onPress={() => showActionSheet(item)}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.orderContent}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.customerName}>
              Customer #{item.buyer_id?.substring(0, 8) || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.orderSummary}>
            <Text style={styles.orderTotal}>{formatCurrency(item.total_amount || 0)}</Text>
          </View>
        </View>
        
        <View style={styles.orderFooter}>
          <View style={styles.paymentMethod}>
            <Ionicons 
              name={
                item.payment_method === 'card' || item.payment_method === 'credit_card' 
                  ? 'card-outline' 
                  : item.payment_method === 'cash' || item.payment_method === 'cash_on_delivery'
                  ? 'cash-outline'
                  : item.payment_method === 'mobile_money'
                  ? 'phone-portrait-outline'
                  : item.payment_method === 'bank_transfer'
                  ? 'business-outline'
                  : 'wallet-outline'
              } 
              size={16} 
              color="#666" 
            />
            <Text style={styles.paymentText}>
              {item.payment_method === 'card' && 'Card'}
              {item.payment_method === 'cash' && 'Cash'}
              {item.payment_method === 'credit_card' && 'Card'}
              {item.payment_method === 'mobile_money' && 'Mobile Money'}
              {item.payment_method === 'bank_transfer' && 'Bank Transfer'}
              {item.payment_method === 'cash_on_delivery' && 'Cash on Delivery'}
              {!item.payment_method && 'Payment Not Specified'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Manage</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyOrders = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptyText}>
        Orders from customers will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # or customer"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      <View style={styles.filtersContainer}>
        <ScrollableFilters
          selectedFilter={selectedFilter}
          onSelectFilter={handleStatusFilter}
        />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyOrders}
        />
      )}
    </SafeAreaView>
  );
};

const ScrollableFilters = ({ selectedFilter, onSelectFilter }) => {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ];
  
  return (
    <View style={styles.filtersScrollContainer}>
      {filters.map(filter => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterButton,
            selectedFilter === filter.id && styles.selectedFilterButton,
          ]}
          onPress={() => onSelectFilter(filter.id)}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === filter.id && styles.selectedFilterText,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  filtersScrollContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  selectedFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  selectedFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 90,
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    paddingVertical: 15,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default OrdersScreen; 