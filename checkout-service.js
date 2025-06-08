// Multi-Shop Checkout Service
import { supabase } from '../lib/supabase';

export class CheckoutService {
  
  /**
   * Process checkout for items from multiple shops
   * @param {Array} cartItems - Array of cart items with shop_id
   * @param {Object} shippingAddress - Delivery address
   * @param {string} paymentMethod - Payment method
   */
  async processMultiShopCheckout(cartItems, shippingAddress, paymentMethod) {
    try {
      // Group items by shop
      const itemsByShop = this.groupItemsByShop(cartItems);
      
      // Create orders for each shop
      const orders = [];
      const orderPromises = [];
      
      for (const [shopId, items] of Object.entries(itemsByShop)) {
        const orderPromise = this.createShopOrder(shopId, items, shippingAddress, paymentMethod);
        orderPromises.push(orderPromise);
      }
      
      // Execute all order creations
      const createdOrders = await Promise.all(orderPromises);
      
      // Process payments for each order
      const paymentPromises = createdOrders.map(order => 
        this.processPayment(order)
      );
      
      await Promise.all(paymentPromises);
      
      return {
        success: true,
        orders: createdOrders,
        totalAmount: createdOrders.reduce((sum, order) => sum + order.total_amount, 0)
      };
      
    } catch (error) {
      console.error('Checkout failed:', error);
      throw error;
    }
  }
  
  /**
   * Group cart items by shop
   */
  groupItemsByShop(cartItems) {
    return cartItems.reduce((groups, item) => {
      const shopId = item.product.shop_id;
      if (!groups[shopId]) {
        groups[shopId] = [];
      }
      groups[shopId].push(item);
      return groups;
    }, {});
  }
  
  /**
   * Create order for a specific shop
   */
  async createShopOrder(shopId, items, shippingAddress, paymentMethod) {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    const deliveryFee = await this.calculateDeliveryFee(shopId, shippingAddress);
    const totalAmount = subtotal + deliveryFee;
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: (await supabase.auth.getUser()).data.user.id,
        shop_id: shopId,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        delivery_fee: deliveryFee,
        status: 'pending',
        payment_status: 'unpaid'
      })
      .select()
      .single();
      
    if (orderError) throw orderError;
    
    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
      
    if (itemsError) throw itemsError;
    
    return { ...order, items: orderItems };
  }
  
  /**
   * Process payment for an order
   */
  async processPayment(order) {
    // Here you would integrate with your payment provider
    // For now, we'll simulate successful payment
    
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_date: new Date().toISOString()
      })
      .eq('id', order.id);
      
    if (error) throw error;
    
    // Send notification to seller
    await this.notifySeller(order);
    
    return order;
  }
  
  /**
   * Calculate delivery fee based on shop and address
   */
  async calculateDeliveryFee(shopId, address) {
    const { data: config } = await supabase
      .from('shop_delivery_config')
      .select('*')
      .eq('shop_id', shopId)
      .single();
      
    // Simple logic - you can enhance this
    if (address.city === 'Local') return config?.delivery_fee_local || 5.00;
    if (address.city === 'Uptown') return config?.delivery_fee_uptown || 10.00;
    return config?.delivery_fee_outoftown || 15.00;
  }
  
  /**
   * Send notification to seller about new order
   */
  async notifySeller(order) {
    // Get shop owner
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id, name')
      .eq('id', order.shop_id)
      .single();
      
    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: shop.owner_id,
        type: 'new_order',
        message: `New order received for ${shop.name}`,
        order_id: order.id
      });
  }
}

// Usage example:
export const checkoutService = new CheckoutService(); 