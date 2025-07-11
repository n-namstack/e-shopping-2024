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
  Pressable,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const SocialProfileCompleteScreen = () => {
  const navigation = useNavigation();
  const { completeSocialProfile, socialUserData, loading, signOut } = useAuthStore();
  
  const [formData, setFormData] = useState({
    firstName: socialUserData?.firstName || '',
    lastName: socialUserData?.lastName || '',
    phone: '',
    username: '',
  });
  const [role, setRole] = useState('buyer'); // Default to buyer
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/[^\d]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = async () => {
    if (!validateForm()) return;

    try {
      const profileData = {
        ...formData,
        role: role // Include selected role
      };
      
      const { success, error } = await completeSocialProfile(profileData);
      
      if (!success) {
        Alert.alert('Error', error || 'Failed to complete profile setup');
        return;
      }

      // Show different success messages based on role
      const successMessage = role === 'seller' 
        ? 'Welcome to ShopIt! Your seller account has been created successfully. You can now start setting up your shop.'
        : 'Welcome to ShopIt! Your account has been created successfully. Happy shopping!';

      Alert.alert(
        'Profile Complete!',
        successMessage,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigation will be handled by auth state change based on role
              if (role === 'seller') {
                // For sellers, they might need to go through verification
                // The navigation system will handle this based on the user's role
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred while completing your profile');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleBack = () => {
    Alert.alert(
      'Cancel Setup',
      'Are you sure you want to cancel? You will be signed out and need to log in again.',
      [
        {
          text: 'Continue Setup',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ],
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.surfaceMedium, COLORS.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Animatable.Text animation="fadeInDown" style={styles.title}>
              Complete Your Profile
            </Animatable.Text>
            <Text style={styles.subtitle}>
              Just a few more details to get you started
            </Text>
          </View>

          <Animatable.View animation="fadeInUp" delay={300} style={styles.form}>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Role Selection */}
              <View style={styles.roleContainer}>
                <Text style={styles.roleTitle}>I want to:</Text>
                <View style={styles.roleButtons}>
                  <Pressable
                    style={[
                      styles.roleButton,
                      role === "buyer" && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole("buyer")}
                    disabled={loading}
                  >
                    <Ionicons
                      name="cart-outline"
                      size={24}
                      color={role === "buyer" ? COLORS.white : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === "buyer" && styles.roleButtonTextActive,
                      ]}
                    >
                      Shop
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.roleButton,
                      role === "seller" && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole("seller")}
                    disabled={loading}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={24}
                      color={role === "seller" ? COLORS.white : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === "seller" && styles.roleButtonTextActive,
                      ]}
                    >
                      Sell
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Name Fields */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor={COLORS.textLight}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    editable={!loading}
                  />
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor={COLORS.textLight}
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    editable={!loading}
                  />
                </View>
              </View>
              {(errors.firstName || errors.lastName) && (
                <Text style={styles.errorText}>
                  {errors.firstName || errors.lastName}
                </Text>
              )}

              {/* Phone Number */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={COLORS.textLight}
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

              {/* Username */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="at-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username"
                  placeholderTextColor={COLORS.textLight}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

              {/* Role Info */}
              {role === 'seller' && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color={COLORS.info} />
                  <Text style={styles.infoText}>
                    As a seller, you'll be able to create shops and list products after verification.
                  </Text>
                </View>
              )}

              {/* Complete Button */}
              <TouchableOpacity
                style={[styles.completeButton, loading && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Setting up...' : 'Complete Profile'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={styles.buttonIcon} />
              </TouchableOpacity>
            </ScrollView>
          </Animatable.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SIZES.spacing.lg,
    paddingTop: SIZES.spacing.lg,
    paddingBottom: SIZES.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.spacing.md,
  },
  title: {
    fontSize: SIZES.h1,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginBottom: SIZES.spacing.sm,
  },
  subtitle: {
    fontSize: SIZES.body1,
    fontFamily: FONTS.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  form: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius.xl,
    borderTopRightRadius: SIZES.radius.xl,
    paddingHorizontal: SIZES.spacing.lg,
    paddingTop: SIZES.spacing.xl,
    paddingBottom: SIZES.spacing.lg,
  },
  roleContainer: {
    marginBottom: SIZES.spacing.xl,
  },
  roleTitle: {
    fontSize: SIZES.h4,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacing.md,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: SIZES.spacing.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.spacing.md,
    borderRadius: SIZES.radius.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: SIZES.spacing.sm,
  },
  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: SIZES.body1,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  roleButtonTextActive: {
    color: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    gap: SIZES.spacing.md,
    marginBottom: SIZES.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.radius.lg,
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? SIZES.spacing.md : 0,
    marginBottom: SIZES.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  halfWidth: {
    flex: 1,
  },
  inputIcon: {
    marginRight: SIZES.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body1,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'android' ? SIZES.spacing.md : 0,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.caption,
    fontFamily: FONTS.regular,
    marginTop: -SIZES.spacing.sm,
    marginBottom: SIZES.spacing.sm,
    marginLeft: SIZES.spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.info}10`,
    padding: SIZES.spacing.md,
    borderRadius: SIZES.radius.md,
    marginBottom: SIZES.spacing.lg,
    gap: SIZES.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.body2,
    fontFamily: FONTS.regular,
    color: COLORS.info,
    lineHeight: 20,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius.lg,
    paddingVertical: SIZES.spacing.md,
    marginTop: SIZES.spacing.lg,
    gap: SIZES.spacing.sm,
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.body1,
    fontFamily: FONTS.semiBold,
  },
  buttonIcon: {
    marginLeft: SIZES.spacing.xs,
  },
});

export default SocialProfileCompleteScreen; 