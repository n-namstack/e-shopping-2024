import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const OrderStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const OrderStatusColors = {
  [OrderStatus.PENDING]: '#f59e0b',
  [OrderStatus.PROCESSING]: '#3b82f6',
  [OrderStatus.SHIPPED]: '#8b5cf6',
  [OrderStatus.DELIVERED]: '#10b981',
  [OrderStatus.CANCELLED]: '#ef4444',
};

const OrderStatusLabels = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

const MyOrdersScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

      const response = await fetch(`${API_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch orders');
      }

      setOrders(data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const getFilteredOrders = () => {
    if (activeFilter === 'all') return orders;
    return orders.filter(order => order.status === activeFilter);
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: OrderStatusColors[item.status] + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: OrderStatusColors[item.status] }
          ]}>
            {OrderStatusLabels[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        {item.items.map((orderItem, index) => (
          <View key={index} style={styles.orderItem}>
            <Image
              source={{ uri: orderItem.product.image }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {orderItem.product.name}
              </Text>
              <Text style={styles.productQuantity}>
                Qty: {orderItem.quantity}
              </Text>
            </View>
            <Text style={styles.productPrice}>
              ${orderItem.price.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalItems}>
          {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
        </Text>
        <Text style={styles.totalAmount}>
          Total: ${item.totalAmount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (filter, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === filter && styles.activeFilterButton,
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        activeFilter === filter && styles.activeFilterButtonText,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {renderFilterButton('all', 'All')}
        {renderFilterButton(OrderStatus.PENDING, 'Pending')}
        {renderFilterButton(OrderStatus.PROCESSING, 'Processing')}
        {renderFilterButton(OrderStatus.SHIPPED, 'Shipped')}
        {renderFilterButton(OrderStatus.DELIVERED, 'Delivered')}
        {renderFilterButton(OrderStatus.CANCELLED, 'Cancelled')}
      </ScrollView>

      <FlatList
        data={getFilteredOrders()}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#0f172a',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  ordersList: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  productQuantity: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalItems: {
    fontSize: 14,
    color: '#64748b',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
});

export default MyOrdersScreen; 