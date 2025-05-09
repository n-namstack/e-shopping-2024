import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../lib/supabase';

const useUserPreferencesStore = create(
  persist(
    (set, get) => ({
      // User preferences
      savedAddresses: [],
      savedPaymentMethods: [],
      defaultAddressId: null,
      defaultPaymentMethodId: null,
      oneClickEnabled: false,

      // Fetch saved addresses
      fetchSavedAddresses: async (userId) => {
        if (!userId) return;
        
        try {
          const { data, error } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false });
            
          if (error) throw error;
          
          // Set default address id
          const defaultAddress = data.find(addr => addr.is_default);
          
          set({
            savedAddresses: data || [],
            defaultAddressId: defaultAddress?.id || null
          });
          
          return data;
        } catch (error) {
          console.error('Error fetching saved addresses:', error);
          return [];
        }
      },
      
      // Add new address
      addAddress: async (userId, addressData) => {
        if (!userId) return { success: false, error: 'User ID is required' };
        
        try {
          // Check if this is the first address (make it default)
          const isFirstAddress = (get().savedAddresses.length === 0);
          
          const newAddress = {
            user_id: userId,
            ...addressData,
            is_default: addressData.is_default || isFirstAddress,
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('user_addresses')
            .insert(newAddress)
            .select()
            .single();
            
          if (error) throw error;
          
          // If this is a default address, update any other address to not be default
          if (data.is_default) {
            await supabase
              .from('user_addresses')
              .update({ is_default: false })
              .eq('user_id', userId)
              .neq('id', data.id);
              
            set({ defaultAddressId: data.id });
          }
          
          // Update addresses in store
          set(state => ({
            savedAddresses: [...state.savedAddresses, data]
          }));
          
          return { success: true, data };
        } catch (error) {
          console.error('Error adding address:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Update address
      updateAddress: async (addressId, addressData) => {
        try {
          const { data, error } = await supabase
            .from('user_addresses')
            .update(addressData)
            .eq('id', addressId)
            .select()
            .single();
            
          if (error) throw error;
          
          // If this address is now default, update store and make other addresses non-default
          if (data.is_default) {
            await supabase
              .from('user_addresses')
              .update({ is_default: false })
              .eq('user_id', data.user_id)
              .neq('id', data.id);
              
            set({ defaultAddressId: data.id });
          }
          
          // Update addresses in store
          set(state => ({
            savedAddresses: state.savedAddresses.map(addr => 
              addr.id === addressId ? data : addr
            )
          }));
          
          return { success: true, data };
        } catch (error) {
          console.error('Error updating address:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Delete address
      deleteAddress: async (addressId) => {
        try {
          // Get the address first to check if it's default
          const addressToDelete = get().savedAddresses.find(addr => addr.id === addressId);
          if (!addressToDelete) return { success: false, error: 'Address not found' };
          
          const { error } = await supabase
            .from('user_addresses')
            .delete()
            .eq('id', addressId);
            
          if (error) throw error;
          
          // Update addresses in store
          const updatedAddresses = get().savedAddresses.filter(addr => addr.id !== addressId);
          set({ savedAddresses: updatedAddresses });
          
          // If we deleted the default address, select a new default if available
          if (addressToDelete.is_default && updatedAddresses.length > 0) {
            const newDefault = updatedAddresses[0];
            await supabase
              .from('user_addresses')
              .update({ is_default: true })
              .eq('id', newDefault.id);
              
            set({ defaultAddressId: newDefault.id });
          } else if (updatedAddresses.length === 0) {
            set({ defaultAddressId: null });
          }
          
          return { success: true };
        } catch (error) {
          console.error('Error deleting address:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Fetch saved payment methods
      fetchSavedPaymentMethods: async (userId) => {
        if (!userId) return;
        
        try {
          const { data, error } = await supabase
            .from('user_payment_methods')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false });
            
          if (error) throw error;
          
          // Set default payment method id
          const defaultPayment = data.find(pm => pm.is_default);
          
          set({
            savedPaymentMethods: data || [],
            defaultPaymentMethodId: defaultPayment?.id || null
          });
          
          return data;
        } catch (error) {
          console.error('Error fetching saved payment methods:', error);
          return [];
        }
      },
      
      // Add payment method
      addPaymentMethod: async (userId, paymentData) => {
        if (!userId) return { success: false, error: 'User ID is required' };
        
        try {
          // Check if this is the first payment method (make it default)
          const isFirstPaymentMethod = (get().savedPaymentMethods.length === 0);
          
          const newPaymentMethod = {
            user_id: userId,
            ...paymentData,
            is_default: paymentData.is_default || isFirstPaymentMethod,
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('user_payment_methods')
            .insert(newPaymentMethod)
            .select()
            .single();
            
          if (error) throw error;
          
          // If this is a default payment method, update any other to not be default
          if (data.is_default) {
            await supabase
              .from('user_payment_methods')
              .update({ is_default: false })
              .eq('user_id', userId)
              .neq('id', data.id);
              
            set({ defaultPaymentMethodId: data.id });
          }
          
          // Update payment methods in store
          set(state => ({
            savedPaymentMethods: [...state.savedPaymentMethods, data]
          }));
          
          return { success: true, data };
        } catch (error) {
          console.error('Error adding payment method:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Toggle one-click checkout preference
      toggleOneClickCheckout: (enabled) => {
        set({ oneClickEnabled: enabled });
      },
      
      // Clear user preferences (used on logout)
      clearPreferences: () => {
        set({
          savedAddresses: [],
          savedPaymentMethods: [],
          defaultAddressId: null,
          defaultPaymentMethodId: null,
          oneClickEnabled: false
        });
      }
    }),
    {
      name: 'user-preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useUserPreferencesStore;
