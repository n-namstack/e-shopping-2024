import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/ui/Button';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import supabase from '../../lib/supabase';
import { enhancedCheckoutService } from '../../services/EnhancedCheckoutService';
import { createDPOToken } from '../../services/DPOService';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';

const PaymentMethod = {
  CARD: 'card',
  CASH: 'cash',
  EWALLET: 'ewallet',
  PAY_TO_CELL: 'pay_to_cell',
  BANK_TRANSFER: 'bank_transfer',
  EASY_WALLET: 'easy_wallet',
};

const PaymentTiming = {
  NOW: 'now',
  LATER: 'later',
};

const CheckoutScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { cartItems, clearCart } = useCartStore();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Order details
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentTiming, setPaymentTiming] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('local'); // Default to local delivery
  const [isDepositPayment, setIsDepositPayment] = useState(false); // For 50% deposit payment option
  const [paymentProofImage, setPaymentProofImage] = useState(null); // Payment proof screenshot
  
  // Order totals
  const [standardTotal, setStandardTotal] = useState(0);
  const [onOrderTotal, setOnOrderTotal] = useState(0);
  const [fullOnOrderTotal, setFullOnOrderTotal] = useState(0); // Full amount for on-order items before deposit
  const [hasOnOrderItems, setHasOnOrderItems] = useState(false);
  const [shippingFee, setShippingFee] = useState(50); // Default shipping fee
  const [total, setTotal] = useState(0);
  const [deliveryFeesTotal, setDeliveryFeesTotal] = useState(0);
  const [runnerFeesTotal, setRunnerFeesTotal] = useState(0);
  const [transportFeesTotal, setTransportFeesTotal] = useState(0);
  
  // Calculate order totals
  useEffect(() => {
    let standardSum = 0;
    let onOrderSum = 0;
    let hasOnOrder = false;
    let deliveryFees = 0;
    let runnerFees = 0;
    let transportFees = 0;
    let onOrderItemsTotal = 0; // Total value of on-order items before deposit calculation
    
    cartItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      let itemDeliveryFee = 0;
      
      if (item.in_stock) {
        standardSum += itemTotal;
      } else {
        hasOnOrder = true;
        onOrderItemsTotal += itemTotal; // Track total value of on-order items
        
        // Calculate delivery fee based on selected location
        switch (deliveryLocation) {
          case 'local':
            if (item.delivery_fee_local !== null && item.delivery_fee_local !== undefined) {
              itemDeliveryFee = item.delivery_fee_local * item.quantity;
            }
            break;
          case 'uptown':
            if (item.delivery_fee_uptown !== null && item.delivery_fee_uptown !== undefined) {
              itemDeliveryFee = item.delivery_fee_uptown * item.quantity;
            }
            break;
          case 'outoftown':
            if (item.delivery_fee_outoftown !== null && item.delivery_fee_outoftown !== undefined) {
              itemDeliveryFee = item.delivery_fee_outoftown * item.quantity;
            }
            break;
          case 'countrywide':
            if (item.delivery_fee_countrywide !== null && item.delivery_fee_countrywide !== undefined) {
              itemDeliveryFee = item.delivery_fee_countrywide * item.quantity;
            }
            break;
          default:
            // Default case, no specific delivery fee
            break;
        }
        
        // Check if order qualifies for free delivery
        if (item.free_delivery_threshold > 0 && (itemTotal >= item.free_delivery_threshold)) {
          // Free delivery for this item
          itemDeliveryFee = 0;
        }
        
        // Add this item's delivery fee to the total
        deliveryFees += itemDeliveryFee;
      }
      
      // Calculate runner fees if applicable
      if (item.runner_fee && !isNaN(item.runner_fee)) {
        runnerFees += item.runner_fee * item.quantity;
      }
      
      // Calculate transport fees if applicable
      if (item.transport_fee && !isNaN(item.transport_fee)) {
        transportFees += item.transport_fee * item.quantity;
      }
    });
    
    // Store the full on-order total before applying any deposit calculation
    setFullOnOrderTotal(onOrderItemsTotal);
    
    // Calculate on-order amount based on deposit option
    if (isDepositPayment) {
      // If 50% deposit option is selected
      onOrderSum = onOrderItemsTotal * 0.5;
    } else {
      // If full payment option is selected
      onOrderSum = onOrderItemsTotal;
    }
    
    // Update all state variables with calculated values
    setStandardTotal(standardSum);
    setOnOrderTotal(onOrderSum);
    setDeliveryFeesTotal(deliveryFees);
    setRunnerFeesTotal(runnerFees);
    setTransportFeesTotal(transportFees);
    setHasOnOrderItems(hasOnOrder);
    
    // Calculate total: standard items + on-order deposits + shipping + delivery fees + runner fees
    // Note: transportFees are not included in the immediate payment total as they're paid on delivery
    const calculatedTotal = standardSum + onOrderSum + shippingFee + deliveryFees + runnerFees;
    
    // Ensure we have a valid number before setting the total
    setTotal(isNaN(calculatedTotal) ? 0 : calculatedTotal);
  }, [cartItems, shippingFee, deliveryLocation, isDepositPayment]);
  
  // Format currency
  const formatPrice = (price) => {
    // Make sure price is a valid number
    if (isNaN(price) || price === null || price === undefined) {
      return '0.00';
    }
    return price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  // Go back to cart
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Handle payment method selection
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
  };
  
  // Handle delivery location selection
  const handleDeliveryLocationChange = (location) => {
    setDeliveryLocation(location);
  };

  // Handle payment proof image selection
  const handleSelectPaymentProof = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPaymentProofImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Remove payment proof image
  const handleRemovePaymentProof = () => {
    setPaymentProofImage(null);
  };
  
  // Go to next step
  const handleNextStep = () => {
    if (step === 1) {
      // Validate delivery information
      if (!deliveryAddress.trim()) {
        Alert.alert('Missing Information', 'Please enter your delivery address.', [
          { text: 'OK', onPress: () => console.log('OK Pressed') }
        ]);
        return;
      }
      
      // Validate phone number
      if (!phoneNumber.trim()) {
        Alert.alert('Missing Information', 'Please enter your phone number.', [
          { text: 'OK', onPress: () => console.log('OK Pressed') }
        ]);
        return;
      }
      
      if (!phoneNumber.trim()) {
        Alert.alert('Missing Information', 'Please enter your phone number.');
        return;
      }
      
      setStep(2);
    } else if (step === 2) {
      // Validate payment timing selection
      if (!paymentTiming) {
        Alert.alert('Missing Information', 'Please choose when you want to pay.');
        return;
      }
      
      setStep(3);
    } else if (step === 3) {
      // Validate payment method only if paying now
      if (paymentTiming === PaymentTiming.NOW) {
        if (!paymentMethod) {
          Alert.alert('Missing Information', 'Please select a payment method.');
          return;
        }

        // Card payments go through DPO gateway — no proof upload needed
        const proofRequired = paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.CARD;
        if (proofRequired && !paymentProofImage) {
          Alert.alert('Payment Proof Required', 'Please upload a screenshot of your payment proof.');
          return;
        }

        // Card: skip the review step and go straight to the DPO payment page
        if (paymentMethod === PaymentMethod.CARD) {
          handlePlaceOrder();
          return;
        }
      }

      setStep(4);
    }
  };
  
  // Go back to previous step
  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Place order with enhanced tracking
  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Login Required', 'You need to login to complete checkout.');
      return;
    }
    
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare order details for enhanced checkout service
      const orderDetails = {
        deliveryAddress,
        phoneNumber,
        deliveryLocation,
        specialInstructions,
        isDepositPayment: hasOnOrderItems ? isDepositPayment : false,
        paymentTiming: paymentTiming
      };
      
      console.log('🛒 Starting enhanced checkout process...');
      
      // For "Pay Later" orders, use a special payment method
      const finalPaymentMethod = paymentTiming === PaymentTiming.LATER ? 'pay_later' : paymentMethod;
      const finalPaymentProof = paymentTiming === PaymentTiming.LATER ? null : paymentProofImage?.uri;

      // Use enhanced checkout service for complete payment tracking
      const result = await enhancedCheckoutService.processCheckout(
        cartItems,
        orderDetails,
        finalPaymentMethod,
        finalPaymentProof
      );

      if (!result.success) {
        throw new Error('Checkout process failed');
      }

      console.log('✅ Enhanced checkout completed:', result);

      const firstOrder = result.orders[0];

      // Card payments: open DPO gateway — cart cleared after payment confirmation
      if (finalPaymentMethod === PaymentMethod.CARD) {
        try {
          const { paymentUrl, transToken } = await createDPOToken(firstOrder.id, result.totalAmount);
          navigation.navigate('DPOWebView', {
            paymentUrl,
            transToken,
            orderId: firstOrder.id,
            totalAmount: result.totalAmount,
            isDeposit: hasOnOrderItems ? isDepositPayment : false,
          });
        } catch (dpoError) {
          console.error('❌ DPO token creation failed:', dpoError.message);
          Alert.alert(
            'Payment Gateway Error',
            'Could not connect to the payment gateway. Your order has been saved — please try again from your Orders screen.\n\nOrder ID: ' + firstOrder.id.slice(0, 8),
            [{ text: 'OK', onPress: () => navigation.navigate('Orders') }]
          );
        }
        return;
      }

      // All other methods: cart cleared immediately
      clearCart();

      navigation.navigate('OrderSuccess', {
        orderId: firstOrder.id,
        totalAmount: result.totalAmount,
        orderCount: result.orders.length,
        paymentTiming: paymentTiming,
        paymentMethod: finalPaymentMethod
      });

    } catch (error) {
      console.error('❌ Enhanced checkout failed:', error.message);

      // Fallback to original checkout method if enhanced fails (non-card only)
      if (finalPaymentMethod === PaymentMethod.CARD) {
        Alert.alert('Error', `Failed to place order: ${error.message}`);
        return;
      }

      console.log('🔄 Falling back to original checkout method...');
      try {
        await handleOriginalCheckout();
      } catch (fallbackError) {
        console.error('❌ Fallback checkout also failed:', fallbackError.message);
        Alert.alert('Error', `Failed to place order: ${fallbackError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Original checkout method as fallback
  const handleOriginalCheckout = async () => {
    const shopId = cartItems[0].shop_id;
    
    if (!shopId) {
      throw new Error('Shop information not found for products');
    }
    
    // Create order object
    const orderData = {
      buyer_id: user.id,
      shop_id: shopId,
      total_amount: total,
      status: 'pending',
      payment_method: paymentMethod,
      delivery_address: deliveryAddress,
      phone_number: phoneNumber,
      delivery_location: deliveryLocation,
      special_instructions: specialInstructions,
      delivery_fee: deliveryFeesTotal,
      runner_fee: runnerFeesTotal,
      transport_fee: transportFeesTotal,
      is_deposit_payment: hasOnOrderItems ? isDepositPayment : false,
      has_on_order_items: hasOnOrderItems,
      runner_fees_total: runnerFeesTotal,
      transport_fees_total: transportFeesTotal,
      transport_fees_paid: false,
      payment_status: 'unpaid',
      created_at: new Date().toISOString()
    };
    
    // Insert order into database
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: orderResult.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      runner_fee: item.runner_fee || 0,
      transport_fee: item.transport_fee || 0
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    // Clear cart and navigate
    clearCart();
    navigation.navigate('OrderSuccess', { orderId: orderResult.id });
  };
  
  // Render delivery step
  const renderDeliveryStep = () => {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Information</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Delivery Address *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', color: colors.text, borderColor: colors.border }]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter your delivery address"
            placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            multiline
            numberOfLines={2}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
          />
          {!deliveryAddress && (
            <Text style={{ color: '#ff6b6b', marginTop: 5, marginBottom: 10 }}>
              Delivery address is required
            </Text>
          )}

          <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Delivery Location</Text>
          <View style={styles.deliveryLocationContainer}>
            <TouchableOpacity
              style={[styles.locationOption, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }, deliveryLocation === 'local' && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#E6F2FF' }]}
              onPress={() => handleDeliveryLocationChange('local')}
            >
              <Text style={[styles.locationOptionText, { color: isDarkMode ? '#aaa' : '#555' }, deliveryLocation === 'local' && styles.locationOptionTextSelected]}>Local (Same Town)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationOption, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }, deliveryLocation === 'uptown' && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#E6F2FF' }]}
              onPress={() => handleDeliveryLocationChange('uptown')}
            >
              <Text style={[styles.locationOptionText, { color: isDarkMode ? '#aaa' : '#555' }, deliveryLocation === 'uptown' && styles.locationOptionTextSelected]}>Uptown</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationOption, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }, deliveryLocation === 'outoftown' && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#E6F2FF' }]}
              onPress={() => handleDeliveryLocationChange('outoftown')}
            >
              <Text style={[styles.locationOptionText, { color: isDarkMode ? '#aaa' : '#555' }, deliveryLocation === 'outoftown' && styles.locationOptionTextSelected]}>Out of Town</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationOption, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }, deliveryLocation === 'countrywide' && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#E6F2FF' }]}
              onPress={() => handleDeliveryLocationChange('countrywide')}
            >
              <Text style={[styles.locationOptionText, { color: isDarkMode ? '#aaa' : '#555' }, deliveryLocation === 'countrywide' && styles.locationOptionTextSelected]}>Country-Wide</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', color: colors.text, borderColor: colors.border }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Special Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', color: colors.text, borderColor: colors.border }]}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Any special delivery instructions"
            placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    );
  };
  
  // Render payment timing step
  const renderPaymentTimingStep = () => {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>When would you like to pay?</Text>
        <Text style={[styles.paymentInfo, { color: isDarkMode ? '#aaa' : '#666' }]}>
          Choose when you want to complete your payment for this order.
        </Text>

        <View style={styles.paymentTimingOptions}>
          <TouchableOpacity
            style={[
              styles.paymentTimingOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentTiming === PaymentTiming.NOW && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => setPaymentTiming(PaymentTiming.NOW)}
          >
            <View style={styles.paymentTimingIcon}>
              <Ionicons name="card" size={32} color="#4CAF50" />
            </View>
            <View style={styles.paymentTimingDetails}>
              <Text style={[styles.paymentTimingTitle, { color: colors.text }]}>Pay Now</Text>
              <Text style={[styles.paymentTimingDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>
                Complete payment immediately and we'll process your order right away.
              </Text>
              <View style={styles.paymentTimingBenefits}>
                <Text style={[styles.benefitText, { color: isDarkMode ? '#aaa' : '#666' }]}>✓ Immediate order processing</Text>
                <Text style={[styles.benefitText, { color: isDarkMode ? '#aaa' : '#666' }]}>✓ Faster delivery</Text>
                <Text style={[styles.benefitText, { color: isDarkMode ? '#aaa' : '#666' }]}>✓ Order confirmation</Text>
              </View>
            </View>
            {paymentTiming === PaymentTiming.NOW && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTimingOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentTiming === PaymentTiming.LATER && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => setPaymentTiming(PaymentTiming.LATER)}
          >
            <View style={styles.paymentTimingIcon}>
              <Ionicons name="time" size={32} color="#FF9800" />
            </View>
            <View style={styles.paymentTimingDetails}>
              <Text style={[styles.paymentTimingTitle, { color: colors.text }]}>Pay Later</Text>
              <Text style={[styles.paymentTimingDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>
                Place your order now and pay when it's ready for delivery.
              </Text>
              <View style={styles.paymentTimingBenefits}>
                <Text style={[styles.benefitText, { color: isDarkMode ? '#aaa' : '#666' }]}>✓ No immediate payment required</Text>
                <Text style={[styles.benefitText, { color: isDarkMode ? '#aaa' : '#666' }]}>✓ Pay on delivery</Text>
                <Text style={[styles.benefitText, { color: isDarkMode ? '#aaa' : '#666' }]}>✓ Flexible payment options</Text>
              </View>
            </View>
            {paymentTiming === PaymentTiming.LATER && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>

        {paymentTiming === PaymentTiming.LATER && (
          <View style={[styles.payLaterNote, { backgroundColor: isDarkMode ? 'rgba(255,152,0,0.15)' : '#FFF9C4' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
            <Text style={[styles.payLaterNoteText, { color: isDarkMode ? '#aaa' : '#666' }]}>
              With "Pay Later", your order will be held until payment is completed.
              You can pay via cash on delivery or any digital payment method when ready.
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  // Render payment step
  const renderPaymentStep = () => {
    // If user chose "Pay Later", show different content
    if (paymentTiming === PaymentTiming.LATER) {
      return (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment - Pay Later</Text>
          <View style={styles.payLaterSelectedContainer}>
            <Ionicons name="time-outline" size={48} color="#FF9800" />
            <Text style={[styles.payLaterSelectedTitle, { color: colors.text }]}>Payment Deferred</Text>
            <Text style={[styles.payLaterSelectedDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>
              You've chosen to pay later. Your order will be processed and you can pay when it's ready for delivery using any of the following methods:
            </Text>

            <View style={styles.futurePaymentMethods}>
              <Text style={[styles.futurePaymentTitle, { color: colors.text }]}>Available Payment Methods on Delivery:</Text>
              <View style={styles.futurePaymentList}>
                <Text style={[styles.futurePaymentItem, { color: isDarkMode ? '#aaa' : '#666' }]}>• Cash on Delivery</Text>
                <Text style={[styles.futurePaymentItem, { color: isDarkMode ? '#aaa' : '#666' }]}>• E-Wallet (Mobile Payment)</Text>
                <Text style={[styles.futurePaymentItem, { color: isDarkMode ? '#aaa' : '#666' }]}>• Pay to Cell</Text>
                <Text style={[styles.futurePaymentItem, { color: isDarkMode ? '#aaa' : '#666' }]}>• Bank Transfer</Text>
                <Text style={[styles.futurePaymentItem, { color: isDarkMode ? '#aaa' : '#666' }]}>• Easy Wallet</Text>
              </View>
            </View>

            <View style={[styles.payLaterReminder, { backgroundColor: isDarkMode ? 'rgba(255,152,0,0.15)' : '#FFF9C4' }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#FF9800" />
              <Text style={[styles.payLaterReminderText, { color: isDarkMode ? '#aaa' : '#666' }]}>
                We'll notify you when your order is ready for delivery and payment.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Original payment method selection for "Pay Now"
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
        <Text style={[styles.paymentInfo, { color: isDarkMode ? '#aaa' : '#666' }]}>
          Choose how you want to pay for your order right now.
          {hasOnOrderItems && ' For on-order items, only a 50% deposit is charged today.'}
        </Text>

        <View style={styles.paymentOptions}>
          {/* ── Credit/Debit Card via DPO ── */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentMethod === PaymentMethod.CARD && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.CARD)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="card" size={24} color="#1565C0" />
            </View>
            <View style={styles.paymentDetails}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.paymentTitle, { color: colors.text }]}>Credit/Debit Card</Text>
                <View style={styles.dpoBadge}>
                  <Text style={styles.dpoBadgeText}>DPO</Text>
                </View>
              </View>
              <Text style={[styles.paymentDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Visa, Mastercard — secure online payment</Text>
            </View>
            {paymentMethod === PaymentMethod.CARD && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentMethod === PaymentMethod.CASH && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.CASH)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Cash</Text>
              <Text style={[styles.paymentDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Pay with cash on delivery</Text>
            </View>
            {paymentMethod === PaymentMethod.CASH && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentMethod === PaymentMethod.EWALLET && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.EWALLET)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="wallet" size={24} color="#007AFF" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>E-Wallet</Text>
              <Text style={[styles.paymentDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Pay with digital wallet</Text>
            </View>
            {paymentMethod === PaymentMethod.EWALLET && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentMethod === PaymentMethod.PAY_TO_CELL && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.PAY_TO_CELL)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="phone-portrait" size={24} color="#FF9800" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Pay to Cell</Text>
              <Text style={[styles.paymentDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Mobile money transfer</Text>
            </View>
            {paymentMethod === PaymentMethod.PAY_TO_CELL && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentMethod === PaymentMethod.BANK_TRANSFER && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.BANK_TRANSFER)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="business" size={24} color="#2196F3" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Bank Transfer</Text>
              <Text style={[styles.paymentDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Direct bank transfer</Text>
            </View>
            {paymentMethod === PaymentMethod.BANK_TRANSFER && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border },
              paymentMethod === PaymentMethod.EASY_WALLET && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#f0f7ff' }
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.EASY_WALLET)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="card" size={24} color="#9C27B0" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>Easy Wallet</Text>
              <Text style={[styles.paymentDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Pay with Easy Wallet</Text>
            </View>
            {paymentMethod === PaymentMethod.EASY_WALLET && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Proof Upload — not required for cash or card (card uses DPO gateway) */}
        {paymentMethod && paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.CARD && (
          <View style={[styles.paymentProofSection, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f9fa', borderColor: colors.border }]}>
            <Text style={[styles.paymentProofTitle, { color: colors.text }]}>Payment Proof Required</Text>
            <Text style={[styles.paymentProofDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>
              Please upload a screenshot of your payment confirmation
            </Text>

            {!paymentProofImage ? (
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', borderColor: '#007AFF' }]}
                onPress={handleSelectPaymentProof}
              >
                <Ionicons name="cloud-upload" size={24} color="#007AFF" />
                <Text style={styles.uploadButtonText}>Upload Payment Proof</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.uploadedImageContainer}>
                <Image
                  source={{ uri: paymentProofImage.uri }}
                  style={styles.uploadedImage}
                />
                <TouchableOpacity
                  style={[styles.removeImageButton, { backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }]}
                  onPress={handleRemovePaymentProof}
                >
                  <Ionicons name="close-circle" size={24} color="#FF5722" />
                </TouchableOpacity>
                <Text style={styles.uploadedImageText}>Payment proof uploaded</Text>
              </View>
            )}
          </View>
        )}

        {hasOnOrderItems && (
          <View style={[styles.onOrderNote, { backgroundColor: isDarkMode ? 'rgba(255,152,0,0.15)' : '#FFF9C4' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
            <Text style={[styles.onOrderNoteText, { color: isDarkMode ? '#aaa' : '#666' }]}>
              {runnerFeesTotal > 0 ?
                "Your order contains on-order items. Runner fees are paid upfront while transport fees will be due on delivery." :
                "Your order contains on-order items that require a deposit. You can choose to pay in full or pay a 50% deposit now."}
            </Text>
          </View>
        )}

        {hasOnOrderItems && (
          <View style={[styles.depositOptionsContainer, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border }]}>
            <Text style={[styles.depositOptionsTitle, { color: colors.text }]}>Payment Option for On-Order Items:</Text>

            <TouchableOpacity
              style={[styles.depositOption, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderColor: colors.border }, !isDepositPayment && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#E6F2FF' }]}
              onPress={() => setIsDepositPayment(false)}
            >
              <View style={styles.depositOptionIcon}>
                <Ionicons name={!isDepositPayment ? "radio-button-on" : "radio-button-off"} size={24} color="#007AFF" />
              </View>
              <View style={styles.depositOptionDetails}>
                <Text style={[styles.depositOptionTitle, { color: colors.text }]}>Pay Full Amount</Text>
                <Text style={[styles.depositOptionDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Pay the entire amount now</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.depositOption, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderColor: colors.border }, isDepositPayment && { borderColor: '#007AFF', backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : '#E6F2FF' }]}
              onPress={() => setIsDepositPayment(true)}
            >
              <View style={styles.depositOptionIcon}>
                <Ionicons name={isDepositPayment ? "radio-button-on" : "radio-button-off"} size={24} color="#007AFF" />
              </View>
              <View style={styles.depositOptionDetails}>
                <Text style={[styles.depositOptionTitle, { color: colors.text }]}>Pay 50% Deposit</Text>
                <Text style={[styles.depositOptionDesc, { color: isDarkMode ? '#aaa' : '#666' }]}>Pay 50% now and the rest on delivery</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  // Render review step
  const renderReviewStep = () => {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Your Order</Text>

        <View style={[styles.reviewSection, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border }]}>
          <Text style={[styles.reviewSectionTitle, { color: colors.text }]}>Delivery Information</Text>
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Address:</Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>{deliveryAddress}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Phone:</Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>{phoneNumber}</Text>
          </View>
          {specialInstructions.trim() && (
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Instructions:</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{specialInstructions}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.editButton} onPress={() => setStep(1)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.reviewSection, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border }]}>
          <Text style={[styles.reviewSectionTitle, { color: colors.text }]}>Payment Method</Text>
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Method:</Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>
              {paymentMethod === PaymentMethod.CARD && 'Credit/Debit Card (DPO)'}
              {paymentMethod === PaymentMethod.CASH && 'Cash'}
              {paymentMethod === PaymentMethod.EWALLET && 'E-Wallet'}
              {paymentMethod === PaymentMethod.PAY_TO_CELL && 'Pay to Cell'}
              {paymentMethod === PaymentMethod.BANK_TRANSFER && 'Bank Transfer'}
              {paymentMethod === PaymentMethod.EASY_WALLET && 'Easy Wallet'}
            </Text>
          </View>

          {paymentProofImage && (
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Payment Proof:</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>Uploaded</Text>
            </View>
          )}

          <TouchableOpacity style={styles.editButton} onPress={() => setStep(2)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.reviewSection, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9', borderColor: colors.border }]}>
          <Text style={[styles.reviewSectionTitle, { color: colors.text }]}>Order Summary</Text>
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Items ({cartItems.length}):</Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>N${formatPrice(standardTotal)}</Text>
          </View>

          {runnerFeesTotal > 0 && (
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Runner Fees:</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>N${formatPrice(runnerFeesTotal)}</Text>
            </View>
          )}

          {onOrderTotal > 0 && (
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
                {isDepositPayment ? 'On-Order Deposit (50%):' : 'On-Order Items Total:'}
              </Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>N${formatPrice(onOrderTotal)}</Text>
            </View>
          )}

          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Shipping:</Text>
            <Text style={[styles.reviewValue, { color: colors.text }]}>N${formatPrice(shippingFee)}</Text>
          </View>

          <View style={[styles.totalItem, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total:</Text>
            <Text style={styles.totalValue}>N${formatPrice(total)}</Text>
          </View>

          {transportFeesTotal > 0 && (
            <View style={[styles.reviewItem, styles.futurePayment, { borderTopColor: colors.border }]}>
              <Text style={[styles.reviewLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Transport Fees (due on delivery):</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>N${formatPrice(transportFeesTotal)}</Text>
            </View>
          )}

          {hasOnOrderItems && (
            <View style={[styles.onOrderNote, { backgroundColor: isDarkMode ? 'rgba(255,152,0,0.15)' : '#FFF9C4' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
              <Text style={[styles.onOrderNoteText, { color: isDarkMode ? '#aaa' : '#666' }]}>
                {isDepositPayment ?
                  "You're paying a 50% deposit for on-order items. The remaining balance of N$" + formatPrice(fullOnOrderTotal - onOrderTotal) + " will be due when these items arrive." :
                  "You're paying in full for on-order items."}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderDeliveryStep();
      case 2:
        return renderPaymentTimingStep();
      case 3:
        return renderPaymentStep();
      case 4:
        return renderReviewStep();
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stepper */}
        <View style={[styles.stepper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.step, styles.stepActive]}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={[styles.stepLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Delivery</Text>
          </View>

          <View style={[styles.stepLine, { backgroundColor: isDarkMode ? '#444' : '#ddd' }, step >= 2 && styles.stepLineActive]} />

          <View style={[styles.step, step >= 2 && styles.stepActive]}>
            <View style={[styles.stepCircle, { backgroundColor: isDarkMode ? '#444' : '#ddd' }, step >= 2 && styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={[styles.stepLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Payment Timing</Text>
          </View>

          <View style={[styles.stepLine, { backgroundColor: isDarkMode ? '#444' : '#ddd' }, step >= 3 && styles.stepLineActive]} />

          <View style={[styles.step, step >= 3 && styles.stepActive]}>
            <View style={[styles.stepCircle, { backgroundColor: isDarkMode ? '#444' : '#ddd' }, step >= 3 && styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={[styles.stepLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Payment</Text>
          </View>

          <View style={[styles.stepLine, { backgroundColor: isDarkMode ? '#444' : '#ddd' }, step >= 4 && styles.stepLineActive]} />

          <View style={[styles.step, step >= 4 && styles.stepActive]}>
            <View style={[styles.stepCircle, { backgroundColor: isDarkMode ? '#444' : '#ddd' }, step >= 4 && styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>4</Text>
            </View>
            <Text style={[styles.stepLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>Review</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={[styles.content, { backgroundColor: colors.background }]}>
          {renderStep()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {step > 1 && (
            <Button
              title="Back"
              variant="outline"
              onPress={handlePrevStep}
              style={styles.backBtn}
            />
          )}
          
          {step < 4 ? (
            <Button
              title="Continue"
              variant="primary"
              onPress={handleNextStep}
              style={step > 1 ? styles.continueBtn : styles.fullWidthBtn}
            />
          ) : (
            <Button
              title={loading ? 'Processing...' : 'Place Order'}
              variant="primary"
              onPress={handlePlaceOrder}
              disabled={loading}
              style={styles.continueBtn}
              icon={loading ? () => <ActivityIndicator color="#FFF" size="small" /> : null}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  depositOptionsContainer: {
    marginTop: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  depositOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  depositOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  selectedDepositOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF',
  },
  depositOptionIcon: {
    marginRight: 12,
  },
  depositOptionDetails: {
    flex: 1,
  },
  depositOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  depositOptionDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deliveryLocationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginBottom: 15,
    gap: 8,
  },
  locationOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  locationOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF',
  },
  locationOptionText: {
    fontSize: 12,
    color: '#555',
  },
  locationOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
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
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  step: {
    alignItems: 'center',
  },
  stepActive: {
    opacity: 1,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepNumber: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 9.5,
    color: '#666',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  paymentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  paymentOptions: {
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  selectedPayment: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentDesc: {
    fontSize: 14,
    color: '#666',
  },
  dpoBadge: {
    backgroundColor: '#1565C0',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dpoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onOrderNote: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  onOrderNoteText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  reviewSection: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  totalItem: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    width: 100,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  backBtn: {
    flex: 1,
    marginRight: 8,
  },
  continueBtn: {
    flex: 2,
  },
  fullWidthBtn: {
    flex: 1,
  },
  futurePayment: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentProofSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paymentProofTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentProofDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadedImageContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  uploadedImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  uploadedImageText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentTimingOptions: {
    marginBottom: 16,
  },
  paymentTimingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  selectedPaymentTiming: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  paymentTimingIcon: {
    marginRight: 12,
  },
  paymentTimingDetails: {
    flex: 1,
  },
  paymentTimingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentTimingDesc: {
    fontSize: 14,
    color: '#666',
  },
  paymentTimingBenefits: {
    marginTop: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  payLaterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
  },
  payLaterNoteText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  payLaterSelectedContainer: {
    alignItems: 'center',
    padding: 16,
  },
  payLaterSelectedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  payLaterSelectedDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  futurePaymentMethods: {
    marginBottom: 16,
  },
  futurePaymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  futurePaymentList: {
    marginLeft: 16,
  },
  futurePaymentItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  payLaterReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
  },
  payLaterReminderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});

export default CheckoutScreen; 