import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';
import Button from '../../components/ui/Button';

const OrderSuccessScreen = ({ route, navigation }) => {
  const { orderId, paymentTiming, paymentMethod } = route.params || {};
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const isPayLater = paymentTiming === 'later';
  
  const handleViewOrders = () => {
    // Navigate to the Orders tab directly
    navigation.navigate('OrdersTab');
  };
  
  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.checkCircle, isPayLater && styles.checkCirclePayLater]}>
            <Ionicons
              name={isPayLater ? "time" : "checkmark"}
              size={64}
              color="#FFF"
            />
          </View>
        </View>

        {/* Success Message */}
        <Text style={[styles.title, { color: colors.text }]}>
          {isPayLater ? 'Order Placed - Pay Later!' : 'Order Placed Successfully!'}
        </Text>

        <Text style={[styles.subtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
          {isPayLater
            ? "Your order has been placed and will be processed. You can pay when it's ready for delivery."
            : "Thank you for your order. We'll start processing it immediately."
          }
        </Text>

        {/* Order ID */}
        <View style={styles.orderIdContainer}>
          <Text style={[styles.orderIdLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Order ID:</Text>
          <Text style={[styles.orderId, { color: colors.text }]}>{orderId || 'N/A'}</Text>
        </View>

        {/* Info Cards */}
        {isPayLater ? (
          <>
            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8' }]}>
              <Ionicons name="time-outline" size={24} color="#FF9800" style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: isDarkMode ? '#aaa' : '#555' }]}>
                Your order will be prepared and you'll be notified when it's ready for delivery and payment.
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8' }]}>
              <Ionicons name="card-outline" size={24} color="#007AFF" style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: isDarkMode ? '#aaa' : '#555' }]}>
                You can pay using cash, e-wallet, bank transfer, or any digital payment method when your order arrives.
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8' }]}>
              <Ionicons name="notifications-outline" size={24} color="#4CAF50" style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: isDarkMode ? '#aaa' : '#555' }]}>
                We'll send you updates about your order status and when payment is required.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8' }]}>
              <Ionicons name="information-circle-outline" size={24} color="#007AFF" style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: isDarkMode ? '#aaa' : '#555' }]}>
                You will receive an email confirmation with the details of your order.
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8' }]}>
              <Ionicons name="time-outline" size={24} color="#FF9800" style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: isDarkMode ? '#aaa' : '#555' }]}>
                You can track the status of your order in the Orders section of your profile.
              </Text>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="View My Orders"
            variant="outline"
            onPress={handleViewOrders}
            style={styles.actionButton}
          />

          <Button
            title="Continue Shopping"
            variant="primary"
            onPress={handleContinueShopping}
            style={styles.actionButton}
          />
        </View>

        {/* Contact Support */}
        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#007AFF" />
          <Text style={styles.supportText}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCirclePayLater: {
    backgroundColor: '#FF9800',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  orderIdLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    marginTop: 24,
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  supportText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OrderSuccessScreen; 