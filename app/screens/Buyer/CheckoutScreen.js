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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import supabase from '../../lib/supabase';

const PaymentMethod = {
  CARD: 'card',
  CASH: 'cash',
};

const CheckoutScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { cartItems, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Order details
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('local'); // Default to local delivery
  const [isDepositPayment, setIsDepositPayment] = useState(false); // For 50% deposit payment option
  
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
      // Validate payment method
      if (!paymentMethod) {
        Alert.alert('Missing Information', 'Please select a payment method.');
        return;
      }
      
      setStep(3);
    }
  };
  
  // Go back to previous step
  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Place order
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
      // Check if cart has items to get shop_id
      if (cartItems.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Use the first item's shop_id (in real app would place separate orders per shop)
      const shopId = cartItems[0].shop_id;
      
      if (!shopId) {
        throw new Error('Shop information not found for products');
      }
      
      // Create order object with all required fields including delivery information
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
        runner_fees_total: runnerFeesTotal, // Match database column name
        transport_fees_total: transportFeesTotal, // Match database column name
        transport_fees_paid: false, // Initialize as unpaid
        payment_status: 'unpaid', // Set initial payment status
        created_at: new Date().toISOString()
      };
      
      console.log("Placing order with data:", JSON.stringify(orderData, null, 2));
      
      // Insert order into database
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      console.log("Order created with ID:", orderResult.id);
      
      // Create order items with their respective fees
      const orderItems = cartItems.map(item => ({
        order_id: orderResult.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        runner_fee: item.runner_fee || 0,
        transport_fee: item.transport_fee || 0
      }));
      
      // Insert order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Create notification for the seller
      // Attempt to create a notification, but don't let it block order completion
      // This is isolated in its own try-catch so it won't affect the main order flow
      let shopOwnerId = null;
      
      try {
        console.log('Fetching shop owner for shop ID:', shopId);
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', shopId)
          .single();

        if (shopError) {
          console.error('Error fetching shop owner:', shopError.message);
          return; // Exit notification creation but continue order flow
        }

        if (!shopData || !shopData.owner_id) {
          console.error('Shop owner not found for shop:', shopId);
          return; // Exit notification creation but continue order flow
        }

        shopOwnerId = shopData.owner_id;
        console.log('Found shop owner:', shopOwnerId);

        // Get the first product ID from the cart
        const firstProductId = cartItems.length > 0 ? cartItems[0].id : null;
        
        // Create notification data
        const notificationData = {
          user_id: shopOwnerId,
          type: 'new_order',
          message: `New order received (#${orderResult.id.slice(0, 8)})`,
          order_id: orderResult.id,
          shop_id: shopId,
          product_id: firstProductId,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Try to create notification but don't block on RLS errors
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (notifError) {
          // Log the error but continue with the order flow
          console.log('Note: Notification could not be sent due to permissions. This is expected and does not affect your order.');
          console.error('Notification error details:', notifError.message);
        } else {
          console.log('Notification sent to seller successfully');
        }
      } catch (error) {
        // Log any unexpected errors but don't block the order process
        console.error('Notification attempt failed:', error.message);
      }
      
      // Also add shipping info to a separate table if needed
      try {
        await supabase
          .from('shipping_info')
          .insert({
            order_id: orderResult.id,
            details: {
              address: deliveryAddress,
              phone: phoneNumber,
              instructions: specialInstructions,
              delivery_location: deliveryLocation
            }
          });
      } catch (shippingError) {
        console.log('Note: Could not save shipping info:', shippingError.message);
        // Continue anyway, this is not critical
      }
      
      // Clear cart
      clearCart();
      
      // Navigate to success screen with order details
      navigation.navigate('OrderSuccess', { orderId: orderResult.id });
      
    } catch (error) {
      console.error('Error placing order:', error.message);
      Alert.alert('Error', `Failed to place order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Render delivery step
  const renderDeliveryStep = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Address *</Text>
          <TextInput
            style={styles.input}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter your delivery address"
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
          
          <Text style={styles.inputLabel}>Delivery Location</Text>
          <View style={styles.deliveryLocationContainer}>
            <TouchableOpacity 
              style={[styles.locationOption, deliveryLocation === 'local' && styles.locationOptionSelected]}
              onPress={() => handleDeliveryLocationChange('local')}
            >
              <Text style={[styles.locationOptionText, deliveryLocation === 'local' && styles.locationOptionTextSelected]}>Local (Same Town)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.locationOption, deliveryLocation === 'uptown' && styles.locationOptionSelected]}
              onPress={() => handleDeliveryLocationChange('uptown')}
            >
              <Text style={[styles.locationOptionText, deliveryLocation === 'uptown' && styles.locationOptionTextSelected]}>Uptown</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.locationOption, deliveryLocation === 'outoftown' && styles.locationOptionSelected]}
              onPress={() => handleDeliveryLocationChange('outoftown')}
            >
              <Text style={[styles.locationOptionText, deliveryLocation === 'outoftown' && styles.locationOptionTextSelected]}>Out of Town</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.locationOption, deliveryLocation === 'countrywide' && styles.locationOptionSelected]}
              onPress={() => handleDeliveryLocationChange('countrywide')}
            >
              <Text style={[styles.locationOptionText, deliveryLocation === 'countrywide' && styles.locationOptionTextSelected]}>Country-Wide</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Special Instructions (Optional)</Text>
          <TextInput
            style={styles.input}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Any special delivery instructions"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    );
  };
  
  // Render payment step
  const renderPaymentStep = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <Text style={styles.paymentInfo}>
          Choose how you want to pay for your order.
          {hasOnOrderItems && ' For on-order items, only a 50% deposit is charged today.'}
        </Text>
        
        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === PaymentMethod.CARD && styles.selectedPayment
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.CARD)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="card" size={24} color="#007AFF" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Card</Text>
              <Text style={styles.paymentDesc}>Pay with credit or debit card</Text>
            </View>
            {paymentMethod === PaymentMethod.CARD && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === PaymentMethod.CASH && styles.selectedPayment
            ]}
            onPress={() => handleSelectPaymentMethod(PaymentMethod.CASH)}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Cash</Text>
              <Text style={styles.paymentDesc}>Pay with cash on delivery</Text>
            </View>
            {paymentMethod === PaymentMethod.CASH && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
        
        {hasOnOrderItems && (
          <View style={styles.onOrderNote}>
            <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
            <Text style={styles.onOrderNoteText}>
              {runnerFeesTotal > 0 ? 
                "Your order contains on-order items. Runner fees are paid upfront while transport fees will be due on delivery." :
                "Your order contains on-order items that require a deposit. You can choose to pay in full or pay a 50% deposit now."}
            </Text>
          </View>
        )}
        
        {hasOnOrderItems && (
          <View style={styles.depositOptionsContainer}>
            <Text style={styles.depositOptionsTitle}>Payment Option for On-Order Items:</Text>
            
            <TouchableOpacity 
              style={[styles.depositOption, !isDepositPayment && styles.selectedDepositOption]}
              onPress={() => setIsDepositPayment(false)}
            >
              <View style={styles.depositOptionIcon}>
                <Ionicons name={!isDepositPayment ? "radio-button-on" : "radio-button-off"} size={24} color="#007AFF" />
              </View>
              <View style={styles.depositOptionDetails}>
                <Text style={styles.depositOptionTitle}>Pay Full Amount</Text>
                <Text style={styles.depositOptionDesc}>Pay the entire amount now</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.depositOption, isDepositPayment && styles.selectedDepositOption]}
              onPress={() => setIsDepositPayment(true)}
            >
              <View style={styles.depositOptionIcon}>
                <Ionicons name={isDepositPayment ? "radio-button-on" : "radio-button-off"} size={24} color="#007AFF" />
              </View>
              <View style={styles.depositOptionDetails}>
                <Text style={styles.depositOptionTitle}>Pay 50% Deposit</Text>
                <Text style={styles.depositOptionDesc}>Pay 50% now and the rest on delivery</Text>
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Your Order</Text>
        
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Delivery Information</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Address:</Text>
            <Text style={styles.reviewValue}>{deliveryAddress}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Phone:</Text>
            <Text style={styles.reviewValue}>{phoneNumber}</Text>
          </View>
          {specialInstructions.trim() && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Instructions:</Text>
              <Text style={styles.reviewValue}>{specialInstructions}</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.editButton} onPress={() => setStep(1)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Payment Method</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Method:</Text>
            <Text style={styles.reviewValue}>
              {paymentMethod === PaymentMethod.CARD && 'Card'}
              {paymentMethod === PaymentMethod.CASH && 'Cash'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={() => setStep(2)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Order Summary</Text>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Items ({cartItems.length}):</Text>
            <Text style={styles.reviewValue}>N${formatPrice(standardTotal)}</Text>
          </View>
          
          {runnerFeesTotal > 0 && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Runner Fees:</Text>
              <Text style={styles.reviewValue}>N${formatPrice(runnerFeesTotal)}</Text>
            </View>
          )}
          
          {onOrderTotal > 0 && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {isDepositPayment ? 'On-Order Deposit (50%):' : 'On-Order Items Total:'}
              </Text>
              <Text style={styles.reviewValue}>N${formatPrice(onOrderTotal)}</Text>
            </View>
          )}
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Shipping:</Text>
            <Text style={styles.reviewValue}>N${formatPrice(shippingFee)}</Text>
          </View>
          
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>N${formatPrice(total)}</Text>
          </View>
          
          {transportFeesTotal > 0 && (
            <View style={[styles.reviewItem, styles.futurePayment]}>
              <Text style={styles.reviewLabel}>Transport Fees (due on delivery):</Text>
              <Text style={styles.reviewValue}>N${formatPrice(transportFeesTotal)}</Text>
            </View>
          )}
          
          {hasOnOrderItems && (
            <View style={styles.onOrderNote}>
              <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
              <Text style={styles.onOrderNoteText}>
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
        return renderPaymentStep();
      case 3:
        return renderReviewStep();
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Stepper */}
        <View style={styles.stepper}>
          <View style={[styles.step, styles.stepActive]}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepLabel}>Delivery</Text>
          </View>
          
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          
          <View style={[styles.step, step >= 2 && styles.stepActive]}>
            <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Payment</Text>
          </View>
          
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          
          <View style={[styles.step, step >= 3 && styles.stepActive]}>
            <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Review</Text>
          </View>
        </View>
        
        {/* Content */}
        <ScrollView style={styles.content}>
          {renderStep()}
        </ScrollView>
        
        {/* Footer */}
        <View style={styles.footer}>
          {step > 1 && (
            <Button
              title="Back"
              variant="outline"
              onPress={handlePrevStep}
              style={styles.backBtn}
            />
          )}
          
          {step < 3 ? (
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
    fontSize: 12,
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
});

export default CheckoutScreen; 