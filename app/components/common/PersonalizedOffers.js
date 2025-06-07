import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

const PersonalizedOffers = ({
  offers = [],
  onOfferPress,
  onClaimOffer,
  style,
}) => {
  const [animatedValue] = useState(new Animated.Value(0));
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

  useEffect(() => {
    if (offers.length > 0) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();

      return () => shimmerAnimation.stop();
    }
  }, [offers.length]);

  const getOfferTypeConfig = (type) => {
    switch (type) {
      case 'exclusive':
        return {
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          solidColor: '#667eea',
          icon: 'star',
          badgeText: 'EXCLUSIVE',
          badgeColor: '#FFD700',
        };
      case 'limited':
        return {
          backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          solidColor: '#f093fb',
          icon: 'time',
          badgeText: 'LIMITED TIME',
          badgeColor: '#FF6B6B',
        };
      case 'flash':
        return {
          backgroundColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          solidColor: '#4facfe',
          icon: 'flash',
          badgeText: 'FLASH DEAL',
          badgeColor: '#00f2fe',
        };
      case 'personal':
        return {
          backgroundColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          solidColor: '#a8edea',
          icon: 'person',
          badgeText: 'JUST FOR YOU',
          badgeColor: '#fed6e3',
        };
      default:
        return {
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          solidColor: COLORS.primary,
          icon: 'gift',
          badgeText: 'SPECIAL OFFER',
          badgeColor: COLORS.warning,
        };
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'EXPIRED';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  const shimmerOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  if (!offers || offers.length === 0) {
    return null;
  }

  const currentOffer = offers[currentOfferIndex];
  const config = getOfferTypeConfig(currentOffer.type);
  const timeRemaining = formatTimeRemaining(currentOffer.expiresAt);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.offerCard, { backgroundColor: config.solidColor }]}
        onPress={() => onOfferPress?.(currentOffer)}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]} />
        
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: config.badgeColor }]}>
            <Ionicons name={config.icon} size={12} color={COLORS.white} />
            <Text style={styles.badgeText}>{config.badgeText}</Text>
          </View>
          
          {timeRemaining && (
            <View style={styles.timeContainer}>
              <Ionicons name="time" size={12} color={COLORS.white} />
              <Text style={styles.timeText}>{timeRemaining}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.offerInfo}>
            <Text style={styles.offerTitle}>{currentOffer.title}</Text>
            <Text style={styles.offerDescription}>{currentOffer.description}</Text>
            
            <View style={styles.discountContainer}>
              <Text style={styles.discountText}>
                {currentOffer.discountType === 'percentage' 
                  ? `${currentOffer.discountValue}% OFF`
                  : `$${currentOffer.discountValue} OFF`
                }
              </Text>
              {currentOffer.minPurchase && (
                <Text style={styles.minPurchaseText}>
                  Min. purchase ${currentOffer.minPurchase}
                </Text>
              )}
            </View>
          </View>

          {currentOffer.productImage && (
            <View style={styles.productImageContainer}>
              <Image
                source={{ uri: currentOffer.productImage }}
                style={styles.productImage}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => onClaimOffer?.(currentOffer)}
          >
            <Text style={styles.claimButtonText}>CLAIM OFFER</Text>
            <Ionicons name="arrow-forward" size={16} color={config.solidColor} />
          </TouchableOpacity>

          {offers.length > 1 && (
            <View style={styles.pagination}>
              {offers.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentOfferIndex && styles.activePaginationDot,
                  ]}
                  onPress={() => setCurrentOfferIndex(index)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.decorativeElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  offerCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontFamily: FONTS.bold,
    marginBottom: 6,
  },
  offerDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 12,
    lineHeight: 20,
  },
  discountContainer: {
    marginBottom: 8,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 28,
    fontFamily: FONTS.bold,
    letterSpacing: 1,
  },
  minPurchaseText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginLeft: 16,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  claimButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    marginRight: 8,
    letterSpacing: 0.5,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activePaginationDot: {
    backgroundColor: COLORS.white,
    width: 20,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  circle1: {
    width: 100,
    height: 100,
    top: -30,
    right: -30,
  },
  circle2: {
    width: 60,
    height: 60,
    bottom: -20,
    left: -20,
  },
  circle3: {
    width: 40,
    height: 40,
    top: '50%',
    right: 20,
  },
});

export default PersonalizedOffers; 