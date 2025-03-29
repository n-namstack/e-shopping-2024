import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

const TIMELINE_EVENTS = {
  ORDER_PLACED: {
    icon: 'cart',
    title: 'Order Placed',
    description: 'Your order has been placed successfully',
  },
  PAYMENT_CONFIRMED: {
    icon: 'card',
    title: 'Payment Confirmed',
    description: 'Payment has been confirmed',
  },
  PROCESSING: {
    icon: 'cube',
    title: 'Processing',
    description: 'Your order is being processed',
  },
  SHIPPED: {
    icon: 'airplane',
    title: 'Shipped',
    description: 'Your order has been shipped',
  },
  OUT_FOR_DELIVERY: {
    icon: 'car',
    title: 'Out for Delivery',
    description: 'Your order is out for delivery',
  },
  DELIVERED: {
    icon: 'checkmark-circle',
    title: 'Delivered',
    description: 'Your order has been delivered',
  },
};

const OrderTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params;
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrackingDetails();
  }, [orderId]);

  const fetchTrackingDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

      const response = await fetch(`${API_URL}/api/orders/${orderId}/tracking`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch tracking details');
      }

      setTracking(data.tracking);
    } catch (error) {
      console.error('Error fetching tracking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTimelineEvent = (event, index, isLast) => {
    const eventDetails = TIMELINE_EVENTS[event.status];
    const isCompleted = event.completed;
    const dotColor = isCompleted ? '#10b981' : '#e2e8f0';
    const lineColor = isCompleted ? '#10b981' : '#e2e8f0';

    return (
      <View key={index} style={styles.timelineEvent}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
            <Ionicons
              name={eventDetails.icon}
              size={16}
              color={isCompleted ? '#fff' : '#94a3b8'}
            />
          </View>
          {!isLast && (
            <View
              style={[styles.timelineLine, { backgroundColor: lineColor }]}
            />
          )}
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>{eventDetails.title}</Text>
          <Text style={styles.timelineDescription}>
            {eventDetails.description}
          </Text>
          <Text style={styles.timelineDate}>
            {event.timestamp
              ? new Date(event.timestamp).toLocaleString()
              : 'Pending'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={36} color="#0f172a" />
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
        <Text style={styles.headerTitle}>Track Order</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.trackingHeader}>
          <Text style={styles.orderNumber}>
            Order #{tracking?.orderNumber}
          </Text>
          <Text style={styles.estimatedDelivery}>
            Estimated Delivery:{' '}
            <Text style={styles.estimatedDeliveryDate}>
              {tracking?.estimatedDelivery
                ? new Date(tracking.estimatedDelivery).toLocaleDateString()
                : 'Calculating...'}
            </Text>
          </Text>
        </View>

        <View style={styles.timelineContainer}>
          {tracking?.events.map((event, index) =>
            renderTimelineEvent(
              event,
              index,
              index === tracking.events.length - 1
            )
          )}
        </View>

        {tracking?.carrier && (
          <View style={styles.carrierInfo}>
            <Text style={styles.carrierTitle}>Shipping Carrier</Text>
            <View style={styles.carrierDetails}>
              <Text style={styles.carrierName}>{tracking.carrier.name}</Text>
              <Text style={styles.trackingNumber}>
                Tracking Number: {tracking.carrier.trackingNumber}
              </Text>
            </View>
          </View>
        )}
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
  trackingHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#64748b',
  },
  estimatedDeliveryDate: {
    color: '#0f172a',
    fontWeight: '500',
  },
  timelineContainer: {
    padding: 20,
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#10b981',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  carrierInfo: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  carrierTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  carrierDetails: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  carrierName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default OrderTrackingScreen;