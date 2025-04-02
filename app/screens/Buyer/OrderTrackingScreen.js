import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const ORDER_STATUSES = {
  pending: {
    label: 'Order Placed',
    color: '#FF9800',
    icon: 'timer-outline',
    description: 'Your order has been received and is awaiting confirmation.',
  },
  confirmed: {
    label: 'Order Confirmed',
    color: '#2196F3',
    icon: 'checkmark-circle-outline',
    description: 'Your order has been confirmed and is being prepared.',
  },
  processing: {
    label: 'Processing',
    color: '#673AB7',
    icon: 'construct-outline',
    description: 'Your order is being processed and prepared for shipping.',
  },
  shipped: {
    label: 'Shipped',
    color: '#4CAF50',
    icon: 'car-outline',
    description: 'Your order has been shipped and is on its way to you.',
  },
  delivered: {
    label: 'Delivered',
    color: '#4CAF50',
    icon: 'checkmark-done-circle-outline',
    description: 'Your order has been delivered successfully.',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#F44336',
    icon: 'close-circle-outline',
    description: 'Your order has been cancelled.',
  },
};

const OrderTrackingScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          shipping_address:shipping_address_id(*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      setOrder(orderData);
      
      // Fetch tracking events
      const { data: eventsData, error: eventsError } = await supabase
        .from('order_tracking_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;
      
      setTrackingEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching order details:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    return ORDER_STATUSES[status] || {
      label: 'Unknown',
      color: '#999',
      icon: 'help-circle-outline',
      description: 'Status information unavailable',
    };
  };

  const getCurrentStep = () => {
    if (!order) return 0;
    
    const statusMap = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
      cancelled: -1,
    };
    
    return statusMap[order.status] || 0;
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentStep = getCurrentStep();
  const statusInfo = getStatusInfo(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={styles.placeholderView} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.orderInfoCard}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumberLabel}>Order Number:</Text>
            <Text style={styles.orderNumber}>#{order.order_number}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon} size={18} color="#fff" />
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
          
          <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          
          {order.tracking_number && (
            <View style={styles.trackingNumberContainer}>
              <Text style={styles.trackingNumberLabel}>Tracking Number:</Text>
              <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
              <TouchableOpacity 
                style={styles.trackButton}
                onPress={() => Linking.openURL(`https://example.com/track/${order.tracking_number}`)}
              >
                <Text style={styles.trackButtonText}>Track Package</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.stepperContainer}>
          <View style={styles.stepperLine} />
          
          {/* Order Placed */}
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= 0 ? styles.stepCompleted : styles.stepIncomplete
            ]}>
              {currentStep >= 0 && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Order Placed</Text>
              <Text style={styles.stepDate}>
                {order.created_at ? formatDate(order.created_at) : 'Pending'}
              </Text>
            </View>
          </View>
          
          {/* Order Confirmed */}
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= 1 ? styles.stepCompleted : styles.stepIncomplete
            ]}>
              {currentStep >= 1 && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Order Confirmed</Text>
              <Text style={styles.stepDate}>
                {currentStep >= 1 ? 
                  (trackingEvents.find(e => e.event_type === 'confirmed')?.created_at ? 
                    formatDate(trackingEvents.find(e => e.event_type === 'confirmed').created_at) : 
                    'N/A') : 
                  'Pending'}
              </Text>
            </View>
          </View>
          
          {/* Processing */}
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= 2 ? styles.stepCompleted : styles.stepIncomplete
            ]}>
              {currentStep >= 2 && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Processing</Text>
              <Text style={styles.stepDate}>
                {currentStep >= 2 ? 
                  (trackingEvents.find(e => e.event_type === 'processing')?.created_at ? 
                    formatDate(trackingEvents.find(e => e.event_type === 'processing').created_at) : 
                    'N/A') : 
                  'Pending'}
              </Text>
            </View>
          </View>
          
          {/* Shipped */}
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= 3 ? styles.stepCompleted : styles.stepIncomplete
            ]}>
              {currentStep >= 3 && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Shipped</Text>
              <Text style={styles.stepDate}>
                {currentStep >= 3 ? 
                  (trackingEvents.find(e => e.event_type === 'shipped')?.created_at ? 
                    formatDate(trackingEvents.find(e => e.event_type === 'shipped').created_at) : 
                    'N/A') : 
                  'Pending'}
              </Text>
            </View>
          </View>
          
          {/* Delivered */}
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= 4 ? styles.stepCompleted : styles.stepIncomplete
            ]}>
              {currentStep >= 4 && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Delivered</Text>
              <Text style={styles.stepDate}>
                {currentStep >= 4 ? 
                  (trackingEvents.find(e => e.event_type === 'delivered')?.created_at ? 
                    formatDate(trackingEvents.find(e => e.event_type === 'delivered').created_at) : 
                    'N/A') : 
                  'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {order.shipping_address && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressName}>{order.shipping_address.full_name}</Text>
              <Text style={styles.addressLine}>
                {order.shipping_address.street}, {order.shipping_address.city}
              </Text>
              <Text style={styles.addressLine}>
                {order.shipping_address.state}, {order.shipping_address.zip_code}
              </Text>
              <Text style={styles.addressLine}>
                {order.shipping_address.country}
              </Text>
              <Text style={styles.addressLine}>
                Phone: {order.shipping_address.phone_number}
              </Text>
            </View>
          </View>
        )}

        {trackingEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Tracking History</Text>
            <View style={styles.trackingHistoryCard}>
              {trackingEvents.map((event, index) => (
                <View key={index} style={styles.trackingEvent}>
                  <View style={styles.trackingEventIconContainer}>
                    <Ionicons 
                      name={ORDER_STATUSES[event.event_type]?.icon || 'ellipse'} 
                      size={20} 
                      color={ORDER_STATUSES[event.event_type]?.color || '#666'} 
                    />
                  </View>
                  <View style={styles.trackingEventContent}>
                    <Text style={styles.trackingEventTitle}>
                      {ORDER_STATUSES[event.event_type]?.label || event.event_type}
                    </Text>
                    <Text style={styles.trackingEventDescription}>
                      {event.description || ORDER_STATUSES[event.event_type]?.description}
                    </Text>
                    <Text style={styles.trackingEventDate}>
                      {formatDate(event.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => navigation.navigate('Support', { orderId })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#007AFF" />
          <Text style={styles.supportButtonText}>Need Help with Order</Text>
        </TouchableOpacity>
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
    fontSize: 18,
    color: '#333',
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
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
  placeholderView: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  orderInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumberLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  trackingNumberContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  trackingNumberLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  trackButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepperContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  stepperLine: {
    position: 'absolute',
    left: 25,
    top: 40,
    bottom: 40,
    width: 2,
    backgroundColor: '#e0e0e0',
    zIndex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
    position: 'relative',
    zIndex: 2,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepIncomplete: {
    backgroundColor: '#e0e0e0',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  stepDate: {
    fontSize: 14,
    color: '#666',
  },
  sectionContainer: {
    margin: 15,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  addressLine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  trackingHistoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trackingEvent: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackingEventIconContainer: {
    width: 30,
    marginRight: 15,
    alignItems: 'center',
  },
  trackingEventContent: {
    flex: 1,
  },
  trackingEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  trackingEventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  trackingEventDate: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  supportButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 12,
  },
  supportButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OrderTrackingScreen; 