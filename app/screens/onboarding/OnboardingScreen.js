import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const onboardingData = [
    {
      id: '1',
      title: 'Easy Shopping',
      description: 'Shop your favorite products anytime, anywhere with our intuitive mobile experience',
      icon: 'shopping-bag',
      iconType: 'fontawesome'
    },
    {
      id: '2',
      title: 'Secure Payment',
      description: 'Your transactions are protected with industry-leading security protocols',
      icon: 'shield-alt',
      iconType: 'fontawesome'
    },
    {
      id: '3',
      title: 'Quick Delivery',
      description: 'Get your orders delivered to your doorstep quickly and efficiently',
      icon: 'shipping-fast',
      iconType: 'fontawesome'
    }
  ];

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
    } else {
      handleSkip();
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
    navigation.navigate('Welcome');
  };

  const renderItem = ({ item, index }) => {
    return (
      <View style={styles.slide}>
        <Animatable.View
          animation="fadeIn"
          duration={1000}
          delay={300}
          style={styles.cardContainer}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name={item.icon} size={60} color="#0f172a" />
            </View>
          </View>
          
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={500}
            style={styles.textContainer}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </Animatable.View>
        </Animatable.View>
        
        {/* Pagination dots inside each card */}
        <View style={styles.paginationContainer}>
          {onboardingData.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.paginationDot,
                currentIndex === idx ? styles.paginationDotActive : null
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0] !== undefined) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      
      {/* Bottom Get Started button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleSkip}
        >
          <Text style={styles.nextButtonText}>Get Started</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE9F9', // Light purple background
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width,
    height: height,
    paddingTop: 100,
    paddingBottom: 80,
    alignItems: 'center',
  },
  cardContainer: {
    width: width - 60,
    height: height * 0.6,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 5,
    shadowColor: '#6A48D7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 30,
  },
  iconContainer: {
    width: '100%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(15, 23, 42, 0.08)', // Lighter shade of #0f172a
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#0f172a', // Dark color specified by user
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1C4E9',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#0f172a', // Changed from purple to dark navy
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  nextButton: {
    width: '100%',
    height: 60,
    borderRadius: 15,
    backgroundColor: '#0f172a', // Dark blue color
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8
  }
});

export default OnboardingScreen; 