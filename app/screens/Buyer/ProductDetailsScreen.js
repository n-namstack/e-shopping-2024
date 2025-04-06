import React, { useState, useRef, useEffect } from 'react';
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
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const ProductDetailsScreen = ({ route, navigation }) => {
  const { product } = route.params || {};
  const [quantity, setQuantity] = useState(1);
  
  // States for image carousel
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const { user } = useAuthStore();
  const { addToCart } = useCartStore();
  
  // Prepare images array for carousel
  const productImages = product?.images?.length > 0 
    ? product.images 
    : product?.main_image 
      ? [product.main_image, ...(product.additional_images || [])] 
      : [require('../../../assets/logo-placeholder.png')];
  
  // Format price with commas
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  // Map database fields to the ones we use in the UI
  const productData = {
    ...product,
    quantity: product.stock_quantity || 0,
    in_stock: product.is_on_order !== undefined ? !product.is_on_order : (product.stock_quantity > 0)
  };

  const incrementQuantity = () => {
    if (quantity < productData.quantity) {
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
    
    addToCart(productData, quantity);
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
    
    addToCart(productData, quantity);
    navigation.navigate('CartTab', { screen: 'Cart' });
  };

  const handleViewShop = () => {
    navigation.navigate('ShopDetails', { shopId: product.shop_id });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(newIndex);
  };

  const renderImageItem = ({ item }) => {
    return (
      <View style={styles.imageSlide}>
        <Image
          source={typeof item === 'string' ? { uri: item } : item}
          style={styles.carouselImage}
          resizeMode="cover"
        />
      </View>
    );
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
      <StatusBar style="dark" />
      
      {/* Header with back button and share button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image Carousel and Pagination */}
        <View style={styles.carouselWrapper}>
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={productImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              keyExtractor={(_, index) => `image-${index}`}
              renderItem={renderImageItem}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />
            
            {/* Stock and Sale badges */}
            <View style={styles.badgesContainer}>
              {productData.in_stock ? (
                <View style={styles.inStockBadge}>
                  <Text style={styles.inStockText}>In Stock</Text>
                </View>
              ) : (
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
            
            {/* Pagination dots - moved to bottom of image */}
            {productImages.length > 1 && (
              <View style={styles.paginationContainer}>
                {productImages.map((_, index) => {
                  const inputRange = [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                  ];

                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 20, 8],
                    extrapolate: 'clamp',
                  });

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          width: dotWidth,
                          opacity,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Product details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.shopRow}>
            <Text style={styles.byText}>By </Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={handleViewShop}
            >
              <Text style={styles.shopName}>{product.shop?.name || 'Shop Name'}</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
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
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.description}>
              {product.description || 'No description available.'}
            </Text>
          </View>

          {/* Additional info for On-Order products */}
          {!productData.in_stock && (
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
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Specifications</Text>
            </View>
            
            <View style={styles.specsContainer}>
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
                <View style={[styles.specRow, styles.specRowLast]}>
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
          </View>
          
          {/* Quantity selector */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="basket-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Quantity</Text>
            </View>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={decrementQuantity}
              >
                <Ionicons name="remove" size={22} color="#666" />
              </TouchableOpacity>
              <View style={styles.quantityValue}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={22} color="#666" />
              </TouchableOpacity>
              
              <Text style={styles.stockInfo}>
                {productData.quantity > 10 
                  ? 'In Stock' 
                  : productData.quantity > 0 
                    ? `Only ${productData.quantity} left` 
                    : 'Out of Stock'}
              </Text>
            </View>
          </View>
          
          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title={productData.in_stock ? "Add to Cart" : "Pay 50% Deposit"}
              variant="outline"
              isFullWidth
              onPress={handleAddToCart}
              style={styles.addToCartButton}
            />
            <Button
              title={productData.in_stock ? "Buy Now" : "Process Order"}
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
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
  },
  carouselWrapper: {
    position: 'relative',
  },
  carouselContainer: {
    position: 'relative',
    height: 380,
    width: width,
    backgroundColor: '#F8F9FA',
  },
  imageSlide: {
    width: width,
    height: 380,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  carouselImage: {
    width: width,
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgesContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  inStockBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  inStockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onOrderBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  onOrderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saleBadge: {
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
  detailsContainer: {
    padding: 22,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  byText: {
    fontSize: 14,
    color: '#666',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  shopName: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 2,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  price: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 10,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
  },
  onOrderInfo: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
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
  specsContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 8,
  },
  specRowLast: {
    marginBottom: 0,
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  specLabel: {
    width: 130,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  specValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  quantityValue: {
    width: 60,
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
  },
  stockInfo: {
    marginLeft: 20,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  addToCartButton: {
    marginBottom: 14,
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