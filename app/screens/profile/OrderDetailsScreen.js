import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

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

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch order details');
      }

      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const token = await AsyncStorage.getItem('userToken');
              const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

              const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to cancel order');
              }

              // Update the local order state with the cancelled status
              setOrder(prevOrder => ({
                ...prevOrder,
                status: OrderStatus.CANCELLED,
              }));

              Alert.alert(
                'Order Cancelled',
                'Your order has been successfully cancelled.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert(
                'Error',
                'Failed to cancel order. Please try again later.',
                [{ text: 'OK' }]
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleTrackOrder = () => {
    navigation.navigate('OrderTracking', {
      orderId: order.id,
    });
  };

  const handleContactSeller = () => {
    navigation.navigate('Chat', {
      orderId: order.id,
      sellerId: order.seller.id,
      sellerName: order.seller.name || 'Seller',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={36} color="#0f172a" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load order details</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>
                Order #{order.orderNumber}
              </Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: OrderStatusColors[order.status] + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: OrderStatusColors[order.status] }
              ]}>
                {OrderStatusLabels[order.status]}
              </Text>
            </View>
          </View>

          {order.status === OrderStatus.PENDING && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                cancelling && styles.cancelButtonDisabled
              ]}
              onPress={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size={20} color="#ef4444" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Image
                source={{ uri: item.product.image }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {item.product.name}
                </Text>
                <Text style={styles.productQuantity}>
                  Qty: {item.quantity}
                </Text>
                <Text style={styles.productPrice}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Details</Text>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsName}>
              {order.shippingAddress.fullName}
            </Text>
            <Text style={styles.detailsText}>
              {order.shippingAddress.street}
            </Text>
            <Text style={styles.detailsText}>
              {`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`}
            </Text>
            <Text style={styles.detailsText}>
              {order.shippingAddress.phone}
            </Text>
          </View>

          {order.status !== OrderStatus.PENDING && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={handleTrackOrder}
            >
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.trackButtonText}>Track Order</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>
                •••• •••• •••• {order.paymentMethod.cardNumber.slice(-4)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Subtotal</Text>
              <Text style={styles.paymentValue}>
                ${order.subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Shipping</Text>
              <Text style={styles.paymentValue}>
                ${order.shippingCost.toFixed(2)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Tax</Text>
              <Text style={styles.paymentValue}>
                ${order.tax.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.paymentRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${order.totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactSeller}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#0f172a" />
          <Text style={styles.contactButtonText}>Contact Seller</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
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
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  cancelButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  productQuantity: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 4,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  detailsName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  trackButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  paymentValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
});

export default OrderDetailsScreen; 