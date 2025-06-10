import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

const StockAlert = ({
  stockLevel,
  lowStockThreshold = 10,
  veryLowStockThreshold = 5,
  outOfStockThreshold = 0,
  onNotifyMePress,
  style,
  showAnimation = true,
}) => {
  const [animatedValue] = useState(new Animated.Value(1));
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const shouldShowAlert = stockLevel <= lowStockThreshold;
    setShowAlert(shouldShowAlert);

    if (shouldShowAlert && showAnimation) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [stockLevel, lowStockThreshold, showAnimation]);

  const getAlertConfig = () => {
    if (stockLevel <= outOfStockThreshold) {
      return {
        type: 'outOfStock',
        color: COLORS.red,
        backgroundColor: '#FFEBEE',
        icon: 'close-circle',
        title: 'Out of Stock',
        message: 'Currently unavailable',
        actionText: 'Notify when available',
      };
    } else if (stockLevel <= veryLowStockThreshold) {
      return {
        type: 'veryLow',
        color: COLORS.red,
        backgroundColor: '#FFF3E0',
        icon: 'warning',
        title: 'Very Low Stock',
        message: `Only ${stockLevel} left in stock!`,
        actionText: 'Order now',
      };
    } else if (stockLevel <= lowStockThreshold) {
      return {
        type: 'low',
        color: COLORS.warning,
        backgroundColor: '#FFF8E1',
        icon: 'alert',
        title: 'Low Stock',
        message: `Only ${stockLevel} items remaining`,
        actionText: 'Order soon',
      };
    }
    return null;
  };

  const alertConfig = getAlertConfig();

  if (!showAlert || !alertConfig) {
    return null;
  }

  const handleActionPress = () => {
    if (alertConfig.type === 'outOfStock') {
      onNotifyMePress?.();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: alertConfig.backgroundColor,
          borderColor: alertConfig.color,
          transform: [{ scale: animatedValue }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: alertConfig.color }]}>
          <Ionicons
            name={alertConfig.icon}
            size={18}
            color={COLORS.white}
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: alertConfig.color }]}>
            {alertConfig.title}
          </Text>
          <Text style={styles.message}>
            {alertConfig.message}
          </Text>
        </View>

        {alertConfig.type === 'outOfStock' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: alertConfig.color }]}
            onPress={handleActionPress}
          >
            <Ionicons name="notifications" size={14} color={COLORS.white} />
            <Text style={styles.actionButtonText}>
              Notify Me
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {alertConfig.type !== 'outOfStock' && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min((stockLevel / lowStockThreshold) * 100, 100)}%`,
                  backgroundColor: alertConfig.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stockLevel} / {lowStockThreshold} items
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 2,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: COLORS.lightGray2,
    borderRadius: 3,
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    textAlign: 'right',
  },
});

export default StockAlert; 