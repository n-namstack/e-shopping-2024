import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
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
 * @param {Function} props.onLikePress - Function to call when like button is pressed
 * @param {Boolean} props.isLiked - Whether the product is liked by the user
 * @param {Function} props.onAddToCart - Function to call when add to cart button is pressed
 */
const ProductCard = ({ 
  product, 
  onPress, 
  style, 
  onLikePress, 
  isLiked = false,
  onAddToCart 
}) => {
  if (!product) return null;
  
  // Format price with commas
  const formatPrice = (price) => {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}mo ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}y ago`;
    }
  };
  
  return (
    <TouchableOpacity
      style={[styles.productCard, style]}
      onPress={() => onPress && onPress(product)}
      activeOpacity={0.8}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: product.images && product.images.length > 0 ? product.images[0] : product.main_image }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {product.is_on_sale && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount_percentage}% off</Text>
          </View>
        )}
        <View style={styles.actionsContainer}>
          {onLikePress && (
            <TouchableOpacity 
              style={styles.likeButton}
              onPress={() => onLikePress(product.id)}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#FF6B6B' : '#666'}
              />
            </TouchableOpacity>
          )}
          {onAddToCart && (
            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={() => onAddToCart(product)}
            >
              <Ionicons name="cart-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.productInfo}>
        <View style={styles.productNameRow}>
          <Ionicons name="pricetag-outline" size={14} color="#2B3147" />
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
        </View>
        <View style={styles.shopRow}>
          <Ionicons name="storefront-outline" size={12} color="#666" />
          <Text style={styles.shopName}>@{product.shop?.name || 'Shop'}</Text>
        </View>
        <View style={styles.priceRow}>
          <Ionicons name="cash-outline" size={14} color="#007AFF" />
          <Text style={styles.price}>N${formatPrice(product.price)}</Text>
          {product.is_on_sale && (
            <Text style={styles.originalPrice}>
              N${formatPrice(product.original_price)}
            </Text>
          )}
        </View>
        <View style={styles.productMetaRow}>
          <Text style={[styles.stockStatus, {color: product.in_stock ? '#4CAF50' : '#FF9800'}]}>
            {product.in_stock ? 'Available' : 'On Order'}
          </Text>
          <View style={styles.productMetaInfo}>
            <View style={styles.viewsIndicator}>
              <Ionicons name="eye-outline" size={12} color="#666" />
              <Text style={styles.viewsCount}>{product.views_count || 0}</Text>
            </View>
            <View style={styles.dateIndicator}>
              <Ionicons name="time-outline" size={12} color="#666" />
              <Text style={styles.dateText}>{formatDate(product.created_at)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
    marginBottom: 15,
  },
  productImageContainer: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'center',
  },
  likeButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 15,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addToCartButton: {
    backgroundColor: '#F5F6FA',
    padding: 8,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productInfo: {
    padding: 12,
    alignItems: 'flex-start',
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    width: '100%',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B3147',
    marginLeft: 4,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    width: '100%',
  },
  shopName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    width: '100%',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B3147',
    marginLeft: 4,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  productMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  viewsCount: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
  dateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
});

export default ProductCard; 