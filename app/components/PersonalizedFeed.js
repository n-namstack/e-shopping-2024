import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../lib/supabase';
import { COLORS, FONTS } from '../constants/theme';
import ProductCard from './ProductCard';
import useAuthStore from '../store/authStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const PersonalizedFeed = ({ navigation }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [feedTitle, setFeedTitle] = useState('Recommended for You');

  useEffect(() => {
    if (user) {
      fetchUserPreferences();
    } else {
      fetchTrendingProducts();
    }
  }, [user]);

  // Fetch user's preferences based on their activity
  const fetchUserPreferences = async () => {
    try {
      setLoading(true);
      
      // Get user's liked products
      const { data: likedProducts, error: likedError } = await supabase
        .from('product_likes')
        .select('product_id')
        .eq('user_id', user.id);
        
      if (likedError) throw likedError;
      
      // Get user's viewed products
      const { data: viewedProducts, error: viewedError } = await supabase
        .from('product_views')
        .select('product_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (viewedError) throw viewedError;
      
      // Get user's cart items
      const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('product_id')
        .eq('user_id', user.id);
        
      if (cartError) throw cartError;
      
      // Get user's previous orders
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('user_id', user.id);
        
      if (orderError) throw orderError;
      
      // Combine all product IDs with weights
      const productPreferences = {};
      
      // Liked products have highest weight
      likedProducts?.forEach(item => {
        productPreferences[item.product_id] = (productPreferences[item.product_id] || 0) + 5;
      });
      
      // Cart items have high weight
      cartItems?.forEach(item => {
        productPreferences[item.product_id] = (productPreferences[item.product_id] || 0) + 4;
      });
      
      // Ordered items have medium weight
      orderItems?.forEach(item => {
        productPreferences[item.product_id] = (productPreferences[item.product_id] || 0) + 3;
      });
      
      // Viewed products have lowest weight
      viewedProducts?.forEach(item => {
        productPreferences[item.product_id] = (productPreferences[item.product_id] || 0) + 1;
      });
      
      setUserPreferences(productPreferences);
      
      // If user has preferences, fetch recommended products
      if (Object.keys(productPreferences).length > 0) {
        fetchRecommendedProducts(productPreferences);
        setFeedTitle('Recommended for You');
      } else {
        // If user has no activity, show trending products
        fetchTrendingProducts();
        setFeedTitle('Popular Products');
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      fetchTrendingProducts();
    }
  };

  // Fetch recommended products based on user preferences
  const fetchRecommendedProducts = async (preferences) => {
    try {
      // Get all product IDs the user has interacted with
      const interactedProductIds = Object.keys(preferences);
      
      // First, get categories of products the user has interacted with
      const { data: interactedProducts, error: productsError } = await supabase
        .from('products')
        .select('id, category')
        .in('id', interactedProductIds);
        
      if (productsError) throw productsError;
      
      // Count category preferences
      const categoryPreferences = {};
      interactedProducts?.forEach(product => {
        if (product.category) {
          categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + preferences[product.id];
        }
      });
      
      // Sort categories by preference weight
      const sortedCategories = Object.entries(categoryPreferences)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      // If we have category preferences, fetch products from those categories
      if (sortedCategories.length > 0) {
        // Get products from top 3 categories that user hasn't interacted with
        const { data: recommendedProducts, error: recommendedError } = await supabase
          .from('products')
          .select('*, shops(name, logo_url)')
          .in('category', sortedCategories.slice(0, 3))
          .not('id', 'in', `(${interactedProductIds.join(',')})`)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (recommendedError) throw recommendedError;
        
        if (recommendedProducts && recommendedProducts.length > 0) {
          // Process products to handle stock status correctly
          const processedProducts = recommendedProducts.map(product => ({
            ...product,
            in_stock:
              product.is_on_order !== undefined
                ? !product.is_on_order
                : product.stock_quantity > 0,
          }));
          
          setRecommendedProducts(processedProducts);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to trending products if no recommendations found
      fetchTrendingProducts();
    } catch (error) {
      console.error('Error fetching recommended products:', error);
      fetchTrendingProducts();
    }
  };

  // Fetch trending products as fallback
  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      setFeedTitle('Popular Products');
      
      // Get products with most views
      const { data: trendingProducts, error } = await supabase
        .from('products')
        .select('*, shops(name, logo_url)')
        .order('views_count', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      // Process products to handle stock status correctly
      const processedProducts = trendingProducts.map(product => ({
        ...product,
        in_stock:
          product.is_on_order !== undefined
            ? !product.is_on_order
            : product.stock_quantity > 0,
      }));
      
      setRecommendedProducts(processedProducts);
    } catch (error) {
      console.error('Error fetching trending products:', error);
      setRecommendedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to product details
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetails', { product });
  };

  // Render product item
  const renderProductItem = ({ item }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      style={styles.productCard}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (recommendedProducts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{feedTitle}</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={user ? fetchUserPreferences : fetchTrendingProducts}
        >
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={recommendedProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  refreshButton: {
    padding: 8,
  },
  productList: {
    paddingHorizontal: 12,
  },
  productCard: {
    marginHorizontal: 4,
    width: CARD_WIDTH,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PersonalizedFeed;
