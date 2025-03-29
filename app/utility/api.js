import React from 'react';
import axios from 'axios';
import { Alert, Platform, AlertIOS, NativeModules } from 'react-native';
import { useToast } from 'react-native-toast-notifications';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update to match your running server
// For Android emulator, use 10.0.2.2 to access your computer's localhost
const ipAddress = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const port = '3000';

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

// Fetch shops api
const fetchShops = async (user_id, setShops, setLoading) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `http://${ipAddress}:${port}/api/shops`,
      {
        params: { user_id: user_id },
        headers: headers
      }
    );

    setShops(response.data);
    setLoading(false);
  } catch (error) {
    console.error('Error fetching shops: ', error);
    setLoading(false);
  }
};

const getPublicShops = async (setShops, setLoading) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `http://${ipAddress}:${port}/api/public-shop-info`,
      { headers: headers }
    );

    setShops(response.data);
    setLoading(false);
  } catch (error) {
    console.error('Error fetching shops: ', error);
    setLoading(false);
  }
};

// Fetch shop-info api
const getShopInfo = async (user_id, shop_uuid, setShop) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `http://${ipAddress}:${port}/api/shop-info`,
      {
        params: { user_id: user_id, shop_uuid: shop_uuid },
        headers: headers
      }
    );

    setShop(response.data);
  } catch (error) {
    console.error('Error fetching shops: ', error);
    setLoading(false);
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
    
    // Default placeholder image URLs if not provided
    const defaultProfileImg = 'https://via.placeholder.com/150?text=Shop+Profile';
    const defaultBgImg = 'https://via.placeholder.com/500x300?text=Shop+Cover+Image';
    
    const requestData = {
      shop_name: shopInfo.name,
      shop_description: shopInfo.description,
      profile_img: shopInfo.profile_img || defaultProfileImg,
      bg_img: shopInfo.backgroung_img || defaultBgImg,
      user_id: shopInfo.user_id || 1,
      user_role: shopInfo.user_role || 'buyer',
    };
    
    console.log('Sending API request to:', `http://${ipAddress}:${port}/api/create-shop`);
    console.log('With data:', requestData);
    
    // Get authentication headers
    const headers = await getAuthHeaders();
    console.log('Using auth headers:', headers);
    
    // Set timeout to 5 seconds to prevent hanging
    const res = await axios.post(
      `http://${ipAddress}:${port}/api/create-shop`,
      requestData,
      { 
        timeout: 5000, // 5 second timeout
        headers: headers
      }
    );
    
    console.log('API response:', res.data);
    
    if (res.data && res.data.shop_uuid) {
      return res.data;
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
const createProduct = async (shopInfo) => {
  try {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `http://${ipAddress}:${port}/api/create-shop`,
      {
        shop_name: shopInfo.name,
        shop_description: shopInfo.description,
        profile_img: shopInfo.profile_img,
        bg_img: shopInfo.backgroung_img,
        user_id: 1,
      },
      { headers: headers }
    );

    if (res.data.shop_uuid !== undefined) {
      Alert.alert(
        'Created Shop',
        'Successfully created shop: ' + shopInfo.name
      );
    }
  } catch (error) {
    console.error('Error creating shop:', error);
  }
};

const getProducts = async (user_id, shop_uuid, setSProduct) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `http://${ipAddress}:${port}/api/get-products`,
      { headers: headers }
    );

    setShop(response.data);
  } catch (error) {
    console.error('Error fetching products: ', error);
    setLoading(false);
  }
};

export { fetchShops, createShop, getShopInfo, getPublicShops, getProducts };
