import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(1);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  
  // Create references for each image to apply different animations
  const imageAnimRefs = Array(4).fill(0).map(() => useRef());
  
  useEffect(() => {
    // Start entrance animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-advance the carousel
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % 3);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Custom button animation
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const onPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const onPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animateImage = (index) => {
    const animations = ['pulse', 'swing', 'bounceIn', 'zoomIn'];
    if (imageAnimRefs[index].current) {
      imageAnimRefs[index].current[animations[index]]();
    }
  };

  // Different animation for each feature section
  const getFeatureAnimation = (index) => {
    return activeIndex === index ? 'fadeIn' : 'fadeOut';
  };

  // Content for feature carousel
  const features = [
    {
      title: 'Discover Amazing Products',
      description: 'Browse through thousands of unique items from sellers around the world',
      icon: 'search-outline'
    },
    {
      title: 'Fast & Secure Checkout',
      description: 'Our payment process is quick, easy, and completely secure',
      icon: 'lock-closed-outline'
    },
    {
      title: 'Become a Seller',
      description: 'List your products and start selling to millions of customers',
      icon: 'storefront-outline'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4169E1', '#60A5FA']}
        style={styles.gradientBackground}
      >
        {/* Add three icons in the blue area */}
        <View style={styles.iconSection}>
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="shopping-cart" size={30} color="#0f172a" />
            </View>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="store" size={30} color="#0f172a" />
            </View>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="truck" size={30} color="#0f172a" />
            </View>
          </View>
          <View style={styles.wavyLine}></View>
        </View>

        {/* Bottom Section */}
        <Animated.View 
          style={[
            styles.bottomSection,
            {
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY }]
            }
          ]}
        >
          {/* Feature carousel */}
          <View style={styles.featureCarousel}>
            {features.map((feature, index) => (
              <Animatable.View
                key={index}
                animation={getFeatureAnimation(index)}
                duration={500}
                style={[
                  styles.featureItem,
                  { display: activeIndex === index ? 'flex' : 'none' }
                ]}
              >
                <View style={styles.featureIconContainer}>
                  <Ionicons name={feature.icon} size={28} color="#1E40AF" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </Animatable.View>
            ))}
            
            {/* Carousel indicators */}
            <View style={styles.indicatorContainer}>
              {features.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    activeIndex === index && styles.activeIndicator
                  ]}
                  onPress={() => setActiveIndex(index)}
                />
              ))}
            </View>
          </View>

          <Text style={styles.title}>Let's Get Started</Text>
          <Text style={styles.subtitle}>
            Join our community and experience the future of online shopping
          </Text>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                transform: [{ scale: buttonScale }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Auth')}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Join Now</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.communitySection}>
            <Text style={styles.communityText}>Register as</Text>
            
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => navigation.navigate('Register')}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="cart-outline" size={28} color="#1E40AF" />
                </View>
                <Text style={styles.roleText}>Buyer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => navigation.navigate('SellerRegister')}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="storefront-outline" size={28} color="#1E40AF" />
                </View>
                <Text style={styles.roleText}>Seller</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginText}>Already have an account?</Text>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    marginTop: height * 0.15, // Further reduce this to push white section up
  },
  featureCarousel: {
    height: 110,
    marginBottom: 20, // Reduce from 40 to pull things up
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 6,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 20,
    backgroundColor: '#1E40AF',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 30,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginBottom: 10,
    width: '100%',
  },
  button: {
    backgroundColor: '#0f172a',
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  communitySection: {
    marginTop: 5,
  },
  communityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  roleButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
  },
  roleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: '#64748B',
    fontSize: 14,
  },
  loginButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  iconSection: {
    height: height * 0.14, // Reduce height to move white section up
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30, // Reduce top margin
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 60, // Smaller icons from 100
    height: 60, // Smaller icons from 100
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 15, // Add spacing between icons
  },
  wavyLine: {
    height: 4,
    width: width * 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
    marginTop: 15, // Reduce from 20
  },
});

export default WelcomeScreen; 