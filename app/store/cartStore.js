import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useCartStore = create(
  persist(
    (set, get) => ({
      // Cart state
      cartItems: [],
      totalItems: 0,
      totalAmount: 0,
      
      // Add item to cart
      addToCart: (product, quantity = 1) => {
        const cartItems = get().cartItems;
        const existing = cartItems.find(item => item.id === product.id);
        
        if (existing) {
          // Update quantity if item already exists
          const updatedItems = cartItems.map(item => 
            item.id === product.id 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          
          set(state => ({
            cartItems: updatedItems,
            totalItems: state.totalItems + quantity,
            totalAmount: state.totalAmount + (product.price * quantity)
          }));
        } else {
          // Add new item
          const newItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || null,
            shop_id: product.shop_id,
            shop_name: product.shop_name || 'Unknown Shop',
            quantity
          };
          
          set(state => ({
            cartItems: [...state.cartItems, newItem],
            totalItems: state.totalItems + quantity,
            totalAmount: state.totalAmount + (product.price * quantity)
          }));
        }
      },
      
      // Remove item from cart
      removeFromCart: (productId) => {
        const cartItems = get().cartItems;
        const itemToRemove = cartItems.find(item => item.id === productId);
        
        if (!itemToRemove) return;
        
        const updatedItems = cartItems.filter(item => item.id !== productId);
        
        set(state => ({
          cartItems: updatedItems,
          totalItems: state.totalItems - itemToRemove.quantity,
          totalAmount: state.totalAmount - (itemToRemove.price * itemToRemove.quantity)
        }));
      },
      
      // Update item quantity
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        const cartItems = get().cartItems;
        const itemToUpdate = cartItems.find(item => item.id === productId);
        
        if (!itemToUpdate) return;
        
        const quantityDiff = quantity - itemToUpdate.quantity;
        const updatedItems = cartItems.map(item => 
          item.id === productId 
            ? { ...item, quantity }
            : item
        );
        
        set(state => ({
          cartItems: updatedItems,
          totalItems: state.totalItems + quantityDiff,
          totalAmount: state.totalAmount + (itemToUpdate.price * quantityDiff)
        }));
      },
      
      // Clear the entire cart
      clearCart: () => {
        set({
          cartItems: [],
          totalItems: 0,
          totalAmount: 0
        });
      },
      
      // Get items grouped by shop
      getItemsByShop: () => {
        const cartItems = get().cartItems;
        const shopMap = {};
        
        cartItems.forEach(item => {
          if (!shopMap[item.shop_id]) {
            shopMap[item.shop_id] = {
              shopId: item.shop_id,
              shopName: item.shop_name,
              items: [],
              subtotal: 0
            };
          }
          
          shopMap[item.shop_id].items.push(item);
          shopMap[item.shop_id].subtotal += (item.price * item.quantity);
        });
        
        return Object.values(shopMap);
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useCartStore; 