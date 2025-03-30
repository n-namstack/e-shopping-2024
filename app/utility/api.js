import React from 'react';
import axios from 'axios';
import { Alert, Platform, AlertIOS, NativeModules } from 'react-native';
import { useToast } from 'react-native-toast-notifications';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update to match your running server
// For Android emulator, use 10.0.2.2 to access your computer's localhost
// For iOS simulator, use localhost
// For physical devices on the same network, use your computer's local IP address
const ipAddress = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// If using a physical device, uncomment and use your computer's IP address
// const ipAddress = '192.168.1.X'; // Replace X with your actual IP

// Ensure correct port matches your server
const port = '3000';

// Add timeout and retry logic for API requests
const API_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;

// Helper function to get auth headers
const getAuthHeaders = async () => {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parsedUser.token}`
        };
      }
    }
  } catch (err) {
    console.error('Error getting token from storage:', err);
  }
  
  // Default headers if no token is found
  return { 'Content-Type': 'application/json' };
};

// Helper function with retry logic
const apiRequest = async (method, url, data = null, customHeaders = {}) => {
  let lastError;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders();
      const config = {
        method,
        url: `http://${ipAddress}:${port}${url}`,
        timeout: API_TIMEOUT,
        headers: { ...headers, ...customHeaders }
      };
      
      if (data) {
        config.data = data;
      }

      console.log(`API Request (attempt ${attempt+1}/${MAX_RETRIES+1}):`, config.url);
      const response = await axios(config);
      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`API attempt ${attempt+1} failed:`, error.message);
      
      // Only retry on network errors or 5xx server errors
      if (!error.response || (error.response && error.response.status >= 500)) {
        // Wait a bit before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry on client errors (4xx)
      throw error;
    }
  }
  
  throw lastError;
};

// Fetch shops api
const fetchShops = async (user_id, setShops, setLoading) => {
  try {
    const data = await apiRequest('get', '/api/shops');
    setShops(data.shops);
    if (setLoading) setLoading(false);
  } catch (error) {
    console.error('Error fetching shops: ', error);
    if (setLoading) setLoading(false);
  }
};

const getPublicShops = async (onSuccess, onError) => {
  try {
    const data = await apiRequest('get', '/api/shops');
    if (typeof onSuccess === 'function') {
      onSuccess(data.shops);
    }
    return data.shops;
  } catch (error) {
    console.error('Error fetching shops: ', error);
    if (typeof onError === 'function') {
      onError(error);
    } else if (typeof onSuccess === 'function' && error.response && error.response.status === 404) {
      onSuccess([]);
    }
    throw error;
  }
};

// Fetch shop-info api
const getShopInfo = async (shopId, setShop) => {
  try {
    const data = await apiRequest('get', `/api/shops/${shopId}`);
    setShop(data.shop);
    return data.shop;
  } catch (error) {
    console.error('Error fetching shop details: ', error);
    throw error;
  }
};

// Create shop api
const createShop = async (shopInfo) => {
  try {
    console.log('Creating shop with data:', shopInfo);
    
    // Only validate required fields
    if (!shopInfo.name) {
      throw new Error('Shop name is required');
    }
    
    if (!shopInfo.description) {
      throw new Error('Shop description is required');
    }
    
    // Create request object matching the Shop model
    const requestData = {
      name: shopInfo.name,
      description: shopInfo.description,
      logo: shopInfo.profile_img || 'https://via.placeholder.com/150?text=Shop+Logo',
      banner: shopInfo.backgroung_img || 'https://via.placeholder.com/500x300?text=Shop+Banner',
      address: shopInfo.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contact_info: {
        email: shopInfo.email || '',
        phone: shopInfo.phone || '',
        website: ''
      },
      business_hours: {},
      categories: shopInfo.categories || []
    };
    
    const data = await apiRequest('post', '/api/create-shop', requestData);
    
    if (data && data.shop) {
      return data.shop;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error in createShop function:', error);
    
    // Check if it's an access denied error and provide a clearer message
    if (error.response && error.response.status === 403) {
      const errorMsg = error.response.data.message || 'Access denied';
      throw new Error(`Authorization error: ${errorMsg}. You may need to log in again.`);
    }
    
    throw error;
  }
};

// Create product api
const createProduct = async (productData) => {
  try {
    const data = await apiRequest('post', '/api/add-product', productData);

    if (data) {
      Alert.alert(
        'Product Created',
        'Successfully created product: ' + productData.product_name
      );
      return data;
    }
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

const getProducts = async (setProducts, setLoading) => {
  try {
    const data = await apiRequest('get', '/api/get-products');
    setProducts(data);
    if (setLoading) setLoading(false);
  } catch (error) {
    console.error('Error fetching products: ', error);
    if (setLoading) setLoading(false);
  }
};

const getProductById = async (productId, setProduct) => {
  try {
    const data = await apiRequest('get', `/api/get-product/${productId}`);
    setProduct(data);
    return data;
  } catch (error) {
    console.error('Error fetching product details: ', error);
    throw error;
  }
};

export { 
  fetchShops, 
  createShop, 
  getShopInfo, 
  getPublicShops, 
  getProducts, 
  createProduct,
  getProductById 
};
