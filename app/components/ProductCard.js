import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with 16px padding on sides and middle

/**
 * Product Card component for displaying product items in a grid
 * 
 * @param {Object} props
 * @param {Object} props.product - Product object
 * @param {Function} props.onPress - Function to call when card is pressed
 * @param {Object} props.style - Additional styles for the card container
 */
const ProductCard = ({ product, onPress, style }) => {
  if (!product) return null;
  
  // Format price with commas
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={() => onPress && onPress(product)}
      activeOpacity={0.8}
    >
      {/* Product image */}
      <View style={styles.imageContainer}>
        <Image
          source={
            product.main_image
              ? { uri: product.main_image }
              : require('../../assets/logo-placeholder.png')
          }
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Status badges */}
        {!product.in_stock && (
          <View style={styles.onOrderBadge}>
            <Text style={styles.onOrderText}>On Order</Text>
          </View>
        )}
        
        {product.is_on_sale && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleText}>{`${product.discount_percentage}% OFF`}</Text>
          </View>
        )}
      </View>
      
      {/* Product details */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            N${formatPrice(product.price)}
          </Text>
          
          {product.is_on_sale && (
            <Text style={styles.originalPrice}>
              N${formatPrice(product.price * (1 + product.discount_percentage / 100))}
            </Text>
          )}
        </View>
        
        {/* Shop and ratings */}
        <View style={styles.shopRow}>
          <Text style={styles.shopName} numberOfLines={1}>
            {product.shop?.name || 'Shop'}
          </Text>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFC107" />
            <Text style={styles.rating}>
              {product.rating || '4.5'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: cardWidth,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  onOrderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  onOrderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  saleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  details: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    height: 40, // Fixed height for 2 lines
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  shopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
});

export default ProductCard; 