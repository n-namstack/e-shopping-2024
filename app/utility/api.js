import React from 'react';
import axios from 'axios';
import { Alert, Platform, AlertIOS, NativeModules } from 'react-native';
import { useToast } from 'react-native-toast-notifications';
import Toast from 'react-native-toast-message';

const ipAddress = '192.168.178.87';

// Fetch shops api
const fetchShops = async (user_id, setShops, setLoading) => {
  try {
    const response = await axios.get(
      'http://' + ipAddress + ':8000/api/shops',
      {
        params: { user_id: user_id },
      }
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
    const response = await axios.get(
      'http://' + ipAddress + ':8000/api/shop-info',
      {
        params: { user_id: user_id, shop_uuid: shop_uuid },
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
    const res = await axios.post(
      'http://' + ipAddress + ':8000/api/create-shop',
      {
        shop_name: shopInfo.name,
        shop_description: shopInfo.description,
        profile_img: shopInfo.profile_img,
        bg_img: shopInfo.backgroung_img,
        user_id: 1,
      }
    );

    // setResponse(res.data);
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


// Create shop api
const createProduct = async (shopInfo) => {
  try {
    const res = await axios.post(
      'http://' + ipAddress + ':8000/api/create-shop',
      {
        shop_name: shopInfo.name,
        shop_description: shopInfo.description,
        profile_img: shopInfo.profile_img,
        bg_img: shopInfo.backgroung_img,
        user_id: 1,
      }
    );

    // setResponse(res.data);
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

export { fetchShops, createShop, getShopInfo };
