import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import useAuthStore from "../../store/authStore";
import { LinearGradient } from "expo-linear-gradient";

const RegisterScreen = ({ navigation }) => {
  const { 
    signUp, 
    signInWithGoogle, 
    signInWithFacebook, 
    signInWithApple,
    requestTrackingPermission,
    loading 
  } = useAuthStore();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [role, setRole] = useState("buyer");
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  // Check if Apple Sign In is available and request tracking permission
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
  }, []); // 'buyer' or 'seller'

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      Alert.alert("Error", "Please enter your first name");
      return false;
    }
    if (!formData.lastName.trim()) {
      Alert.alert("Error", "Please enter your last name");
      return false;
    }
    if (!formData.username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return false;
    }
    if (!formData.password) {
      Alert.alert("Error", "Please enter a password");
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    if (!agreeToTerms) {
      Alert.alert("Error", "Please agree to the Terms & Conditions");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const userData = {
        firstname: formData.firstName,
        lastname: formData.lastName,
        username: formData.username,
        email: formData.email,
        cellphone_no: formData.phoneNumber,
        role: role,
      };

      const { success, error } = await signUp(
        formData.email,
        formData.password,
        userData
      );

      if (!success) {
        Alert.alert("Registration Failed", error || "Failed to create account");
        return;
      }

      if (role === "seller") {
        navigation.navigate("VerificationPending");
      }
      // For buyers, navigation will be handled by the Navigation component based on auth state
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "An error occurred during registration"
      );
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Social authentication handlers
  const handleAppleRegister = async () => {
    try {
      const { success, error } = await signInWithApple();
      if (!success) {
        Alert.alert("Apple Registration Error", error || "Error while signing up with Apple");
      }
      // If successful, user will be automatically redirected by the auth system
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred during Apple sign-up");
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const { success, error } = await signInWithGoogle();
      if (!success) {
        Alert.alert("Google Registration Error", error || "Error while signing up with Google");
      }
      // If successful, user will be automatically redirected by the auth system
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred during Google sign-up");
    }
  };

  const handleFacebookRegister = async () => {
    try {
      const { success, error } = await signInWithFacebook();
      if (!success) {
        Alert.alert("Facebook Registration Error", error || "Error while signing up with Facebook");
      }
      // If successful, user will be automatically redirected by the auth system
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred during Facebook sign-up");
    }
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Animatable.Text animation="fadeInDown" style={styles.title}>
              Create Account
            </Animatable.Text>
            <Text style={styles.subtitle}>
              Join our community and start shopping
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
                    onChangeText={(value) =>
                      handleInputChange("firstName", value)
                    }
                    editable={!loading}
                  />
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor={COLORS.textLight}
                    value={formData.lastName}
                    onChangeText={(value) =>
                      handleInputChange("lastName", value)
                    }
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="at-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={COLORS.textLight}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange("username", value)}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={COLORS.textLight}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

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
                  value={formData.phoneNumber}
                  onChangeText={(value) =>
                    handleInputChange("phoneNumber", value)
                  }
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textLight}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.textLight}
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    handleInputChange("confirmPassword", value)
                  }
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-outline" : "eye-off-outline"
                    }
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>

              {role === "seller" && (
                <View style={styles.sellerNote}>
                  <Ionicons
                    name="information-circle-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                  <Text style={styles.sellerNoteText}>
                    As a seller, you'll need to verify your account and create a
                    shop profile before you can start selling.
                  </Text>
                </View>
              )}

              <Pressable
                style={styles.termsContainer}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
                disabled={loading}
              >
                <View style={styles.checkbox}>
                  {agreeToTerms && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={COLORS.primary}
                    />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text style={styles.termsLink}>Terms & Conditions</Text> and{" "}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </Pressable>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (!agreeToTerms || loading) && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={!agreeToTerms || loading}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or register with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                {isAppleSignInAvailable && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.appleButton]}
                    disabled={loading}
                    onPress={handleAppleRegister}
                  >
                    <Ionicons name="logo-apple" size={25} color={COLORS.white} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.socialButton}
                  disabled={loading}
                  onPress={handleGoogleRegister}
                >
                  <Ionicons
                    name="logo-google"
                    size={25}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  disabled={loading}
                  onPress={handleFacebookRegister}
                >
                  <Ionicons
                    name="logo-facebook"
                    size={30}
                    color={COLORS.facebookColor}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}
                >
                  <Text style={styles.loginText}>Login</Text>
                </TouchableOpacity>
              </View>
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
    // backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    // backgroundColor: COLORS.primary,
  },
  header: {
    paddingTop: Platform.OS === "android" ? 20 : 0,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.h1,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.body1,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    opacity: 0.8,
  },
  form: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    marginBottom: -70,
    ...SHADOWS.large,
  },
  roleContainer: {
    marginBottom: 24,
  },
  roleTitle: {
    fontSize: SIZES.h4,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: SIZES.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.body2,
    fontFamily: FONTS.medium,
    marginLeft: 8,
  },
  roleButtonTextActive: {
    color: COLORS.white,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  halfWidth: {
    width: "48%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.radius.lg,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: SIZES.body1,
    fontFamily: FONTS.regular,
  },
  eyeIcon: {
    padding: 4,
  },
  sellerNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.primary}10`,
    padding: 16,
    borderRadius: SIZES.radius.lg,
    marginBottom: 24,
  },
  sellerNoteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: SIZES.body2,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  termsText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: SIZES.body2,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: SIZES.radius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.surfaceMedium,
    ...SHADOWS.small,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: SIZES.h4,
    fontFamily: FONTS.semiBold,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.body2,
    fontFamily: FONTS.regular,
    marginHorizontal: 16,
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: SIZES.radius.lg,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    paddingBottom: Platform.OS === "ios" ? 0 : 16,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.body2,
    fontFamily: FONTS.regular,
  },
  loginText: {
    color: COLORS.primary,
    fontSize: SIZES.body2,
    fontFamily: FONTS.semiBold,
    marginLeft: 4,
  },
});

export default RegisterScreen;
