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
  
  // Order totals
  const [standardTotal, setStandardTotal] = useState(0);
  const [onOrderTotal, setOnOrderTotal] = useState(0);
  const [hasOnOrderItems, setHasOnOrderItems] = useState(false);
  const [shippingFee, setShippingFee] = useState(50); // Default shipping fee
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Calculate order totals
  useEffect(() => {
    let standardSum = 0;
    let onOrderSum = 0;
    let hasOnOrder = false;
    
    cartItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      
      if (item.in_stock) {
        standardSum += itemTotal;
      } else {
        hasOnOrder = true;
        // For on-order items, we only calculate 50% deposit at checkout
        onOrderSum += itemTotal * 0.5;
      }
    });
    
    const calculatedTax = (standardSum + onOrderSum) * 0.15; // 15% tax
    
    setStandardTotal(standardSum);
    setOnOrderTotal(onOrderSum);
    setHasOnOrderItems(hasOnOrder);
    setTax(calculatedTax);
    setTotal(standardSum + onOrderSum + shippingFee + calculatedTax);
  }, [cartItems, shippingFee]);
  
  // Format currency
  const formatPrice = (price) => {
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
  
  // Go to next step
  const handleNextStep = () => {
    if (step === 1) {
      // Validate delivery information
      if (!deliveryAddress.trim()) {
        Alert.alert('Missing Information', 'Please enter your delivery address.');
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
      
      // Create order object with minimal fields and required shop_id
      const orderData = {
        buyer_id: user.id,
        shop_id: shopId,  // Add shop_id which is required
        total_amount: total,
        status: 'pending',
        payment_method: paymentMethod,
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
      
      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: orderResult.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));
      
      // Insert order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Create notification for the seller
      try {
        console.log('Fetching shop owner for shop ID:', shopId);
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', shopId)
          .single();

        if (shopError) {
          console.error('Error fetching shop owner:', shopError.message);
          throw shopError;
        }

        if (!shopData || !shopData.owner_id) {
          console.error('Shop owner not found for shop:', shopId);
          throw new Error('Shop owner not found');
        }

        console.log('Found shop owner:', shopData.owner_id);

        // Get the first product ID from the cart
        const firstProductId = cartItems.length > 0 ? cartItems[0].id : null;
        console.log('First product ID:', firstProductId);

        // Create notification data
        const notificationData = {
          user_id: shopData.owner_id,
          type: 'new_order',
          message: `New order received (#${orderResult.id.slice(0, 8)})`,
          order_id: orderResult.id,
          shop_id: shopId,
          product_id: firstProductId,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating notification with data:', notificationData);

        // Use the existing supabase client
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select();

        if (notifError) {
          console.error('Error creating notification:', notifError.message);
          throw notifError;
        }

        console.log('Notification created successfully:', notifData);
      } catch (error) {
        console.error('Failed to create notification:', error.message);
        Alert.alert('Note', 'Order placed but notification to seller could not be sent.');
      }
      
      // Also add shipping info to a separate table if needed
      try {
        await supabase
          .from('shipping_info')
          .insert({
            order_id: orderResult.id,
            address: deliveryAddress,
            phone: phoneNumber,
            instructions: specialInstructions
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
          <Text style={styles.inputLabel}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter your full delivery address"
            multiline
            numberOfLines={3}
          />
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
              Your order contains on-order items that require a 50% deposit. The remaining balance will be due when these items arrive.
            </Text>
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
            <Text style={styles.reviewValue}>N${formatPrice(standardTotal + onOrderTotal * 2)}</Text>
          </View>
          {hasOnOrderItems && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>On-Order Discount:</Text>
              <Text style={styles.reviewValue}>-N${formatPrice(onOrderTotal)}</Text>
            </View>
          )}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Shipping:</Text>
            <Text style={styles.reviewValue}>N${formatPrice(shippingFee)}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Tax (15%):</Text>
            <Text style={styles.reviewValue}>N${formatPrice(tax)}</Text>
          </View>
          
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>N${formatPrice(total)}</Text>
          </View>
          
          {hasOnOrderItems && (
            <View style={styles.onOrderNote}>
              <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
              <Text style={styles.onOrderNoteText}>
                You're paying a 50% deposit for on-order items. The remaining balance will be due when these items arrive.
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
});

export default CheckoutScreen; 