import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useAuth } from '../../../context/AuthContext';
import { useAppTheme } from '../../../constants/themeContext';

const SellerRegisterScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    shopType: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Add social login handler
  const handleSocialLogin = (provider) => {
    // TODO: Implement social login logic
    console.log('Social login with:', provider);
    
    // For demonstration, navigate to VerificationPending after social login attempt
    navigation.navigate('VerificationPending');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[^\d]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.shopType) {
      newErrors.shopType = 'Shop type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        // Prepare the data for API
        const userData = {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          shopType: formData.shopType,
          role: 'seller',
        };
        
        // For testing, comment out actual registration
        // const newUser = await register(userData);
        
        // Navigate to verification pending screen
        navigation.navigate('VerificationPending');
        
      } catch (error) {
        // For testing, navigate even on error
        navigation.navigate('VerificationPending');
        
        // Show error alert
        const errorMsg = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         "Could not create seller account. Please try again.";
                         
        Alert.alert(
          "Registration Failed", 
          errorMsg
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Add back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animatable.View
          animation="fadeInDown"
          duration={1000}
          style={styles.header}
        >
          <Text style={[styles.welcomeText, { color: colors.text }]}>Create Seller Account</Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#aaa' : '#64748b' }]}>Please fill in the form to register as a seller</Text>
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          duration={1000}
          delay={300}
          style={styles.formContainer}
        >
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your full name"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
              value={formData.fullName}
              onChangeText={(value) => handleChange('fullName', value)}
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your phone number"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Shop Type</Text>
            <TextInput
              style={[styles.input, errors.shopType && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Retail, Wholesale, Manufacturing"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
              value={formData.shopType}
              onChangeText={(value) => handleChange('shopType', value)}
            />
            {errors.shopType && (
              <Text style={styles.errorText}>{errors.shopType}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.passwordContainer, errors.password && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={isDarkMode ? '#aaa' : '#64748b'}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
            <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                value={formData.confirmPassword}
                onChangeText={(value) => handleChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={isDarkMode ? '#aaa' : '#64748b'}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>{isLoading ? 'Creating Account...' : 'Create Seller Account'}</Text>
          </TouchableOpacity>

          {/* Add social login options */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: isDarkMode ? '#aaa' : '#64748b' }]}>Or register with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border }]}
              onPress={() => handleSocialLogin('google')}
            >
              <Ionicons name="logo-google" size={24} color="#ea4335" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border }]}
              onPress={() => handleSocialLogin('facebook')}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877f2" />
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: isDarkMode ? '#aaa' : '#64748b' }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.text }]}>Login</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 70, // Add extra padding for back button
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 16,
  },
  registerButton: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  loginText: {
    color: '#64748b',
    fontSize: 16,
  },
  loginLink: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#64748b',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});

export default SellerRegisterScreen; 