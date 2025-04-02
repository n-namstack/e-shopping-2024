import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { withSpring } from 'react-native-reanimated';

if (__DEV__) {
  console.warn = () => {};
}

const OrderDetailsScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:product_id(
              id,
              name,
              images,
              price,
              category
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('Order not found');
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error.message);
      setError('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      // If the order is being marked as delivered or completed, also update payment_status
      if (newStatus === 'delivered' || newStatus === 'completed') {
        updateData.payment_status = 'paid';
      }
      
      // Update in database
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrder({ 
        ...order, 
        status: newStatus,
        ...(updateData.payment_status && { payment_status: updateData.payment_status })
      });

      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error.message);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const showStatusActionSheet = () => {
    const options = [];
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        options.push('Accept Order', 'Reject Order');
        actions.push(
          () => handleUpdateStatus('processing'),
          () => handleUpdateStatus('cancelled')
        );
        break;
      case 'processing':
        options.push('Mark as Shipped');
        actions.push(() => handleUpdateStatus('shipped'));
        break;
      case 'shipped':
        options.push('Mark as Delivered');
        actions.push(() => handleUpdateStatus('delivered'));
        break;
      default:
        break;
    }
    
    if (options.length === 0) {
      // No actions available for current status
      return;
    }
    
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
  };

  const formatCurrency = (amount) => {
    return 'N$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderTotal = () => {
    if (!order || !order.order_items) return 0;
    return order.order_items.reduce(
      (total, item) => total + (item.quantity * item.price),
      0
    );
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status and Date */}
        <View style={styles.section}>
          <View style={styles.orderInfoHeader}>
            <View>
              <Text style={styles.sectionLabel}>Order Status</Text>
              <TouchableOpacity 
                style={[
                  styles.statusBadge, 
                  { backgroundColor: getStatusColor(order.status) + '20' }
                ]}
                onPress={showStatusActionSheet}
                disabled={['delivered', 'cancelled'].includes(order.status)}
              >
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: getStatusColor(order.status) }
                  ]} 
                />
                <Text 
                  style={[
                    styles.statusText, 
                    { color: getStatusColor(order.status) }
                  ]}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
                {!['delivered', 'cancelled'].includes(order.status) && (
                  <Ionicons 
                    name="chevron-down" 
                    size={16} 
                    color={getStatusColor(order.status)}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
            </View>
            
            <View>
              <Text style={styles.sectionLabel}>Order Date</Text>
              <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatarPlaceholder}>
                <Text style={styles.customerAvatarInitial}>C</Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  Customer ID: #{order.buyer_id?.substring(0, 8) || 'Unknown'}
                </Text>
                <TouchableOpacity style={styles.contactButton}>
                  <Ionicons name="mail-outline" size={14} color="#007AFF" />
                  <Text style={styles.contactButtonText}>Contact Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="mail-outline" size={16} color="#666" />
                <Text style={styles.detailText}>Email not available</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="call-outline" size={16} color="#666" />
                <Text style={styles.detailText}>Phone not available</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        {order.shipping_address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Information</Text>
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Ionicons name="location-outline" size={24} color="#4CAF50" />
                <Text style={styles.addressType}>
                  {order.shipping_address.address_type || 'Delivery Address'}
                </Text>
              </View>
              
              <View style={styles.addressDetails}>
                <Text style={styles.addressLine}>
                  {order.shipping_address.street_address || order.shipping_address.street || 'No address provided'}
                </Text>
                
                {(order.shipping_address.apartment || order.shipping_address.apartment_number) && (
                  <Text style={styles.addressLine}>
                    {order.shipping_address.apartment || order.shipping_address.apartment_number}
                  </Text>
                )}
                
                <Text style={styles.addressLine}>
                  {order.shipping_address.city || ''},
                  {order.shipping_address.state || ''} 
                  {order.shipping_address.postal_code || order.shipping_address.zip_code || ''}
                </Text>
                
                <Text style={styles.addressLine}>
                  {order.shipping_address.country || ''}
                </Text>
                
                {(order.shipping_address.instructions || order.shipping_address.notes) && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsLabel}>Instructions:</Text>
                    <Text style={styles.instructionsText}>
                      {order.shipping_address.instructions || order.shipping_address.notes}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          
          {order.order_items.map((item) => (
            <View key={item.id} style={styles.orderItemCard}>
              <View style={styles.orderItemHeader}>
                <Image 
                  source={{ uri: item.product?.images[0] || 'https://placeholder.co/100' }} 
                  style={styles.productImage} 
                />
                
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product?.name}</Text>
                  <Text style={styles.productCategory}>
                    {item.product?.category || 'Uncategorized'}
                  </Text>
                  <View style={styles.priceQuantityContainer}>
                    <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                    <Text style={styles.productQuantity}>× {item.quantity}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.orderItemFooter}>
                <Text style={styles.itemTotalLabel}>Item Total:</Text>
                <Text style={styles.itemTotalValue}>
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentMethod}>
              <Ionicons 
                name={
                  order.payment_method === 'card' || order.payment_method === 'credit_card' 
                    ? 'card-outline' 
                    : order.payment_method === 'cash' || order.payment_method === 'cash_on_delivery'
                    ? 'cash-outline'
                    : order.payment_method === 'mobile_money'
                    ? 'phone-portrait-outline'
                    : order.payment_method === 'bank_transfer'
                    ? 'business-outline'
                    : 'wallet-outline'
                } 
                size={20} 
                color="#666" 
              />
              <Text style={styles.paymentMethodText}>
                {order.payment_method === 'card' && 'Card Payment'}
                {order.payment_method === 'cash' && 'Cash Payment'}
                {order.payment_method === 'credit_card' && 'Credit/Debit Card'}
                {order.payment_method === 'mobile_money' && 'Mobile Money'}
                {order.payment_method === 'bank_transfer' && 'Bank Transfer'}
                {order.payment_method === 'cash_on_delivery' && 'Cash on Delivery'}
                {!order.payment_method && 'Payment Method Not Specified'}
              </Text>
            </View>
            
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(getOrderTotal())}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(order.shipping_fee || 0)}
                </Text>
              </View>
              
              {order.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, styles.discountText]}>
                    -{formatCurrency(order.discount)}
                  </Text>
                </View>
              )}
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(getOrderTotal() + (order.shipping_fee || 0) - (order.discount || 0))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {['pending', 'processing', 'shipped'].includes(order.status) && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={showStatusActionSheet}
          >
            <Text style={styles.actionButtonText}>
              {order.status === 'pending' ? 'Accept/Reject Order' :
               order.status === 'processing' ? 'Mark as Shipped' :
               'Mark as Delivered'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  spacer: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingTop: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
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
  dateText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  customerAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  customerAvatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 5,
  },
  detailsRow: {
    flexDirection: 'column',
    marginTop: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  addressDetails: {
    paddingLeft: 2,
  },
  addressLine: {
    fontSize: 15,
    color: '#444',
    marginBottom: 6,
    lineHeight: 22,
  },
  instructionsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  orderItemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginBottom: 10,
  },
  orderItemHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  priceQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    color: '#333',
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  orderItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemTotalLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentMethodText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
  },
  summaryContainer: {
    marginTop: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  discountText: {
    color: '#4CAF50',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderDetailsScreen; 