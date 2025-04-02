import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useCartStore from '../../store/cartStore';

const PaymentScreen = ({ navigation, route }) => {
  const { orderId, totalAmount, isDeposit } = route.params || {};
  const { clearCart } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isLoading, setIsLoading] = useState(false);

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: 'card-outline',
      description: 'Pay with Visa, MasterCard, or American Express',
    },
    {
      id: 'mobile',
      name: 'Mobile Money',
      icon: 'phone-portrait-outline',
      description: 'Pay with MTC Money, Telecom Easy Wallet',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: 'business-outline',
      description: 'Pay directly from your bank account',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: 'logo-paypal',
      description: 'Pay with your PayPal account',
    },
  ];

  const handlePayment = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order information is missing');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update order payment status
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: isDeposit ? 'deposit_paid' : 'paid',
          status: isDeposit ? 'processing' : 'paid',
          payment_method: selectedMethod,
          payment_date: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Clear cart after successful payment
      clearCart();

      // Navigate to success screen
      navigation.navigate('OrderSuccess', { orderId });
    } catch (error) {
      console.error('Payment error:', error.message);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentDescription = () => {
    if (isDeposit) {
      return `Deposit Payment (50%): N$${totalAmount.toFixed(2)}`;
    }
    return `Total Payment: N$${totalAmount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholderView} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>{isDeposit ? 'Deposit Amount' : 'Total Amount'}</Text>
          <Text style={styles.amountValue}>N${totalAmount.toFixed(2)}</Text>
          <Text style={styles.amountDescription}>{getPaymentDescription()}</Text>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Payment Methods</Text>
        </View>

        <View style={styles.paymentMethodsContainer}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodItem,
                selectedMethod === method.id && styles.selectedPaymentMethod,
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.paymentMethodIcon}>
                <Ionicons name={method.icon} size={28} color="#007AFF" />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
                <Text style={styles.paymentMethodDescription}>{method.description}</Text>
              </View>
              <View style={styles.radioButton}>
                {selectedMethod === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedMethod === 'card' && (
          <View style={styles.cardLogosContainer}>
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png' }}
              style={styles.cardLogo}
              resizeMode="contain"
            />
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png' }}
              style={styles.cardLogo}
              resizeMode="contain"
            />
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png' }}
              style={styles.cardLogo}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.securityNoteContainer}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
          <Text style={styles.securityNoteText}>
            All transactions are secure and encrypted. Your payment information is never stored on our servers.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>
              {`Pay N$${totalAmount.toFixed(2)}`}
            </Text>
          )}
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
  amountContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  amountDescription: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedPaymentMethod: {
    backgroundColor: '#f0f8ff',
  },
  paymentMethodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  cardLogosContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  cardLogo: {
    width: 60,
    height: 40,
    marginHorizontal: 10,
  },
  securityNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 15,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  payButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentScreen; 