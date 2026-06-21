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
  ScrollView,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { FONTS } from "../../constants/theme";
import useAuthStore from "../../store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";

const RegisterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { signUp, signInWithGoogle, signInWithApple, requestTrackingPermission, loading } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", username: "",
    email: "", phoneNumber: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms]           = useState(false);
  const [role, setRole]                           = useState("buyer");
  const [isAppleAvailable, setIsAppleAvailable]   = useState(false);
  const [focusedField, setFocusedField]           = useState(null);

  const cardAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const validateForm = () => {
    if (!formData.firstName.trim())  { Alert.alert("Error", "Please enter your first name"); return false; }
    if (!formData.lastName.trim())   { Alert.alert("Error", "Please enter your last name");  return false; }
    if (!formData.username.trim())   { Alert.alert("Error", "Please enter a username");       return false; }
    if (!formData.email.trim())      { Alert.alert("Error", "Please enter your email");       return false; }
    if (!/\S+@\S+\.\S+/.test(formData.email)) { Alert.alert("Error", "Please enter a valid email address"); return false; }
    if (!formData.phoneNumber.trim()){ Alert.alert("Error", "Please enter your phone number"); return false; }
    if (!formData.password)          { Alert.alert("Error", "Please enter a password");       return false; }
    if (formData.password.length < 6){ Alert.alert("Error", "Password must be at least 6 characters"); return false; }
    if (formData.password !== formData.confirmPassword) { Alert.alert("Error", "Passwords do not match"); return false; }
    if (!agreeToTerms)               { Alert.alert("Error", "Please agree to the Terms & Conditions"); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    try {
      const { success, error } = await signUp(formData.email, formData.password, {
        firstname: formData.firstName, lastname: formData.lastName,
        username: formData.username, email: formData.email,
        cellphone_no: formData.phoneNumber, role,
      });
      if (!success) { Alert.alert("Registration Failed", error || "Failed to create account"); return; }
      if (role === "seller") navigation.navigate("VerificationPending");
    } catch (e) { Alert.alert("Error", e.message || "An error occurred during registration"); }
  };

  const handleGoogleRegister = async () => {
    const { success, error } = await signInWithGoogle();
    if (!success) Alert.alert("Google Error", error || "Error while signing up with Google");
  };

  const handleAppleRegister = async () => {
    const { success, error } = await signInWithApple();
    if (!success) Alert.alert("Apple Error", error || "Error while signing up with Apple");
  };

  if (!fontsLoaded) return null;

  const inputBorder = (field) => ({
    borderColor: focusedField === field ? "#6366F1" : colors.border,
    borderWidth: focusedField === field ? 2 : 1.5,
  });

  const InputField = ({ field, placeholder, icon, keyboard, secure, showToggle, showState, onToggle, autoCapitalize }) => (
    <View style={[styles.inputWrap, { backgroundColor: colors.background }, inputBorder(field)]}>
      <View style={[styles.iconBox, focusedField === field && styles.iconBoxActive]}>
        <Ionicons name={icon} size={18} color={focusedField === field ? "#6366F1" : "#9CA3AF"} />
      </View>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={formData[field]}
        onChangeText={(v) => set(field, v)}
        onFocus={() => setFocusedField(field)}
        onBlur={() => setFocusedField(null)}
        keyboardType={keyboard || "default"}
        autoCapitalize={autoCapitalize || "words"}
        secureTextEntry={secure && !showState}
        editable={!loading}
      />
      {showToggle && (
        <Pressable onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={showState ? "eye-outline" : "eye-off-outline"} size={20} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Hero */}
      <LinearGradient
        colors={["#312E81", "#4338CA", "#6366F1"]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
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

          <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 28, paddingBottom: 32, paddingTop: 8 }}>
            <Text style={styles.heroTitle}>Create Account ✨</Text>
            <Text style={styles.heroSubtitle}>Join our community and start shopping</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Card */}
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ translateY: cardAnim }] }]}>
        <View style={styles.cardHandle} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* Role selector */}
            <Text style={[styles.roleLabel, { color: colors.text }]}>I want to:</Text>
            <View style={styles.roleRow}>
              {[
                { key: "buyer",  label: "Shop",    icon: "cart-outline" },
                { key: "seller", label: "Sell",    icon: "storefront-outline" },
              ].map(({ key, label, icon }) => {
                const active = role === key;
                return (
                  <Pressable key={key} onPress={() => setRole(key)} disabled={loading} style={styles.roleBtn}>
                    {active ? (
                      <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.roleBtnInner}>
                        <Ionicons name={icon} size={20} color="#fff" />
                        <Text style={[styles.roleBtnText, { color: "#fff" }]}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.roleBtnInner, { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border }]}>
                        <Ionicons name={icon} size={20} color="#6366F1" />
                        <Text style={[styles.roleBtnText, { color: "#6366F1" }]}>{label}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={[styles.inputWrap, styles.halfInput, { backgroundColor: colors.background }, inputBorder("firstName")]}>
                <View style={[styles.iconBox, focusedField === "firstName" && styles.iconBoxActive]}>
                  <Ionicons name="person-outline" size={16} color={focusedField === "firstName" ? "#6366F1" : "#9CA3AF"} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="First Name"
                  placeholderTextColor="#9CA3AF"
                  value={formData.firstName}
                  onChangeText={(v) => set("firstName", v)}
                  onFocus={() => setFocusedField("firstName")}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>
              <View style={[styles.inputWrap, styles.halfInput, { backgroundColor: colors.background }, inputBorder("lastName")]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Last Name"
                  placeholderTextColor="#9CA3AF"
                  value={formData.lastName}
                  onChangeText={(v) => set("lastName", v)}
                  onFocus={() => setFocusedField("lastName")}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>
            </View>

            <InputField field="username"    placeholder="Username"      icon="at-outline"           autoCapitalize="none" />
            <InputField field="email"       placeholder="Email Address" icon="mail-outline"          keyboard="email-address" autoCapitalize="none" />
            <InputField field="phoneNumber" placeholder="Phone Number"  icon="call-outline"          keyboard="phone-pad" autoCapitalize="none" />
            <InputField field="password"    placeholder="Password"      icon="lock-closed-outline"   autoCapitalize="none"
              secure showToggle showState={showPassword}        onToggle={() => setShowPassword(!showPassword)} />
            <InputField field="confirmPassword" placeholder="Confirm Password" icon="lock-closed-outline" autoCapitalize="none"
              secure showToggle showState={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />

            {/* Seller note */}
            {role === "seller" && (
              <View style={styles.sellerNote}>
                <Ionicons name="information-circle-outline" size={22} color="#6366F1" />
                <Text style={[styles.sellerNoteText, { color: colors.text }]}>
                  As a seller, you'll need to verify your account and create a shop profile before you can start selling.
                </Text>
              </View>
            )}

            {/* Terms */}
            <Pressable style={styles.termsRow} onPress={() => setAgreeToTerms(!agreeToTerms)} disabled={loading}>
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxActive]}>
                {agreeToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[styles.termsText, { color: colors.text }]}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms & Conditions</Text>
                {" "}and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* Create Account button */}
            <TouchableOpacity onPress={handleRegister} disabled={!agreeToTerms || loading} activeOpacity={0.88} style={styles.createBtnShadow}>
              <LinearGradient
                colors={!agreeToTerms || loading ? ["#C4B5FD", "#C4B5FD"] : ["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>{loading ? "Creating Account..." : "Create Account"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: "#9CA3AF" }]}>Or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social */}
            <View style={[styles.socialRow, !isAppleAvailable && { paddingHorizontal: 32 }]}>
              {isAppleAvailable && (
                <TouchableOpacity style={[styles.socialBtn, { backgroundColor: "#000", borderColor: "#000" }]} onPress={handleAppleRegister} disabled={loading}>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text style={[styles.socialLabel, { color: "#fff" }]}>Apple</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleGoogleRegister} disabled={loading}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
                <Text style={[styles.socialLabel, { color: colors.text }]}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: "#9CA3AF" }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")} disabled={loading}>
                <Text style={styles.loginLink}>Sign In</Text>
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
  hero: {},
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  blobTL: { width: 180, height: 180, top: -50, left: -50 },
  blobBR: { width: 200, height: 200, bottom: -30, right: -50 },

  backBtn: { paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 16 : 4, marginBottom: 8 },
  backBtnCircle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  heroTitle:    { fontSize: 30, fontFamily: FONTS.bold,    color: "#fff", marginBottom: 6 },
  heroSubtitle: { fontSize: 15, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.8)" },

  // Card
  card: {
    flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, marginTop: -24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 8 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 },

  // Role
  roleLabel: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 10 },
  roleRow:   { flexDirection: "row", gap: 12, marginBottom: 20 },
  roleBtn:   { flex: 1 },
  roleBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 48, borderRadius: 14,
  },
  roleBtnText: { fontSize: 15, fontFamily: FONTS.semiBold },

  // Inputs
  nameRow: { flexDirection: "row", gap: 10, marginBottom: 0 },
  halfInput: { flex: 1 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, marginBottom: 12, paddingHorizontal: 12, height: 54,
  },
  iconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.08)",
    justifyContent: "center", alignItems: "center", marginRight: 9,
  },
  iconBoxActive: { backgroundColor: "rgba(99,102,241,0.14)" },
  input: { flex: 1, fontSize: 14, fontFamily: FONTS.regular },
  eyeBtn: { padding: 4 },

  // Seller note
  sellerNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "rgba(99,102,241,0.08)", borderRadius: 14,
    padding: 14, marginBottom: 14,
  },
  sellerNoteText: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, lineHeight: 19, opacity: 0.85 },

  // Terms
  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  checkboxActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  termsText: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, lineHeight: 19 },
  termsLink: { color: "#6366F1", fontFamily: FONTS.semiBold },

  // Create Account button
  createBtnShadow: {
    borderRadius: 14, marginBottom: 24,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  createBtn: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  createBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.semiBold, letterSpacing: 0.3 },

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
  loginLink:  { fontSize: 14, fontFamily: FONTS.semiBold, color: "#6366F1" },
});

export default RegisterScreen;
