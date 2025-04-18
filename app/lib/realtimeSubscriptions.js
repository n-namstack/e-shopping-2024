import supabase from './supabase';

/**
 * RealtimeSubscriptions - A utility class to manage Supabase real-time subscriptions across the app
 */
class RealtimeSubscriptions {
  constructor() {
    this.subscriptions = {};
    this.listeners = {};
  }

  /**
   * Subscribe to changes on a specific table
   * @param {string} table - The table to subscribe to
   * @param {string} event - The event to listen for ('INSERT', 'UPDATE', 'DELETE', or '*' for all)
   * @param {Function} callback - The function to call when an event occurs
   * @param {Object} filter - Optional filter conditions
   * @returns {string} A unique subscription ID
   */
  subscribe(table, event, callback, filter = {}) {
    const subscriptionId = `${table}_${event}_${Date.now()}`;
    
    // Create channel for the subscription
    const channel = supabase
      .channel(`${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
          ...filter
        },
        (payload) => {
          // Call the callback with the payload
          callback(payload);
        }
      )
      .subscribe();
    
    // Store the subscription
    this.subscriptions[subscriptionId] = channel;
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific subscription
   * @param {string} subscriptionId - The subscription ID to unsubscribe from
   */
  unsubscribe(subscriptionId) {
    if (this.subscriptions[subscriptionId]) {
      this.subscriptions[subscriptionId].unsubscribe();
      delete this.subscriptions[subscriptionId];
    }
  }

  /**
   * Add a listener for a specific table and event
   * @param {string} component - The component name that's listening
   * @param {string} table - The table to listen to
   * @param {string} event - The event to listen for
   * @param {Function} callback - The function to call when an event occurs
   */
  addListener(component, table, event, callback) {
    const listenerId = `${component}_${table}_${event}`;
    const subscriptionId = this.subscribe(table, event, callback);
    
    this.listeners[listenerId] = subscriptionId;
    
    return listenerId;
  }
  
  /**
   * Remove a listener
   * @param {string} listenerId - The listener ID to remove
   */
  removeListener(listenerId) {
    if (this.listeners[listenerId]) {
      this.unsubscribe(this.listeners[listenerId]);
      delete this.listeners[listenerId];
    }
  }
  
  /**
   * Remove all listeners for a component
   * @param {string} component - The component name
   */
  removeComponentListeners(component) {
    // Find all listeners for this component
    const componentListeners = Object.keys(this.listeners).filter(id => 
      id.startsWith(`${component}_`)
    );
    
    // Remove each listener
    componentListeners.forEach(id => this.removeListener(id));
  }

  /**
   * Subscribe to common tables that many components might need
   * @param {string} component - The component name
   * @param {Function} dataCallback - Function to call with updated data
   * @returns {Array} Array of listener IDs
   */
  subscribeToCommonTables(component, dataCallback) {
    const listenerIds = [];
    
    // Products
    listenerIds.push(
      this.addListener(component, 'products', '*', (payload) => {
        dataCallback('products', payload);
      })
    );
    
    // Product views
    listenerIds.push(
      this.addListener(component, 'product_views', '*', (payload) => {
        dataCallback('product_views', payload);
      })
    );
    
    // Product likes
    listenerIds.push(
      this.addListener(component, 'product_likes', '*', (payload) => {
        dataCallback('product_likes', payload);
      })
    );
    
    // Shops
    listenerIds.push(
      this.addListener(component, 'shops', '*', (payload) => {
        dataCallback('shops', payload);
      })
    );
    
    // Shop follows
    listenerIds.push(
      this.addListener(component, 'shop_follows', '*', (payload) => {
        dataCallback('shop_follows', payload);
      })
    );
    
    // Orders
    listenerIds.push(
      this.addListener(component, 'orders', '*', (payload) => {
        dataCallback('orders', payload);
      })
    );
    
    // Notifications
    listenerIds.push(
      this.addListener(component, 'notifications', '*', (payload) => {
        dataCallback('notifications', payload);
      })
    );
    
    return listenerIds;
  }
}

export default new RealtimeSubscriptions(); 