import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { FONTS } from "../../constants/theme";
import useAuthStore from "../../store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";


const LoginScreen = ({ navigation }) => {
  const { colors } = useTheme();
  useAppTheme();
  const { signIn, signInWithGoogle, signInWithApple, requestTrackingPermission, loading } = useAuthStore();

  const [formData, setFormData]             = useState({ email: "", password: "" });
  const [showPassword, setShowPassword]     = useState(false);
  const [rememberMe, setRememberMe]         = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [focusedField, setFocusedField]     = useState(null);

  const cardAnim  = useRef(new Animated.Value(60)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold });

  useEffect(() => {
    (async () => {
      setIsAppleAvailable(await AppleAuthentication.isAvailableAsync());
      try { await requestTrackingPermission(); } catch (_) {}
    })();

    Animated.parallel([
      Animated.spring(cardAnim, { toValue: 0, tension: 55, friction: 10, delay: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: 50,  useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!formData.email)    { Alert.alert("Error", "Please enter your email");    return; }
    if (!formData.password) { Alert.alert("Error", "Please enter your password"); return; }
    try {
      const { success, error } = await signIn(formData.email, formData.password);
      if (!success) Alert.alert("Login Failed", error || "Invalid email or password");
    } catch (e) {
      Alert.alert("Error", e.message || "An error occurred during login");
    }
  };

  const handleGoogleLogin = async () => {
    const { success } = await signInWithGoogle();
    if (!success) Alert.alert("Google Login Error", "Error while signing in with Google");
  };

  const handleAppleLogin = async () => {
    const { success, error } = await signInWithApple();
    if (!success) Alert.alert("Apple Login Error", error || "Error while signing in with Apple");
  };

  if (!fontsLoaded) return null;

  const inputBorder = (field) => ({
    borderColor: focusedField === field ? "#6366F1" : colors.border,
    borderWidth:  focusedField === field ? 2 : 1.5,
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Hero */}
      <LinearGradient
        colors={["#312E81", "#4338CA", "#6366F1"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.blob, styles.blobTL]} />
        <View style={[styles.blob, styles.blobBR]} />

        <SafeAreaView>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <View style={styles.backBtnCircle}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 28, paddingBottom: 36, paddingTop: 12 }}>
            {/* Indigo avatar ring */}
            <View style={styles.avatarRing}>
              <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.08)"]} style={styles.avatarGradient}>
                <Ionicons name="person" size={32} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.heroTitle}>Welcome Back 👋</Text>
            <Text style={styles.heroSubtitle}>Sign in to continue shopping</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Card */}
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ translateY: cardAnim }] }]}>
        <View style={styles.cardHandle} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* Email */}
            <View style={[styles.inputWrap, { backgroundColor: colors.background }, inputBorder("email")]}>
              <View style={[styles.inputIconBox, focusedField === "email" && styles.inputIconBoxActive]}>
                <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? "#6366F1" : "#9CA3AF"} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email Address"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(v) => setFormData(p => ({ ...p, email: v }))}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrap, { backgroundColor: colors.background }, inputBorder("password")]}>
              <View style={[styles.inputIconBox, focusedField === "password" && styles.inputIconBoxActive]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? "#6366F1" : "#9CA3AF"} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(v) => setFormData(p => ({ ...p, password: v }))}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9CA3AF" />
              </Pressable>
            </View>

            {/* Remember + Forgot */}
            <View style={styles.row}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.rememberText, { color: colors.text }]}>Remember Me</Text>
              </Pressable>
              <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.88} style={styles.signInShadow}>
              <LinearGradient
                colors={loading ? ["#C4B5FD", "#C4B5FD"] : ["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.signInBtn}
              >
                <Text style={styles.signInText}>{loading ? "Signing In..." : "Sign In"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: "#9CA3AF" }]}>Or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social */}
            <View style={styles.socialRow}>
              {isAppleAvailable && (
                <TouchableOpacity style={[styles.socialBtn, { backgroundColor: "#000", borderColor: "#000" }]} onPress={handleAppleLogin} disabled={loading}>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text style={[styles.socialLabel, { color: "#fff" }]}>Apple</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.background, borderColor: colors.border, flex: isAppleAvailable ? 1 : undefined }]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
                <Text style={[styles.socialLabel, { color: colors.text }]}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: "#9CA3AF" }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")} disabled={loading}>
                <Text style={styles.registerText}>Create Account</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#6366F1" },

  // Hero
  hero: { paddingBottom: 0 },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  blobTL: { width: 180, height: 180, top: -50, left: -50 },
  blobBR: { width: 220, height: 220, bottom: -30, right: -60 },

  backBtn: { paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 16 : 4, marginBottom: 8 },
  backBtnCircle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },

  avatarRing: {
    width: 72, height: 72, borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  avatarGradient: {
    flex: 1, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)",
  },
  heroTitle: { fontSize: 30, fontFamily: FONTS.bold, color: "#fff", marginBottom: 6 },
  heroSubtitle: { fontSize: 15, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.8)" },

  // Card
  card: {
    flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, marginTop: -24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 8 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  // Inputs
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, marginBottom: 14, paddingHorizontal: 14, height: 56,
    borderWidth: 1.5,
  },
  inputIconBox: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(99,102,241,0.08)",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  inputIconBoxActive: { backgroundColor: "rgba(99,102,241,0.14)" },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  eyeBtn: { padding: 4 },

  // Options row
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  rememberText: { fontSize: 13, fontFamily: FONTS.medium },
  forgotText: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#6366F1" },

  // Sign In
  signInShadow: {
    borderRadius: 14, marginBottom: 24,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  signInBtn: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  signInText: { color: "#fff", fontSize: 16, fontFamily: FONTS.semiBold, letterSpacing: 0.3 },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: FONTS.regular, marginHorizontal: 14 },

  // Social
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  socialBtn: {
    flex: 1, height: 52, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5,
  },
  socialLabel: { fontSize: 14, fontFamily: FONTS.semiBold },

  // Footer
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 14, fontFamily: FONTS.regular },
  registerText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#6366F1" },
});

export default LoginScreen;
