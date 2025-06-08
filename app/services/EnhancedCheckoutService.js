// Enhanced Checkout Service with Complete Payment Tracking
import supabase from '../lib/supabase';

export class EnhancedCheckoutService {
  
  /**
   * Process complete checkout - each shop order individually
   */
  async processCheckout(cartItems, orderDetails, paymentMethod, paymentProofImage = null) {
    try {
      console.log('🛒 Starting enhanced checkout process...');
      
      // Validate payment method
      const allowedPaymentMethods = ['cash', 'ewallet', 'pay_to_cell', 'bank_transfer', 'easy_wallet'];
      if (!allowedPaymentMethods.includes(paymentMethod.toLowerCase())) {
        throw new Error(`Payment method '${paymentMethod}' is not supported. Use: ${allowedPaymentMethods.join(', ')}`);
      }
      
      // Group items by shop
      const itemsByShop = this.groupItemsByShop(cartItems);
      const createdOrders = [];
      
      // Process each shop's order individually
      for (const [shopId, items] of Object.entries(itemsByShop)) {
        console.log(`📦 Processing individual order for shop: ${shopId}`);
        
        try {
          // Create order
          const order = await this.createOrder(shopId, items, orderDetails, paymentMethod);
          
          // Create order items
          await this.createOrderItems(order.id, items);
          
          // For non-cash payments, try to upload payment proof
          if (paymentMethod.toLowerCase() !== 'cash' && paymentProofImage) {
            try {
              await this.uploadPaymentProof(order.id, paymentProofImage);
            } catch (proofError) {
              console.log('⚠️ Payment proof upload failed, continuing without it:', proofError.message);
            }
          }
          
          // Process payment tracking (but don't mark as paid until proof verified)
          const paymentResult = await this.processPaymentWithTracking(order, paymentMethod !== 'cash');
          
          // Send notifications
          await this.sendNotifications(order, paymentResult, paymentMethod);
          
          createdOrders.push({
            ...order,
            paymentResult,
            requiresPaymentProof: paymentMethod.toLowerCase() !== 'cash'
          });
          
        } catch (shopError) {
          console.error(`❌ Failed to process order for shop ${shopId}:`, shopError);
          // Continue with other shops, don't fail entire checkout
          createdOrders.push({
            shopId,
            error: shopError.message,
            failed: true
          });
        }
      }
      
      const successfulOrders = createdOrders.filter(order => !order.failed);
      const failedOrders = createdOrders.filter(order => order.failed);
      
      console.log(`✅ Checkout completed: ${successfulOrders.length} successful, ${failedOrders.length} failed`);
      
      return {
        success: successfulOrders.length > 0,
        orders: successfulOrders,
        failedOrders: failedOrders,
        totalAmount: successfulOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        requiresPaymentProof: paymentMethod.toLowerCase() !== 'cash'
      };
      
    } catch (error) {
      console.error('❌ Checkout failed:', error);
      throw error;
    }
  }
  
  /**
   * Group cart items by shop
   */
  groupItemsByShop(cartItems) {
    return cartItems.reduce((groups, item) => {
      const shopId = item.shop_id;
      if (!groups[shopId]) {
        groups[shopId] = [];
      }
      groups[shopId].push(item);
      return groups;
    }, {});
  }
  
  /**
   * Create order in orders table
   */
  async createOrder(shopId, items, orderDetails, paymentMethod) {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const deliveryFee = this.calculateDeliveryFee(items, orderDetails.deliveryLocation);
    const runnerFees = this.calculateRunnerFees(items);
    const transportFees = this.calculateTransportFees(items);
    const totalAmount = subtotal + deliveryFee + runnerFees;
    
    // Check if order has on-order items
    const hasOnOrderItems = items.some(item => !item.in_stock);
    
    const orderData = {
      buyer_id: (await supabase.auth.getUser()).data.user.id,
      shop_id: shopId,
      total_amount: totalAmount,
      status: 'pending',
      payment_method: paymentMethod,
      payment_status: 'unpaid',
      delivery_address: orderDetails.deliveryAddress,
      phone_number: orderDetails.phoneNumber,
      delivery_location: orderDetails.deliveryLocation,
      special_instructions: orderDetails.specialInstructions,
      delivery_fee: deliveryFee,
      runner_fee: runnerFees,
      transport_fee: transportFees,
      runner_fees_total: runnerFees,
      transport_fees_total: transportFees,
      transport_fees_paid: false,
      has_on_order_items: hasOnOrderItems,
      is_deposit_payment: hasOnOrderItems && orderDetails.isDepositPayment,
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Creating order:', orderData);
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
      
    if (error) throw error;
    
    return order;
  }
  
  /**
   * Create order items in order_items table
   */
  async createOrderItems(orderId, items) {
    const orderItems = items.map(item => ({
      order_id: orderId,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      runner_fee: item.runner_fee || 0,
      transport_fee: item.transport_fee || 0
    }));
    
    console.log('📋 Creating order items:', orderItems.length);
    
    const { error } = await supabase
      .from('order_items')
      .insert(orderItems);
      
    if (error) throw error;
    
    return orderItems;
  }
  
  /**
   * Upload payment proof screenshot
   */
  async uploadPaymentProof(orderId, imageUri) {
    try {
      console.log('📸 Uploading payment proof to bucket...');
      
      // Create file name with timestamp
      const timestamp = Date.now();
      const fileName = `payment-proof-${orderId}-${timestamp}.jpg`;
      
      console.log('📤 Uploading to payment-proofs bucket...');
      
      // Read the file as blob for Supabase upload
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      console.log('📦 File size:', arrayBuffer.byteLength, 'bytes');
      
      // Upload to Supabase storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);
      
      console.log('🔗 Public URL generated:', urlData.publicUrl);
      
      // Verify the image is accessible
      try {
        const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log('🔍 Image accessibility test:', testResponse.status, testResponse.ok);
      } catch (testError) {
        console.log('⚠️ Image accessibility test failed:', testError.message);
      }
      
      // Save payment proof info to order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_proof_url: urlData.publicUrl,
          payment_proof_uploaded_at: new Date().toISOString(),
          payment_status: 'proof_submitted'
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      // Also add the proof as a message in the order chat
      await this.addPaymentProofToChat(orderId, urlData.publicUrl);
      
      console.log('✅ Payment proof uploaded successfully');
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('❌ Payment proof upload failed:', error);
      
      // Fallback: still mark as submitted even if upload fails
      console.log('🔄 Marking as submitted without file upload...');
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_proof_url: `failed-upload-${orderId}`,
          payment_proof_uploaded_at: new Date().toISOString(),
          payment_status: 'proof_submitted'
        })
        .eq('id', orderId);
      
      return null;
    }
  }

  /**
   * Add payment proof as a message in order chat
   */
  async addPaymentProofToChat(orderId, imageUrl) {
    try {
      console.log('💬 Adding payment proof to order chat...');
      
      // Get current user (buyer)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      // Add message to order_comments table (this is the existing chat table)
      const { error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: userData.user.id,
          message: `💳 Payment proof uploaded. Click to view: ${imageUrl}`,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to add payment proof to chat:', error);
      } else {
        console.log('✅ Payment proof added to order chat');
      }
    } catch (error) {
      console.error('Error adding payment proof to chat:', error);
    }
  }

  /**
   * Process payment and create all payment tracking records
   */
  async processPaymentWithTracking(order, requiresVerification = false) {
    try {
      console.log('💳 Processing payment with full tracking...');
      
      // Simulate payment processing (replace with real payment gateway)
      const paymentSuccess = await this.simulatePaymentProcessing(order);
      
      if (!paymentSuccess) {
        throw new Error('Payment processing failed');
      }
      
      // For cash payments, process immediately
      // For other payments, wait for verification
      if (!requiresVerification) {
        // Use database function to process payment (bypasses RLS issues)
        console.log('💰 Processing cash payment via database function');
        
        const { data: result, error } = await supabase
          .rpc('process_order_payment', {
            order_uuid: order.id
          });
        
        if (error) {
          console.log('⚠️ Database function failed, trying direct insert method...');
          // Fallback to direct insert method
          return await this.processPaymentDirectInsert(order, false);
        }
        
        if (!result.success) {
          throw new Error(result.error || 'Payment processing failed');
        }
        
        console.log('✅ Cash payment completed via database function');
        
        return {
          paymentId: result.payment_id,
          totalAmount: result.total_amount,
          sellerAmount: result.seller_amount,
          platformFee: result.platform_fee,
          status: 'completed'
        };
      } else {
        // For non-cash payments, create pending payment record
        console.log('💰 Creating pending payment record (awaiting verification)');
        
        return await this.processPaymentDirectInsert(order, true);
      }
      
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      throw error;
    }
  }
  
  /**
   * Fallback method using direct inserts
   */
  async processPaymentDirectInsert(order, isPending = false) {
    // Calculate platform fee (5%)
    const platformFeeRate = 0.05;
    const platformFee = order.total_amount * platformFeeRate;
    const sellerAmount = order.total_amount - platformFee;
    
    // 1. Create payment record in payments table
    const paymentRecord = await this.createPaymentRecord(order, sellerAmount, platformFee, isPending);
    
    if (!isPending) {
      // 2. Create platform transaction record (only for completed payments)
      await this.createPlatformTransaction(order, paymentRecord.id, platformFee);
      
      // 3. Update order payment status
      await this.updateOrderPaymentStatus(order.id, 'paid');
    } else {
      // For pending payments, update order to awaiting verification
      await this.updateOrderPaymentStatus(order.id, 'proof_submitted');
    }
    
    return {
      paymentId: paymentRecord.id,
      totalAmount: order.total_amount,
      sellerAmount: sellerAmount,
      platformFee: platformFee,
      status: isPending ? 'pending' : 'completed'
    };
  }
  
  /**
   * Create payment record in payments table
   */
  async createPaymentRecord(order, sellerAmount, platformFee, isPending = false) {
    const paymentData = {
      order_id: order.id,
      shop_id: order.shop_id,
      buyer_id: order.buyer_id,
      total_amount: order.total_amount,
      seller_amount: sellerAmount,
      platform_fee: platformFee,
      payment_method: order.payment_method,
      payment_provider: this.getPaymentProvider(order.payment_method),
      status: isPending ? 'pending' : 'completed',
      processed_at: isPending ? null : new Date().toISOString(),
      completed_at: isPending ? null : new Date().toISOString()
    };
    
    console.log('💰 Creating payment record');
    
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();
      
    if (error) throw error;
    
    return payment;
  }

  /**
   * Get payment provider based on method
   */
  getPaymentProvider(paymentMethod) {
    const providers = {
      'cash': 'cash',
      'ewallet': 'ewallet',
      'pay_to_cell': 'mobile_money',
      'bank_transfer': 'bank',
      'easy_wallet': 'easy_wallet'
    };
    return providers[paymentMethod.toLowerCase()] || 'other';
  }
  
  /**
   * Create platform transaction record
   */
  async createPlatformTransaction(order, paymentId, platformFee) {
    const transactionData = {
      type: 'commission',
      amount: platformFee,
      currency: 'USD',
      order_id: order.id,
      shop_id: order.shop_id,
      payment_id: paymentId,
      description: `Platform commission from order #${order.id.slice(0, 8)}`,
      metadata: {
        commission_rate: 0.05,
        order_total: order.total_amount
      }
    };
    
    console.log('🏢 Creating platform transaction');
    
    const { error } = await supabase
      .from('platform_transactions')
      .insert(transactionData);
      
    if (error) throw error;
  }
  
  /**
   * Update order payment status
   */
  async updateOrderPaymentStatus(orderId, paymentStatus = 'paid') {
    const updateData = {
      payment_status: paymentStatus
    };

    // Only set payment date and processing status for completed payments
    if (paymentStatus === 'paid') {
      updateData.payment_date = new Date().toISOString();
      updateData.status = 'processing';
    } else if (paymentStatus === 'proof_submitted') {
      updateData.status = 'pending_payment_verification';
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
      
    if (error) throw error;
  }
  
  /**
   * Send notifications to seller and buyer
   */
  async sendNotifications(order, paymentResult, paymentMethod) {
    try {
      // Get shop details
      const { data: shop } = await supabase
        .from('shops')
        .select('owner_id, name')
        .eq('id', order.shop_id)
        .single();
        
      if (!shop) return;
      
      const isCashPayment = paymentMethod.toLowerCase() === 'cash';
      
      // Notification to seller
      const sellerMessage = isCashPayment 
        ? `New cash order received for ${shop.name} - $${order.total_amount.toFixed(2)}`
        : `New order received for ${shop.name} - $${order.total_amount.toFixed(2)} (Payment proof required)`;
        
      await supabase
        .from('notifications')
        .insert({
          user_id: shop.owner_id,
          type: 'new_order',
          message: sellerMessage,
          order_id: order.id,
          shop_id: order.shop_id
        });
      
      // Notification to buyer
      const buyerMessage = isCashPayment
        ? `Your order #${order.id.slice(0, 8)} has been confirmed - Cash payment on delivery`
        : `Your order #${order.id.slice(0, 8)} has been confirmed - Please upload payment proof in order chat`;
        
      await supabase
        .from('notifications')
        .insert({
          user_id: order.buyer_id,
          type: 'order_confirmed',
          message: buyerMessage,
          order_id: order.id
        });
        
      console.log('📧 Notifications sent');
      
    } catch (error) {
      console.log('⚠️ Notification sending failed (non-critical):', error.message);
    }
  }
  
  /**
   * Simulate payment processing (replace with real payment gateway)
   */
  async simulatePaymentProcessing(order) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 95% success rate
    return Math.random() > 0.05;
  }
  
  /**
   * Calculate delivery fees
   */
  calculateDeliveryFee(items, deliveryLocation) {
    let totalDeliveryFee = 0;
    
    items.forEach(item => {
      if (!item.in_stock) {
        let itemDeliveryFee = 0;
        
        switch (deliveryLocation) {
          case 'local':
            itemDeliveryFee = item.delivery_fee_local || 0;
            break;
          case 'uptown':
            itemDeliveryFee = item.delivery_fee_uptown || 0;
            break;
          case 'outoftown':
            itemDeliveryFee = item.delivery_fee_outoftown || 0;
            break;
          case 'countrywide':
            itemDeliveryFee = item.delivery_fee_countrywide || 0;
            break;
        }
        
        // Check for free delivery threshold
        const itemTotal = item.price * item.quantity;
        if (item.free_delivery_threshold && itemTotal >= item.free_delivery_threshold) {
          itemDeliveryFee = 0;
        }
        
        totalDeliveryFee += itemDeliveryFee * item.quantity;
      }
    });
    
    return totalDeliveryFee;
  }
  
  /**
   * Calculate runner fees
   */
  calculateRunnerFees(items) {
    return items.reduce((total, item) => {
      if (!item.in_stock && item.runner_fee) {
        return total + (item.runner_fee * item.quantity);
      }
      return total;
    }, 0);
  }
  
  /**
   * Calculate transport fees
   */
  calculateTransportFees(items) {
    return items.reduce((total, item) => {
      if (!item.in_stock && item.transport_fee) {
        return total + (item.transport_fee * item.quantity);
      }
      return total;
    }, 0);
  }
  
  /**
   * Get order with complete payment details
   */
  async getOrderWithPaymentDetails(orderId) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        ),
        payments (*),
        shops (
          id,
          name,
          owner_id
        ),
        profiles (
          id,
          firstname,
          lastname,
          email
        )
      `)
      .eq('id', orderId)
      .single();
      
    if (error) throw error;
    
    return data;
  }
}

export const enhancedCheckoutService = new EnhancedCheckoutService(); 