import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../constants/themeContext';
import Checkbox from 'expo-checkbox';
import * as Animatable from 'react-native-animatable';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../../context/AuthContext';
import useAuthStore from '../../../store/authStore';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const { login } = useAuth();
  const { signInWithApple, requestTrackingPermission } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Check Apple Sign In availability
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleSignInAvailable(isAvailable);
      
      // Request tracking permission on component mount
      try {
        await requestTrackingPermission();
      } catch (error) {
        console.log('Tracking permission request failed:', error);
      }
    };
    
    initializeApp();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        const userData = await login(email, password);
        
        // Check if seller account is pending approval
        if (userData && userData.role === 'seller' && !userData.approved) {
          Alert.alert(
            "Account Pending Approval", 
            "Your seller account is currently pending approval. You can log in, but you won't be able to access seller features until approved."
          );
        }
        // Navigation is handled by the AuthContext effect in App.js
      } catch (error) {
        const errorMsg = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         "Invalid email or password. Please try again.";
                         
        Alert.alert(
          "Login Failed", 
          errorMsg
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      const { success, error } = await signInWithApple();
      if (!success) {
        Alert.alert("Apple Login Error", error || "Error while signing in with Apple");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred during Apple sign-in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    // TODO: Implement Google and Facebook login logic
    console.log('Social login with:', provider);
    Alert.alert("Coming Soon", `${provider} login will be available soon!`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

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
          <Text style={[styles.welcomeText, { color: colors.text }]}>Hi, Welcome Back 👋</Text>
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          duration={1000}
          delay={300}
          style={styles.formContainer}
        >
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.passwordContainer, errors.password && styles.inputError, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5', borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                value={password}
                onChangeText={setPassword}
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

          <View style={styles.rememberContainer}>
            <View style={styles.checkboxContainer}>
              <Checkbox
                value={rememberMe}
                onValueChange={setRememberMe}
                color={rememberMe ? '#0f172a' : undefined}
              />
              <Text style={[styles.rememberText, { color: isDarkMode ? '#aaa' : '#64748b' }]}>Remember Me</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={[styles.forgotText, { color: colors.text }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>{isLoading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: isDarkMode ? '#aaa' : '#64748b' }]}>Or login with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtons}>
            {isAppleSignInAvailable && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleLogin}
                disabled={isLoading}
              >
                <Ionicons name="logo-apple" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border }]}
              onPress={() => handleSocialLogin('google')}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={24} color="#ea4335" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border }]}
              onPress={() => handleSocialLogin('facebook')}
              disabled={isLoading}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877f2" />
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: isDarkMode ? '#aaa' : '#64748b' }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerLink, { color: colors.text }]}>Register</Text>
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
    paddingTop: 70,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
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
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    marginLeft: 8,
    color: '#64748b',
  },
  forgotText: {
    color: '#0f172a',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 10,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  registerText: {
    color: '#64748b',
  },
  registerLink: {
    color: '#0f172a',
    fontWeight: '600',
  },
});

export default LoginScreen; 