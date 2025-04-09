import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { COLORS } from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';

const FavoritesScreen = ({ navigation }) => {
  const [likedProducts, setLikedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { addToCart } = useCartStore();

  useEffect(() => {
    if (user) {
      fetchLikedProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchLikedProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('product_likes')
        .select(`
          product_id,
          products (
            id,
            name,
            price,
            main_image,
            images,
            in_stock,
            is_on_sale,
            original_price,
            shop:shops (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter out any null products (in case products were deleted)
      const validProducts = data
        .filter(item => item.products)
        .map(item => item.products);

      setLikedProducts(validProducts);
    } catch (error) {
      console.error('Error fetching liked products:', error);
      Alert.alert('Error', 'Failed to load liked products');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (productId) => {
    try {
      const { error } = await supabase
        .from('product_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      // Remove product from local state
      setLikedProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error removing like:', error);
      Alert.alert('Error', 'Failed to unlike product');
    }
  };

  const handleAddToCart = async (product) => {
    try {
      addToCart(product);
      Alert.alert('Success', 'Item added to your cart!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2B3147" />
          </TouchableOpacity>
          <Text style={styles.title}>Favorites</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loginContainer}>
          <Ionicons name="heart" size={64} color="#FF6B6B" style={styles.loginIcon} />
          <Text style={styles.loginTitle}>Login to See Favorites</Text>
          <Text style={styles.loginMessage}>
            You need to be logged in to save and view your favorite products.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (likedProducts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="heart"
          title="No Favorites Yet"
          message="Products you like will appear here"
          actionLabel="Browse Products"
          onAction={() => navigation.navigate('Home')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2B3147" />
        </TouchableOpacity>
        <Text style={styles.title}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.productsList}>
        {likedProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => navigation.navigate('ProductDetails', { product })}
          >
            <Image
              source={{ uri: product.main_image || product.images?.[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={styles.shopName}>@{product.shop?.name || 'Shop'}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>N${formatPrice(product.price)}</Text>
                {product.is_on_sale && (
                  <Text style={styles.originalPrice}>
                    N${formatPrice(product.original_price)}
                  </Text>
                )}
              </View>
              <Text style={styles.stockStatus}>
                {product.in_stock ? 'Available' : 'On Order'}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUnlike(product.id)}
              >
                <Ionicons name="heart" size={20} color="#FF6B6B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAddToCart(product)}
              >
                <Ionicons name="cart-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2B3147',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  productsList: {
    padding: 20,
    gap: 15,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B3147',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B3147',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  stockStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  actionButtons: {
    justifyContent: 'space-between',
    paddingLeft: 12,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginIcon: {
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2B3147',
    marginBottom: 12,
  },
  loginMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    padding: 12,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    marginBottom: 12,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  continueButton: {
    padding: 12,
    backgroundColor: '#666',
    borderRadius: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FavoritesScreen; 