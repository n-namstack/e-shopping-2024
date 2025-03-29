import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.gradientBackground}
      >
        {/* Top Section with Animated Images */}
        <View style={styles.topSection}>
          <Animatable.View 
            animation="fadeIn" 
            duration={1000} 
            delay={500}
            style={styles.imageGrid}
          >
            <Image
              source={require('../../../assets/shopping1.png')}
              style={styles.gridImage}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/shopping2.png')}
              style={styles.gridImage}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/shopping3.png')}
              style={styles.gridImage}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/shopping.png')}
              style={styles.gridImage}
              resizeMode="contain"
            />
          </Animatable.View>
        </View>

        {/* Bottom Section */}
        <Animatable.View 
          animation="fadeInUp"
          duration={1000}
          delay={1000}
          style={styles.bottomSection}
        >
          <Text style={styles.title}>Let's Get Started</Text>
          <Text style={styles.subtitle}>
            Convenient shopping at your doorstep.{'\n'}
            Shopping, Selling, Delivery and Advertisement
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.buttonText}>Join Now</Text>
          </TouchableOpacity>

          <View style={styles.communitySection}>
            <Text style={styles.communityText}>Join the E-Shopping Community</Text>
            
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.outlineButtonText}>Register as buyer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.navigate('SellerRegister')}
            >
              <Text style={styles.outlineButtonText}>Register as seller</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginText}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
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
  topSection: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: width * 0.8,
    gap: 10,
  },
  gridImage: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  communitySection: {
    marginTop: 20,
  },
  communityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  outlineButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
  },
  loginText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default WelcomeScreen; 