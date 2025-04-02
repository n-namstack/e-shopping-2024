import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

const { width } = Dimensions.get('window');

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product?.main_image || product?.images?.[0] || null);
  
  const { user } = useAuthStore();
  const { addToCart } = useCartStore();
  
  // Format price with commas
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const incrementQuantity = () => {
    if (quantity < product.quantity) {
      setQuantity(quantity + 1);
    } else {
      Alert.alert('Maximum Quantity', 'You have reached the maximum available quantity for this product.');
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }
        ]
      );
      return;
    }
    
    addToCart(product, quantity);
    Alert.alert('Success', 'Item added to your cart!');
  };

  const handleBuyNow = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to purchase items.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }
        ]
      );
      return;
    }
    
    addToCart(product, quantity);
    navigation.navigate('CartTab', { screen: 'Cart' });
  };

  const handleViewShop = () => {
    navigation.navigate('ShopDetails', { shopId: product.shop_id });
  };

  // If product is not available
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Product not found</Text>
          <Button
            title="Go Back"
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Main product image */}
        <View style={styles.imageContainer}>
          <Image
            source={selectedImage ? { uri: selectedImage } : require('../../../assets/logo-placeholder.png')}
            style={styles.mainImage}
            resizeMode="cover"
          />
          
          {/* Stock badge */}
          {product.in_stock ? (
            <View style={styles.inStockBadge}>
              <Text style={styles.inStockText}>In Stock</Text>
            </View>
          ) : (
            <View style={styles.onOrderBadge}>
              <Text style={styles.onOrderText}>On Order</Text>
            </View>
          )}
          
          {/* Sale badge */}
          {product.is_on_sale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>{`${product.discount_percentage}% OFF`}</Text>
            </View>
          )}
        </View>

        {/* Thumbnail images */}
        {product.additional_images && product.additional_images.length > 0 && (
          <View style={styles.thumbnailContainer}>
            <FlatList
              data={[product.main_image, ...product.additional_images]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `image-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.thumbnailItem,
                    selectedImage === item && styles.selectedThumbnail
                  ]}
                  onPress={() => setSelectedImage(item)}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Product details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.shopRow}>
            <Text style={styles.byText}>by </Text>
            <TouchableOpacity onPress={handleViewShop}>
              <Text style={styles.shopName}>{product.shop?.name || 'Shop Name'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.priceSection}>
            <Text style={styles.price}>
              N${formatPrice(product.price)}
            </Text>
            {product.is_on_sale && (
              <Text style={styles.originalPrice}>
                N${formatPrice(product.price * (1 + product.discount_percentage / 100))}
              </Text>
            )}
          </View>
          
          {/* Product details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {product.description || 'No description available.'}
            </Text>
          </View>

          {/* Additional info for On-Order products */}
          {!product.in_stock && (
            <View style={styles.onOrderInfo}>
              <Ionicons name="information-circle-outline" size={24} color="#FF9800" />
              <View style={styles.onOrderTextContainer}>
                <Text style={styles.onOrderTitle}>On Order Product</Text>
                <Text style={styles.onOrderDescription}>
                  This product needs to be ordered from our suppliers. A 50% deposit is required, and the remaining balance will be due when the product arrives.
                </Text>
                {product.est_arrival_days && (
                  <Text style={styles.estimatedArrival}>
                    Estimated arrival: {product.est_arrival_days} days
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Product specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Condition:</Text>
              <Text style={styles.specValue}>{product.condition}</Text>
            </View>
            {product.category && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Category:</Text>
                <Text style={styles.specValue}>{product.category}</Text>
              </View>
            )}
            {product.colors && product.colors.length > 0 && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Available Colors:</Text>
                <Text style={styles.specValue}>
                  {Array.isArray(product.colors)
                    ? product.colors.join(', ')
                    : typeof product.colors === 'object'
                    ? Object.keys(product.colors).join(', ')
                    : String(product.colors)}
                </Text>
              </View>
            )}
            {product.sizes && product.sizes.length > 0 && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Available Sizes:</Text>
                <Text style={styles.specValue}>
                  {Array.isArray(product.sizes)
                    ? product.sizes.join(', ')
                    : typeof product.sizes === 'object'
                    ? Object.keys(product.sizes).join(', ')
                    : String(product.sizes)}
                </Text>
              </View>
            )}
          </View>
          
          {/* Quantity selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={decrementQuantity}
              >
                <Ionicons name="remove" size={20} color="#666" />
              </TouchableOpacity>
              <View style={styles.quantityValue}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title={product.in_stock ? "Add to Cart" : "Pay 50% Deposit"}
              variant="outline"
              isFullWidth
              onPress={handleAddToCart}
              style={styles.addToCartButton}
            />
            <Button
              title={product.in_stock ? "Buy Now" : "Process Order"}
              variant="primary"
              isFullWidth
              onPress={handleBuyNow}
              style={styles.buyNowButton}
            />
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  inStockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  inStockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onOrderBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  onOrderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saleBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  saleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    marginHorizontal: 8,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  selectedThumbnail: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  byText: {
    fontSize: 14,
    color: '#666',
  },
  shopName: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  onOrderInfo: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  onOrderTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  onOrderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  onOrderDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  estimatedArrival: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9800',
    marginTop: 8,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  specLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  specValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    width: 50,
    height: 36,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 30,
  },
  addToCartButton: {
    marginBottom: 12,
  },
  buyNowButton: {},
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },
  goBackButton: {
    marginTop: 20,
  },
});

export default ProductDetailsScreen; 