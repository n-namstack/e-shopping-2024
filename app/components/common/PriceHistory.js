import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

const PriceHistory = ({
  priceData = [],
  currentPrice,
  style,
  onPriceAlertPress,
}) => {

  const filteredData = priceData;

  const calculatePriceChange = () => {
    if (filteredData.length < 2) return { change: 0, percentage: 0 };
    
    const firstPrice = filteredData[0].price;
    const lastPrice = filteredData[filteredData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentage = (change / firstPrice) * 100;
    
    return { change, percentage };
  };

  const getLowestPrice = () => {
    if (filteredData.length === 0) return currentPrice;
    return Math.min(...filteredData.map(item => item.price));
  };

  const getHighestPrice = () => {
    if (filteredData.length === 0) return currentPrice;
    return Math.max(...filteredData.map(item => item.price));
  };

  const { change, percentage } = calculatePriceChange();
  const lowestPrice = getLowestPrice();
  const highestPrice = getHighestPrice();
  const isPositiveChange = change >= 0;

  if (!priceData || priceData.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="trending-up" size={20} color={COLORS.primary} />
          <Text style={styles.title}>Price History</Text>
        </View>

      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>${currentPrice}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Lowest</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            ${lowestPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Highest</Text>
          <Text style={[styles.statValue, { color: COLORS.red }]}>
            ${highestPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Change</Text>
          <Text style={[
            styles.statValue,
            { color: isPositiveChange ? COLORS.success : COLORS.red }
          ]}>
            {isPositiveChange ? '+' : ''}${change.toFixed(2)}
          </Text>
          <Text style={[
            styles.percentageText,
            { color: isPositiveChange ? COLORS.success : COLORS.red }
          ]}>
            ({isPositiveChange ? '+' : ''}{percentage.toFixed(1)}%)
          </Text>
        </View>
      </View>



      <TouchableOpacity
        style={styles.alertButton}
        onPress={onPriceAlertPress}
      >
        <Ionicons name="notifications" size={16} color={COLORS.primary} />
        <Text style={styles.alertButtonText}>Set Price Alert</Text>
      </TouchableOpacity>
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
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
  percentageText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },

  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  alertButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginLeft: 6,
  },
});

export default PriceHistory; 