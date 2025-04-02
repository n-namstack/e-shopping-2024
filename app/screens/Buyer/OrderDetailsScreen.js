import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import Button from '../../components/ui/Button';

// Order status configurations
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
    description: 'Your order has been received and is being reviewed.',
  },
  [OrderStatus.PROCESSING]: {
    label: 'Processing',
    color: '#2196F3',
    icon: 'refresh-outline',
    description: 'Your order is being prepared for shipping.',
  },
  [OrderStatus.SHIPPED]: {
    label: 'Shipped',
    color: '#9C27B0',
    icon: 'rocket-outline',
    description: 'Your order has been shipped and is on its way to you.',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    color: '#4CAF50',
    icon: 'checkmark-circle-outline',
    description: 'Your order has been delivered successfully.',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    color: '#F44336',
    icon: 'close-circle-outline',
    description: 'Your order has been cancelled.',
  },
  [OrderStatus.AWAITING_PAYMENT]: {
    label: 'Awaiting Payment',
    color: '#FF5722',
    icon: 'card-outline',
    description: 'We are waiting for your payment to process this order.',
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    color: '#4CAF50',
    icon: 'checkmark-done-circle-outline',
    description: 'Your order has been completed.',
  },
};

const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params || {};
  const { user } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch order details
  useEffect(() => {
    if (!user || !orderId) {
      setLoading(false);
      return;
    }
    
    fetchOrderDetails();
  }, [user, orderId]);
  
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();
      
      if (orderError) throw orderError;
      
      // Fetch order items with product information
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:product_id (*)
        `)
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      setOrder(orderData);
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching order details:', error.message);
      Alert.alert('Error', 'Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelOrder = () => {
    if (order.status === OrderStatus.PENDING) {
      Alert.alert(
        'Cancel Order',
        'Are you sure you want to cancel this order?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel Order', style: 'destructive', onPress: confirmCancelOrder }
        ]
      );
    } else {
      Alert.alert('Cannot Cancel', 'This order is already being processed and cannot be cancelled online. Please contact customer support if you need assistance.');
    }
  };
  
  const confirmCancelOrder = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ status: OrderStatus.CANCELLED })
        .eq('id', orderId)
        .eq('buyer_id', user.id);
      
      if (error) throw error;
      
      // Refresh order data
      await fetchOrderDetails();
      
      Alert.alert('Success', 'Your order has been cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling order:', error.message);
      Alert.alert('Error', 'Failed to cancel your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTrackOrder = () => {
    // In a real application, you would navigate to a tracking screen
    // This is just a placeholder for now
    Alert.alert('Track Order', 'Tracking functionality will be implemented soon.');
  };
  
  const handleContactSupport = () => {
    // In a real application, you would navigate to a support/chat screen
    // This is just a placeholder for now
    Alert.alert('Contact Support', 'Support chat functionality will be implemented soon.');
  };
  
  const formatPrice = (price) => {
    return Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Error state - order not found
  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorMessage}>The order you are looking for does not exist or you do not have permission to view it.</Text>
          <Button
            title="Go Back"
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  // Get status configuration based on order status
  const statusConfig = OrderStatusConfig[order.status] || OrderStatusConfig[OrderStatus.PENDING];
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Order Status */}
        <View style={[styles.statusContainer, { backgroundColor: statusConfig.color + '10' }]}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.color }]}>
            <Ionicons name={statusConfig.icon} size={24} color="#FFF" />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>{statusConfig.label}</Text>
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>
          </View>
        </View>
        
        {/* Order ID and Date */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
          </View>
          
          {order.payment_method && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment:</Text>
              <Text style={styles.infoValue}>
                {order.payment_method === 'card' && 'Card'}
                {order.payment_method === 'cash' && 'Cash'}
                {order.payment_method === 'credit_card' && 'Credit/Debit Card'}
                {order.payment_method === 'mobile_money' && 'Mobile Money'}
                {order.payment_method === 'bank_transfer' && 'Bank Transfer'}
                {order.payment_method === 'cash_on_delivery' && 'Cash on Delivery'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Delivery Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          
          <View style={styles.deliveryDetails}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.deliveryIcon} />
            <Text style={styles.deliveryText}>{order.delivery_address}</Text>
          </View>
          
          <View style={styles.deliveryDetails}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.deliveryIcon} />
            <Text style={styles.deliveryText}>{order.contact_phone}</Text>
          </View>
          
          {order.special_instructions && (
            <View style={styles.deliveryDetails}>
              <Ionicons name="information-circle-outline" size={20} color="#666" style={styles.deliveryIcon} />
              <Text style={styles.deliveryText}>{order.special_instructions}</Text>
            </View>
          )}
        </View>
        
        {/* Order Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Items ({orderItems.length})</Text>
          
          {orderItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image
                source={
                  item.product?.main_image
                    ? { uri: item.product.main_image }
                    : require('../../../assets/logo-placeholder.png')
                }
                style={styles.itemImage}
              />
              
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                
                <View style={styles.itemMeta}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>N${formatPrice(item.price)}</Text>
                </View>
                
                {!item.is_on_order ? (
                  <Text style={styles.itemSubtotal}>
                    N${formatPrice(item.price * item.quantity)}
                  </Text>
                ) : (
                  <View style={styles.onOrderPricing}>
                    <Text style={styles.depositLabel}>
                      50% Deposit Paid: N${formatPrice(item.price * item.quantity * 0.5)}
                    </Text>
                    <Text style={styles.remainingLabel}>
                      Remaining: N${formatPrice(item.price * item.quantity * 0.5)}
                    </Text>
                  </View>
                )}
                
                {item.is_on_order && (
                  <View style={styles.onOrderBadge}>
                    <Text style={styles.onOrderText}>On Order</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
        
        {/* Order Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              N${formatPrice(order.standard_total + (order.on_order_total * 2 || 0))}
            </Text>
          </View>
          
          {order.has_on_order_items && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>On-Order Discount (50%)</Text>
              <Text style={styles.summaryValue}>-N${formatPrice(order.on_order_total || 0)}</Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>N${formatPrice(order.shipping_fee || 0)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>N${formatPrice(order.tax || 0)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>N${formatPrice(order.total_amount)}</Text>
          </View>
          
          {order.has_on_order_items && (
            <View style={styles.onOrderNote}>
              <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
              <Text style={styles.onOrderNoteText}>
                This order includes on-order items. You've paid a 50% deposit for these items. The remaining balance will be due when the items arrive.
              </Text>
            </View>
          )}
        </View>
        
        {/* Actions */}
        <View style={styles.actionsContainer}>
          {(order.status === OrderStatus.PENDING) && (
            <Button
              title="Cancel Order"
              variant="outline"
              isFullWidth
              onPress={handleCancelOrder}
              style={styles.actionButton}
            />
          )}
          
          {(order.status === OrderStatus.SHIPPED) && (
            <Button
              title="Track Order"
              variant="primary"
              isFullWidth
              onPress={handleTrackOrder}
              style={styles.actionButton}
            />
          )}
          
          <Button
            title="Contact Support"
            variant={order.status === OrderStatus.PENDING ? "primary" : "outline"}
            isFullWidth
            onPress={handleContactSupport}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    fontWeight: '500',
    color: '#333',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  deliveryDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  deliveryIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  deliveryText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  orderItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  onOrderPricing: {
    marginTop: 2,
  },
  depositLabel: {
    fontSize: 13,
    color: '#F57C00',
  },
  remainingLabel: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  onOrderBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onOrderText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#F57C00',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  onOrderNote: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  onOrderNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  goBackButton: {
    minWidth: 150,
  },
});

export default OrderDetailsScreen; 