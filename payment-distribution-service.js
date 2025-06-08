// Payment Distribution Service
import { supabase } from '../lib/supabase';

export class PaymentDistributionService {
  
  /**
   * Distribute payments to sellers after successful order completion
   * This would typically be called when order status changes to 'delivered'
   */
  async distributePayments(orderId) {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          shops (
            id,
            name,
            owner_id,
            profiles (
              id,
              email,
              firstname,
              lastname
            )
          )
        `)
        .eq('id', orderId)
        .single();
        
      if (orderError) throw orderError;
      
      // Calculate platform fee (e.g., 5% of order total)
      const platformFeeRate = 0.05; // 5%
      const platformFee = order.total_amount * platformFeeRate;
      const sellerAmount = order.total_amount - platformFee;
      
      // Process payment to seller
      await this.processSellerPayment(order, sellerAmount, platformFee);
      
      // Update seller stats
      await this.updateSellerStats(order.shop_id, sellerAmount);
      
      // Create payment record
      await this.createPaymentRecord(order, sellerAmount, platformFee);
      
      return {
        success: true,
        orderId: orderId,
        totalAmount: order.total_amount,
        platformFee: platformFee,
        sellerAmount: sellerAmount
      };
      
    } catch (error) {
      console.error('Payment distribution failed:', error);
      throw error;
    }
  }
  
  /**
   * Process payment to seller (integrate with payment provider)
   */
  async processSellerPayment(order, amount, platformFee) {
    // Here you would integrate with payment providers like:
    // - Stripe Connect
    // - PayPal Marketplace
    // - Bank transfer APIs
    
    console.log(`Processing payment to seller:`, {
      shopId: order.shop_id,
      shopName: order.shops.name,
      sellerEmail: order.shops.profiles.email,
      amount: amount,
      platformFee: platformFee
    });
    
    // Simulate payment processing
    // In real implementation, you'd call your payment provider's API
    
    // Send notification to seller
    await supabase
      .from('notifications')
      .insert({
        user_id: order.shops.owner_id,
        type: 'payment_received',
        message: `Payment of $${amount.toFixed(2)} received for order #${order.id}`,
        order_id: order.id
      });
  }
  
  /**
   * Update seller statistics
   */
  async updateSellerStats(shopId, amount) {
    const { error } = await supabase
      .from('seller_stats')
      .update({
        total_revenue: supabase.raw(`total_revenue + ${amount}`),
        last_updated: new Date().toISOString()
      })
      .eq('shop_id', shopId);
      
    if (error) throw error;
  }
  
  /**
   * Create payment record for tracking
   */
  async createPaymentRecord(order, sellerAmount, platformFee) {
    // You might want to create a payments table for this
    const paymentRecord = {
      order_id: order.id,
      shop_id: order.shop_id,
      seller_amount: sellerAmount,
      platform_fee: platformFee,
      total_amount: order.total_amount,
      payment_date: new Date().toISOString(),
      status: 'completed'
    };
    
    // Store in a payments table (you'd need to create this)
    console.log('Payment record created:', paymentRecord);
  }
  
  /**
   * Get seller earnings summary
   */
  async getSellerEarnings(shopId, startDate, endDate) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('payment_status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);
      
    if (error) throw error;
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const platformFeeRate = 0.05;
    const totalPlatformFees = totalRevenue * platformFeeRate;
    const netEarnings = totalRevenue - totalPlatformFees;
    
    return {
      totalOrders: orders.length,
      totalRevenue: totalRevenue,
      platformFees: totalPlatformFees,
      netEarnings: netEarnings,
      orders: orders
    };
  }
  
  /**
   * Process bulk payments for multiple completed orders
   */
  async processBulkPayments(orderIds) {
    const results = [];
    
    for (const orderId of orderIds) {
      try {
        const result = await this.distributePayments(orderId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          orderId: orderId,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

export const paymentDistributionService = new PaymentDistributionService(); 