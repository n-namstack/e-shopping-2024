import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

const RecommendedProducts = ({
  products = [],
  title = "You might also like",
  onProductPress,
  onViewAllPress,
  showViewAll = true,
  itemWidth = 180,
  style,
}) => {
  const renderProduct = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.productCard, { width: itemWidth }]}
      onPress={() => onProductPress?.(item)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {item.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}% OFF</Text>
          </View>
        )}
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons
            name={item.isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={item.isFavorite ? COLORS.red : COLORS.gray}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.floor(item.rating || 4.5) ? "star" : "star-outline"}
                size={12}
                color={COLORS.warning}
              />
            ))}
          </View>
          <Text style={styles.rating}>{item.rating || 4.5}</Text>
          <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
        </View>
        <View style={styles.priceContainer}>
          {item.originalPrice && item.originalPrice !== item.price && (
            <Text style={styles.originalPrice}>${item.originalPrice}</Text>
          )}
          <Text style={styles.price}>${item.price}</Text>
        </View>
        
        {/* Quick Add to Cart Button */}
        <TouchableOpacity style={styles.quickAddButton}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={styles.quickAddText}>Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showViewAll && (
          <TouchableOpacity onPress={onViewAllPress} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        snapToInterval={itemWidth + 12}
        decelerationRate="fast"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginRight: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productInfo: {
    padding: 14,
    position: 'relative',
  },
  productName: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.black,
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  rating: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.black,
    marginRight: 2,
  },
  reviewCount: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  price: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickAddText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
});

export default RecommendedProducts; 