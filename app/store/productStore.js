import { create } from 'zustand';
import supabase from '../lib/supabase';

const useProductStore = create((set, get) => ({
  products: [],
  filteredProducts: [],
  loading: false,
  error: null,
  
  // Fetch all products
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          shop:shops(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ 
        products: data, 
        filteredProducts: data,
        loading: false 
      });
      
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Fetch products by shop ID
  fetchShopProducts: async (shopId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ 
        filteredProducts: data,
        loading: false 
      });
      
      return { success: true, data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Add a new product
  addProduct: async (productData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select();
      
      if (error) throw error;
      
      // Update products list
      set(state => ({ 
        products: [data[0], ...state.products],
        loading: false 
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Update a product
  updateProduct: async (productId, updates) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select();
      
      if (error) throw error;
      
      // Update the product in the state
      set(state => ({
        products: state.products.map(product => 
          product.id === productId ? data[0] : product
        ),
        loading: false
      }));
      
      return { success: true, data: data[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Delete a product
  deleteProduct: async (productId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      // Remove the product from the state
      set(state => ({
        products: state.products.filter(product => product.id !== productId),
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  // Filter products by category, price, etc.
  filterProducts: (filters) => {
    const { products } = get();
    let filtered = [...products];
    
    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }
    
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(product => product.price >= filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(product => product.price <= filters.maxPrice);
    }
    
    if (filters.condition) {
      filtered = filtered.filter(product => product.condition === filters.condition);
    }
    
    if (filters.inStock !== undefined) {
      filtered = filtered.filter(product => product.in_stock === filters.inStock);
    }
    
    set({ filteredProducts: filtered });
    return filtered;
  },
  
  // Search products by name or description
  searchProducts: (searchTerm) => {
    const { products } = get();
    if (!searchTerm.trim()) {
      set({ filteredProducts: products });
      return products;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(term) || 
      (product.description && product.description.toLowerCase().includes(term))
    );
    
    set({ filteredProducts: filtered });
    return filtered;
  },
}));

export default useProductStore; 