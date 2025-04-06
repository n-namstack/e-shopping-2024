import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../lib/supabase';
import { COLORS, SHADOWS } from '../../constants/theme';

const OrderDetailsScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching order details for orderId:', orderId);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          shop:shops(
            id,
            name,
            logo_url,
            owner:profiles!shops_owner_id_fkey(
              id,
              firstname,
              lastname,
              email,
              cellphone_no
            )
          ),
          order_items!order_items_order_id_fkey(
            id,
            quantity,
            product:products!order_items_product_id_fkey(
              id,
              name,
              price,
              description
            )
          ),
          buyer:profiles!orders_buyer_id_fkey(
            id,
            firstname,
            lastname,
            email,
            cellphone_no,
            role
          )
        `)
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to fetch order details');
      }
      
      if (!data) {
        throw new Error('Order not found');
      }

      console.log('Fetched order:', JSON.stringify(data, null, 2));
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error.message);
      Alert.alert(
        'Error',
        error.message === 'User not authenticated' 
          ? 'Please log in to view order details'
          : 'Failed to load order details. Please try again.'
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
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
        return 'hourglass-bottom';
      case 'processing':
        return 'sync';
      case 'shipped':
        return 'local-shipping';
      case 'delivered':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
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

  const handleContactShop = () => {
    if (!order?.shop?.owner) {
      Alert.alert('Error', 'Shop owner information not available');
      return;
    }

    const owner = order.shop.owner;
    Alert.alert(
      'Contact Shop Owner',
      `Would you like to contact ${owner.firstname} ${owner.lastname}?`,
      [
        {
          text: 'Call',
          onPress: async () => {
            if (owner.cellphone_no) {
              const phoneNumber = owner.cellphone_no.replace(/\D/g, '');
              const formattedNumber = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
              
              try {
                await Linking.openURL(`tel:+264${formattedNumber}`);
              } catch (error) {
                console.error('Error opening phone:', error);
                Alert.alert(
                  'Error',
                  'Could not open phone app. Please try calling manually: +264' + formattedNumber
                );
              }
            } else {
              Alert.alert('Error', 'Phone number not available');
            }
          }
        },
        {
          text: 'Email',
          onPress: async () => {
            if (owner.email) {
              try {
                const emailUrl = `mailto:${owner.email}?subject=Regarding Order #${order.id}`;
                const canOpen = await Linking.canOpenURL(emailUrl);
                if (canOpen) {
                  await Linking.openURL(emailUrl);
                } else {
                  throw new Error('Cannot open email app');
                }
              } catch (error) {
                console.error('Error opening email:', error);
                Alert.alert(
                  'Error',
                  'Could not open email app. Please try emailing manually: ' + owner.email
                );
              }
            } else {
              Alert.alert('Error', 'Email not available');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['rgba(244, 67, 54, 0.1)', 'rgba(244, 67, 54, 0.05)']}
            style={styles.errorIconContainer}
          >
            <MaterialIcons name="error-outline" size={60} color="#F44336" />
          </LinearGradient>
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorText}>The order details could not be loaded.</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            style={styles.cardGradient}
          />
          
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <Text style={styles.orderDate}>{formattedDate}</Text>
            </View>
            
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) + '20' }
              ]}
            >
              <MaterialIcons 
                name={getStatusIcon(order.status)} 
                size={16} 
                color={getStatusColor(order.status)} 
              />
              <Text 
                style={[
                  styles.statusText,
                  { color: getStatusColor(order.status) }
                ]}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.shopInfo}>
            <MaterialIcons name="storefront" size={20} color={COLORS.textSecondary} />
            <Text style={styles.shopName}>{order.shop?.name || 'Unknown Shop'}</Text>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleContactShop}
            >
              <MaterialIcons name="help-outline" size={16} color={COLORS.primary} />
              <Text style={styles.contactButtonText}>Contact Shop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.order_items?.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product?.name}</Text>
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.product?.description}
                </Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                  <Text style={styles.itemUnitPrice}>
                    {formatCurrency(item.product?.price)} each
                  </Text>
                </View>
              </View>
              <Text style={styles.itemPrice}>
                {formatCurrency(item.quantity * (item.product?.price || 0))}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              {getPaymentStatusUI(order.payment_status)}
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Subtotal</Text>
              <Text style={styles.paymentValue}>{formatCurrency(order.subtotal || order.total_amount)}</Text>
            </View>
            {order.shipping_fee > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Shipping</Text>
                <Text style={styles.paymentValue}>{formatCurrency(order.shipping_fee)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.paymentRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Shipping Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Details</Text>
          <View style={styles.shippingInfo}>
            {order.buyer?.shipping_address ? (
              <View style={styles.shippingRow}>
                <MaterialIcons name="location-on" size={20} color={COLORS.textSecondary} />
                <Text style={styles.shippingAddress}>
                  {order.buyer.shipping_address}
                </Text>
              </View>
            ) : (
              <View style={styles.shippingRow}>
                <MaterialIcons name="info" size={20} color={COLORS.warning} />
                <Text style={styles.shippingWarning}>
                  No shipping address provided
                </Text>
              </View>
            )}
            {order.tracking_number && (
              <View style={styles.shippingRow}>
                <MaterialIcons name="local-shipping" size={20} color={COLORS.textSecondary} />
                <Text style={styles.trackingNumber}>
                  Tracking: {order.tracking_number}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleContactShop}
          >
            <MaterialIcons name="headset-mic" size={20} color={COLORS.primary} />
            <Text style={styles.supportButtonText}>Contact Shop Owner</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.error + '20',
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 15,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.small,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 15,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  shopName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 15,
    marginTop: 0,
    padding: 15,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 15,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  itemInfo: {
    flex: 1,
    marginRight: 15,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemUnitPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentInfo: {
    backgroundColor: '#FFFFFF',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentStatusPaid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paymentStatusTextPaid: {
    fontSize: 12,
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
  },
  paymentStatusTextPending: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 3,
  },
  shippingInfo: {
    backgroundColor: '#FFFFFF',
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shippingAddress: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 8,
    lineHeight: 20,
  },
  trackingNumber: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  shippingWarning: {
    fontSize: 14,
    color: COLORS.warning,
    marginLeft: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  contactButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default OrderDetailsScreen;