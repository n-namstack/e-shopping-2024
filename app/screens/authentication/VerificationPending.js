import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const VerificationPending = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();

  // Function to navigate to the main app as a buyer
  const goToMainApp = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  // Function to view profile or logout
  const handleViewProfile = () => {
    // Since we're in the auth flow, we'll just log out for now
    // which will take the user to the login screen
    logout();
  };

  return (
    <View style={styles.container}>
      <Animatable.View 
        animation="bounceIn"
        duration={1500}
        style={styles.iconContainer}
      >
        <Ionicons name="time-outline" size={100} color="#0f172a" />
      </Animatable.View>

      <Animatable.View
        animation="fadeInUp"
        duration={1000}
        delay={500}
      >
        <Text style={styles.title}>Verification Pending</Text>
        <Text style={styles.message}>
          Your seller account is currently under review. This process typically takes 1-2 business days.
          We'll notify you via email once your account is verified.
        </Text>

        <Text style={styles.subMessage}>
          In the meantime, you can:
        </Text>
        <View style={styles.bulletPoints}>
          <Text style={styles.bulletPoint}>• Browse products as a buyer</Text>
          <Text style={styles.bulletPoint}>• Update your profile information</Text>
          <Text style={styles.bulletPoint}>• Prepare your shop details</Text>
        </View>
      </Animatable.View>

      <Animatable.View
        animation="fadeInUp"
        duration={1000}
        delay={1000}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={goToMainApp}
        >
          <Text style={styles.buttonText}>Continue as Buyer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={handleViewProfile}
        >
          <Text style={styles.outlineButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    marginBottom: 12,
  },
  bulletPoints: {
    marginBottom: 32,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerificationPending; 