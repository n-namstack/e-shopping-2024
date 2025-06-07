import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

const FrequentlyBoughtTogether = ({
  mainProduct,
  suggestedProducts = [],
  onAddBundleToCart,
  style,
}) => {
  const [selectedItems, setSelectedItems] = useState(
    [mainProduct, ...suggestedProducts].map((item, index) => ({
      ...item,
      selected: index === 0, // Main product is always selected
      isMainProduct: index === 0,
    }))
  );

  const toggleItemSelection = (index) => {
    if (selectedItems[index].isMainProduct) return; // Can't deselect main product
    
    setSelectedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const calculateTotalPrice = () => {
    return selectedItems
      .filter(item => item.selected)
      .reduce((total, item) => total + item.price, 0);
  };

  const calculateTotalOriginalPrice = () => {
    return selectedItems
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.originalPrice || item.price), 0);
  };

  const selectedCount = selectedItems.filter(item => item.selected).length;
  const totalPrice = calculateTotalPrice();
  const originalPrice = calculateTotalOriginalPrice();
  const savings = originalPrice - totalPrice;

  const handleAddToCart = () => {
    const selectedProducts = selectedItems.filter(item => item.selected);
    onAddBundleToCart?.(selectedProducts);
  };

  if (!suggestedProducts || suggestedProducts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="basket" size={20} color={COLORS.primary} />
          <Text style={styles.title}>Frequently bought together</Text>
        </View>
        {savings > 0 && (
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsText}>Save ${savings.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.itemsContainer}>
          {selectedItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity
                style={[
                  styles.productItem,
                  !item.selected && styles.unselectedItem,
                  item.isMainProduct && styles.mainProductItem,
                ]}
                onPress={() => toggleItemSelection(index)}
                disabled={item.isMainProduct}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  {item.isMainProduct && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>THIS ITEM</Text>
                    </View>
                  )}
                  <View style={styles.checkbox}>
                    <Ionicons
                      name={item.selected ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={item.selected ? COLORS.success : COLORS.gray}
                    />
                  </View>
                </View>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.priceContainer}>
                  {item.originalPrice && item.originalPrice !== item.price && (
                    <Text style={styles.originalPrice}>${item.originalPrice}</Text>
                  )}
                  <Text style={styles.price}>${item.price}</Text>
                </View>
              </TouchableOpacity>
              
              {index < selectedItems.length - 1 && (
                <View style={styles.plusContainer}>
                  <Ionicons name="add" size={16} color={COLORS.gray} />
                </View>
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>
            Total for {selectedCount} items:
          </Text>
          <View style={styles.totalPriceContainer}>
            {originalPrice > totalPrice && (
              <Text style={styles.originalTotalPrice}>
                ${originalPrice.toFixed(2)}
              </Text>
            )}
            <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Ionicons name="cart" size={18} color={COLORS.white} />
          <Text style={styles.addToCartText}>ADD SELECTED TO CART</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    marginLeft: 8,
  },
  savingsContainer: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
  },
  productItem: {
    width: 120,
    marginRight: 8,
    opacity: 1,
  },
  unselectedItem: {
    opacity: 0.5,
  },
  mainProductItem: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    paddingVertical: 2,
  },
  mainBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  productName: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.black,
    marginBottom: 4,
    lineHeight: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  price: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  plusContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray2,
    paddingTop: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.black,
  },
  totalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalTotalPrice: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  totalPrice: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  addToCartText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});

export default FrequentlyBoughtTogether; 