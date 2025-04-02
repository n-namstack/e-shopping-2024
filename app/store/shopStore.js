import { create } from 'zustand';
import supabase from '../lib/supabase';

const useShopStore = create((set) => ({
  shops: [],
  myShops: [],
  currentShop: null,
  loading: false,
  error: null,
  
  // Fetch all shops
  fetchShops: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ shops: data, loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Fetch shops by user ID (for sellers)
  fetchMyShops: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ myShops: data, loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Fetch a single shop by ID
  fetchShopById: async (shopId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      
      if (error) throw error;
      
      set({ currentShop: data, loading: false });
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Create a new shop
  createShop: async (shopData) => {
    set({ loading: true, error: null });
    try {
      // First, upload logo if present
      let logoUrl = null;
      if (shopData.logo) {
        const fileName = `${Date.now()}-shop-logo`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('shop_images')
          .upload(fileName, shopData.logo);
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('shop_images')
          .getPublicUrl(fileName);
          
        logoUrl = publicUrlData.publicUrl;
      }
      
      // Create shop in database
      const { data, error } = await supabase
        .from('shops')
        .insert([{
          ...shopData,
          logo: logoUrl,
          status: 'pending', // New shops start as pending
          created_at: new Date(),
        }])
        .select();
      
      if (error) throw error;
      
      // Update state with new shop
      set(state => ({ 
        myShops: [data[0], ...state.myShops],
        loading: false 
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Update shop details
  updateShop: async (shopId, updates) => {
    set({ loading: true, error: null });
    try {
      // Handle logo upload if present
      if (updates.logo && typeof updates.logo !== 'string') {
        const fileName = `${Date.now()}-shop-logo`;
        const { error: uploadError } = await supabase.storage
          .from('shop_images')
          .upload(fileName, updates.logo);
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('shop_images')
          .getPublicUrl(fileName);
          
        updates.logo = publicUrlData.publicUrl;
      }
      
      // Update shop in database
      const { data, error } = await supabase
        .from('shops')
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .eq('id', shopId)
        .select();
      
      if (error) throw error;
      
      // Update state
      set(state => ({
        myShops: state.myShops.map(shop => 
          shop.id === shopId ? data[0] : shop
        ),
        currentShop: state.currentShop?.id === shopId ? data[0] : state.currentShop,
        loading: false
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Submit shop verification documents
  submitVerification: async (shopId, documents) => {
    set({ loading: true, error: null });
    try {
      // Upload documents to storage
      const uploadedDocs = [];
      
      for (const [index, doc] of documents.entries()) {
        const fileName = `${shopId}-verification-doc-${index}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('verification_documents')
          .upload(fileName, doc);
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('verification_documents')
          .getPublicUrl(fileName);
          
        uploadedDocs.push({
          url: publicUrlData.publicUrl,
          name: fileName,
          type: doc.type,
        });
      }
      
      // Update shop with verification documents
      const { data, error } = await supabase
        .from('shops')
        .update({
          verification_documents: uploadedDocs,
          verification_status: 'submitted',
          updated_at: new Date(),
        })
        .eq('id', shopId)
        .select();
      
      if (error) throw error;
      
      // Update state
      set(state => ({
        myShops: state.myShops.map(shop => 
          shop.id === shopId ? data[0] : shop
        ),
        currentShop: state.currentShop?.id === shopId ? data[0] : state.currentShop,
        loading: false
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
}));

export default useShopStore; 