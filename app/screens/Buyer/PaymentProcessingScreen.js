import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useCartStore from '../../store/cartStore';
import { useTheme } from '@react-navigation/native';

const PaymentProcessingScreen = ({ navigation, route }) => {
  const { orderId, totalAmount, isDeposit, paymentStatus, transactionId } = route.params || {};
  const { clearCart } = useCartStore();
  const { colors } = useTheme();
  const processed = useRef(false);

  useEffect(() => {
    if (!processed.current) {
      processed.current = true;
      finaliseOrder();
    }
  }, []);

  const finaliseOrder = async () => {
    try {
      let updatePayload;

      if (paymentStatus === 'success') {
        updatePayload = {
          payment_status: isDeposit ? 'deposit_paid' : 'paid',
          status: isDeposit ? 'processing' : 'paid',
          payment_method: 'card',
          payment_date: new Date().toISOString(),
          payment_proof_url: transactionId ?? null,
        };
      } else {
        // pending — payment initiated but not yet confirmed (e.g. EFT / 3D Secure)
        updatePayload = {
          payment_status: 'pending',
          status: 'processing',
          payment_method: 'card',
          payment_date: new Date().toISOString(),
          payment_proof_url: transactionId ?? null,
        };
      }

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) throw error;

      clearCart();
      navigation.replace('OrderSuccess', { orderId });
    } catch (error) {
      console.error('Order finalisation error:', error.message);
      Alert.alert(
        'Order Error',
        'Your payment was received but we had trouble updating your order. Please contact support with your reference: ' + (transactionId ?? orderId),
        [{ text: 'OK', onPress: () => navigation.navigate('BrowseProducts') }]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {paymentStatus === 'success' ? (
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        ) : (
          <ActivityIndicator size="large" color="#007AFF" />
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {paymentStatus === 'success' ? 'Payment Successful' : 'Confirming Payment'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {paymentStatus === 'success'
            ? 'Finalising your order...'
            : 'Please wait while we confirm your payment...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default PaymentProcessingScreen;
