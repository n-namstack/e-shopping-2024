import { create } from 'zustand';
import supabase from '../lib/supabase';
import useCartStore from './cartStore';

const useOrderStore = create((set, get) => ({
  orders: [],
  currentOrder: null,
  cart: [],
  loading: false,
  error: null,
  
  // Fetch user orders (buyer)
  fetchMyOrders: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*)
          )
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ orders: data, loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Fetch shop orders (seller)
  fetchShopOrders: async (shopId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*)
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ orders: data, loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Fetch a specific order
  fetchOrderById: async (orderId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*)
          ),
          buyer:profiles(*),
          shop:shops(*)
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      
      set({ currentOrder: data, loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Add item to cart
  addToCart: (product, quantity = 1) => {
    set(state => {
      // Check if product already exists in cart
      const existingItem = state.cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Update quantity of existing item
        const updatedCart = state.cart.map(item => 
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        return { cart: updatedCart };
      } else {
        // Add new item to cart
        return { cart: [...state.cart, { product, quantity }] };
      }
    });
  },
  
  // Update cart item quantity
  updateCartItemQuantity: (productId, quantity) => {
    set(state => {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return { 
          cart: state.cart.filter(item => item.product.id !== productId) 
        };
      } else {
        // Update quantity
        return {
          cart: state.cart.map(item => 
            item.product.id === productId
              ? { ...item, quantity }
              : item
          )
        };
      }
    });
  },
  
  // Remove item from cart
  removeFromCart: (productId) => {
    set(state => ({
      cart: state.cart.filter(item => item.product.id !== productId)
    }));
  },
  
  // Clear cart
  clearCart: () => {
    set({ cart: [] });
  },
  
  // Calculate cart total
  getCartTotal: () => {
    const { cart } = get();
    return cart.reduce((total, item) => {
      const price = parseFloat(item.product.price);
      return total + price * item.quantity;
    }, 0);
  },
  
  // Create an order
  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const { cart } = get(); // Get cart from current store state
      
      // Group cart items by shop
      const shopGroups = {};
      cart.forEach(item => {
        if (!shopGroups[item.product.shop_id]) {
          shopGroups[item.product.shop_id] = [];
        }
        shopGroups[item.product.shop_id].push(item);
      });
      
      // Check if there are on-order products
      const hasOnOrderProducts = cart.some(item => !item.product.in_stock);
      
      // Calculate runner fees and transport fees
      let runnerFeesTotal = 0;
      let transportFeesTotal = 0;
      let depositAmount = 0;
      
      cart.forEach(item => {
        if (!item.product.in_stock) {
          if (item.product.runner_fee) {
            runnerFeesTotal += item.product.runner_fee * item.quantity;
          } else {
            // Fallback to 50% deposit if no runner fee defined
            depositAmount += (item.product.price * item.quantity * 0.5);
          }
          
          if (item.product.transport_fee) {
            transportFeesTotal += item.product.transport_fee * item.quantity;
          }
        }
      });
      
      // Create orders for each shop
      const orderPromises = Object.entries(shopGroups).map(async ([shopId, items]) => {
        // Calculate totals for this shop's items
        const shopStandardTotal = items
          .filter(item => item.product.in_stock)
          .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
          
        const shopRunnerFees = items
          .filter(item => !item.product.in_stock && item.product.runner_fee)
          .reduce((sum, item) => sum + (item.product.runner_fee * item.quantity), 0);
          
        const shopDepositAmount = items
          .filter(item => !item.product.in_stock && !item.product.runner_fee)
          .reduce((sum, item) => sum + (item.product.price * item.quantity * 0.5), 0);
          
        const shopTransportFees = items
          .filter(item => !item.product.in_stock && item.product.transport_fee)
          .reduce((sum, item) => sum + (item.product.transport_fee * item.quantity), 0);
        
        // Check if this shop has on-order items
        const shopHasOnOrderItems = items.some(item => !item.product.in_stock);
        
        // Create main order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            buyer_id: orderData.buyer_id,
            shop_id: shopId,
            total_amount: shopStandardTotal + shopRunnerFees + shopDepositAmount,
            payment_method: orderData.payment_method,
            shipping_address: orderData.shipping_address,
            status: shopHasOnOrderItems ? 'deposit_pending' : 'pending',
            deposit_amount: shopDepositAmount,
            deposit_paid: false,
            delivery_method: orderData.delivery_method,
            runner_fees_total: shopRunnerFees,
            transport_fees_total: shopTransportFees,
            transport_fees_paid: false,
            has_on_order_items: shopHasOnOrderItems,
            created_at: new Date(),
          }])
          .select();
        
        if (orderError) throw orderError;
        
        // Create order items
        const orderItems = items.map(item => ({
          order_id: order[0].id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          is_on_order: !item.product.in_stock,
          runner_fee: item.product.runner_fee || 0,
          transport_fee: item.product.transport_fee || 0,
        }));
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);
        
        if (itemsError) throw itemsError;

        // Update product quantities for in-stock items
        for (const item of items) {
          if (item.product.in_stock) {
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                quantity: item.product.quantity - item.quantity,
                in_stock: (item.product.quantity - item.quantity) > 0
              })
              .eq('id', item.product.id);
            
            if (updateError) throw updateError;
          }
        }
        
        return order[0];
      });
      
      const createdOrders = await Promise.all(orderPromises);
      
      // Create notifications for sellers
      const notificationPromises = createdOrders.map(async (order) => {
        const { data: shopData } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', order.shop_id)
          .single();

        if (shopData) {
          await supabase
            .from('notifications')
            .insert({
              user_id: shopData.owner_id,
              type: 'new_order',
              message: `New order received (#${order.id.slice(0, 8)})`,
              order_id: order.id,
              shop_id: order.shop_id,
              read: false,
              created_at: new Date().toISOString()
            });
        }
      });

      await Promise.all(notificationPromises);
      
      // Clear cart after successful order creation
      set({ cart: [], loading: false });
      
      return { success: true, data: createdOrders };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Update order status (for sellers)
  updateOrderStatus: async (orderId, status, trackingInfo = null) => {
    set({ loading: true, error: null });
    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };
      
      if (trackingInfo) {
        updateData.tracking_info = trackingInfo;
      }
      
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();
      
      if (error) throw error;
      
      // Update orders list
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data[0] : order
        ),
        currentOrder: state.currentOrder?.id === orderId ? data[0] : state.currentOrder,
        loading: false
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Process deposit payment
  processDepositPayment: async (orderId, paymentDetails) => {
    set({ loading: true, error: null });
    try {
      // In a real app, you would integrate with the payment gateway here
      
      // Update order status after successful payment
      const { data, error } = await supabase
        .from('orders')
        .update({
          deposit_paid: true,
          status: 'processing',
          payment_details: paymentDetails,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .select();
      
      if (error) throw error;
      
      // Update orders list
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data[0] : order
        ),
        currentOrder: state.currentOrder?.id === orderId ? data[0] : state.currentOrder,
        loading: false
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Process final payment
  processFinalPayment: async (orderId, paymentDetails) => {
    set({ loading: true, error: null });
    try {
      // In a real app, you would integrate with the payment gateway here
      
      // Update order status after successful payment
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          final_payment_details: paymentDetails,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .select();
      
      if (error) throw error;
      
      // Update orders list
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? data[0] : order
        ),
        currentOrder: state.currentOrder?.id === orderId ? data[0] : state.currentOrder,
        loading: false
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));

export default useOrderStore; 