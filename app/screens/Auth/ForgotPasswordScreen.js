import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [focused, setFocused]     = useState(false);

  const cardAnim    = useRef(new Animated.Value(60)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardAnim, { toValue: 0, tension: 55, friction: 10, delay: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: 50,  useNativeDriver: true }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    if (!email.trim()) { Alert.alert("Error", "Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alert.alert("Error", "Please enter a valid email address"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "com.namstack.eshoppit://reset-password",
      });
      if (error) throw error;
      setResetSent(true);
      Animated.spring(successAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

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

          <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 28, paddingBottom: 36, paddingTop: 8 }}>
            {/* Lock icon */}
            <View style={styles.heroIconWrap}>
              <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.08)"]} style={styles.heroIcon}>
                <Ionicons name={resetSent ? "checkmark" : "lock-open-outline"} size={30} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>{resetSent ? "Email Sent! 📬" : "Forgot Password? 🔑"}</Text>
            <Text style={styles.heroSubtitle}>
              {resetSent
                ? "Check your inbox for the reset link"
                : "Enter your email and we'll send you a reset link"}
            </Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Card */}
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ translateY: cardAnim }] }]}>
        <View style={styles.cardHandle} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.cardInner}>

          {resetSent ? (
            /* ── Success state ── */
            <Animated.View style={[styles.successBox, {
              opacity: successAnim,
              transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }]}>
              <View style={styles.successIconBox}>
                <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.successIconGrad}>
                  <Ionicons name="checkmark" size={38} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>All Done!</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to{"\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
                {"\n\n"}Follow the link in your inbox to set a new password.
              </Text>

              <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.88} style={styles.backBtnShadow}>
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradBtn}>
                  <Text style={styles.gradBtnText}>Back to Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

          ) : (
            /* ── Form state ── */
            <View style={styles.formBox}>
              {/* Email input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: focused ? "#6366F1" : colors.border, borderWidth: focused ? 2 : 1.5 }]}>
                <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                  <Ionicons name="mail-outline" size={18} color={focused ? "#6366F1" : "#9CA3AF"} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Info note */}
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={16} color="#6366F1" />
                <Text style={styles.infoText}>
                  The link expires in 24 hours. Check your spam folder if you don't see it.
                </Text>
              </View>

              {/* Reset button */}
              <TouchableOpacity onPress={handleResetPassword} disabled={loading} activeOpacity={0.88} style={styles.resetBtnShadow}>
                <LinearGradient
                  colors={loading ? ["#C4B5FD", "#C4B5FD"] : ["#6366F1", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.gradBtn}
                >
                  {loading
                    ? <><Ionicons name="sync-outline" size={18} color="#fff" /><Text style={styles.gradBtnText}>  Sending...</Text></>
                    : <Text style={styles.gradBtnText}>Send Reset Link</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer */}
              <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.footer}>
                <Ionicons name="arrow-back" size={15} color="#6366F1" />
                <Text style={styles.footerText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

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

  heroIconWrap: { marginBottom: 18 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
  },
  heroTitle:    { fontSize: 28, fontFamily: FONTS.bold,    color: "#fff", marginBottom: 6 },
  heroSubtitle: { fontSize: 15, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.8)", lineHeight: 22 },

  // Card
  card: {
    flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, marginTop: -24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  cardHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 8 },
  cardInner:  { flex: 1, paddingHorizontal: 24, paddingTop: 16 },

  // Form
  formBox: { flex: 1 },
  inputLabel: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 10 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, height: 54, paddingHorizontal: 12, marginBottom: 14,
  },
  iconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.08)",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  iconBoxActive: { backgroundColor: "rgba(99,102,241,0.15)" },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  infoNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(99,102,241,0.08)", borderRadius: 12,
    padding: 12, marginBottom: 28,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: "#6366F1", lineHeight: 19 },

  // Button
  resetBtnShadow: {
    borderRadius: 14,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    marginBottom: 24,
  },
  gradBtn: { height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center", flexDirection: "row" },
  gradBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.semiBold, letterSpacing: 0.3 },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  footerText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#6366F1" },

  // Success
  successBox: { flex: 1, alignItems: "center", paddingTop: 24 },
  successIconBox: { marginBottom: 24 },
  successIconGrad: {
    width: 90, height: 90, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#22C55E", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  successTitle: { fontSize: 24, fontFamily: FONTS.bold, marginBottom: 14 },
  successText: {
    fontSize: 15, fontFamily: FONTS.regular, color: "#6B7280",
    textAlign: "center", lineHeight: 24, marginBottom: 36,
  },
  emailHighlight: { fontFamily: FONTS.semiBold, color: "#6366F1" },
  backBtnShadow: {
    width: "100%", borderRadius: 14,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
});

export default ForgotPasswordScreen;
