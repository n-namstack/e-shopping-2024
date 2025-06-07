import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

const PriceHistory = ({
  priceData = [],
  currentPrice,
  style,
  onPriceAlertPress,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('3M');
  const [showChart, setShowChart] = useState(false);

  const periods = [
    { key: '1M', label: '1M', days: 30 },
    { key: '3M', label: '3M', days: 90 },
    { key: '6M', label: '6M', days: 180 },
    { key: '1Y', label: '1Y', days: 365 },
  ];

  const filterDataByPeriod = (data, days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };

  const filteredData = filterDataByPeriod(priceData, 
    periods.find(p => p.key === selectedPeriod)?.days || 90
  );

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

  const chartData = {
    labels: filteredData.map((_, index) => {
      if (index % Math.ceil(filteredData.length / 4) === 0 || index === filteredData.length - 1) {
        return new Date(filteredData[index].date).toLocaleDateString('en-US', { month: 'short' });
      }
      return '';
    }),
    datasets: [
      {
        data: filteredData.map(item => item.price),
        color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

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
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowChart(!showChart)}
        >
          <Ionicons
            name={showChart ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
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

      {showChart && (
        <View style={styles.chartContainer}>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.activePeriodButton,
                ]}
                onPress={() => setSelectedPeriod(period.key)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period.key && styles.activePeriodText,
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredData.length > 1 && (
            <LineChart
              data={chartData}
              width={screenWidth - 60}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={false}
            />
          )}
        </View>
      )}

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
  chartContainer: {
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriodButton: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  activePeriodText: {
    color: COLORS.white,
  },
  chart: {
    borderRadius: 16,
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