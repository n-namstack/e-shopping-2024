import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import useAuthStore from "../../store/authStore";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const PRIMARY = "#6366F1";

const SellerSettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { user, signOut } = useAuthStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pwModalVisible, setPwModalVisible]             = useState(false);
  const [newPassword, setNewPassword]                   = useState("");
  const [confirmPassword, setConfirmPassword]           = useState("");
  const [showNew, setShowNew]                           = useState(false);
  const [showConfirm, setShowConfirm]                   = useState(false);
  const [pwLoading, setPwLoading]                       = useState(false);

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const input   = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  const handleChangePassword = async () => {
    const pw = newPassword.trim();
    if (pw.length < 6) {
      Alert.alert("Too Short", "Password must be at least 6 characters.");
      return;
    }
    if (pw !== confirmPassword.trim()) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    try {
      setPwLoading(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      Alert.alert("Password Updated", "Your password has been changed successfully.");
      setPwModalVisible(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const Row = ({ icon, label, color = PRIMARY, onPress, right }) => (
    <TouchableOpacity
      style={[s.row, { borderBottomColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#F1F5F9" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.rowIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.rowLabel, { color: colors.text }]}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color={muted} />}
    </TouchableOpacity>
  );

  const Section = ({ title, children }) => (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: muted }]}>{title}</Text>
      <View style={[s.card, { backgroundColor: surface }]}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.heroText}>
          <Text style={s.heroTitle}>Settings</Text>
          <Text style={s.heroSub}>{user?.email}</Text>
        </View>
        <View style={s.heroAvatar}>
          <Text style={s.heroAvatarTxt}>
            {(user?.email?.[0] ?? "S").toUpperCase()}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={s.flex} showsVerticalScrollIndicator={false}>
        <View style={s.body}>

          {/* ── Account ─────────────────────────────────────────────────── */}
          <Section title="ACCOUNT">
            <Row
              icon="person-outline"
              label="Edit Profile"
              onPress={() => navigation.navigate("EditProfile")}
            />
            <Row
              icon="lock-closed-outline"
              label="Change Password"
              onPress={() => setPwModalVisible(true)}
            />
          </Section>

          {/* ── Preferences ─────────────────────────────────────────────── */}
          <Section title="PREFERENCES">
            <Row
              icon="moon-outline"
              label="Dark Mode"
              color="#8B5CF6"
              right={
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#D1D5DB", true: `${PRIMARY}60` }}
                  thumbColor={isDarkMode ? PRIMARY : "#F3F4F6"}
                  ios_backgroundColor="#D1D5DB"
                />
              }
            />
            <Row
              icon="notifications-outline"
              label="Push Notifications"
              color="#F59E0B"
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: "#D1D5DB", true: "#F59E0B60" }}
                  thumbColor={notificationsEnabled ? "#F59E0B" : "#F3F4F6"}
                  ios_backgroundColor="#D1D5DB"
                />
              }
            />
          </Section>

          {/* ── Business ────────────────────────────────────────────────── */}
          <Section title="BUSINESS">
            <Row
              icon="card-outline"
              label="Bank Details"
              color="#14B8A6"
              onPress={() => navigation.navigate("ProfileTab", { screen: "BankDetails" })}
            />
            <Row
              icon="cash-outline"
              label="Payouts"
              color="#22C55E"
              onPress={() => navigation.navigate("ProfileTab", { screen: "SellerPayouts" })}
            />
            <Row
              icon="shield-checkmark-outline"
              label="Seller Verification"
              color="#6366F1"
              onPress={() => navigation.navigate("ShopsTab", { screen: "Verification" })}
            />
          </Section>

          {/* ── Support ─────────────────────────────────────────────────── */}
          <Section title="SUPPORT">
            <Row
              icon="help-circle-outline"
              label="Help Center"
              color="#0EA5E9"
              onPress={() => navigation.navigate("ProfileTab", { screen: "HelpCenter" })}
            />
            <Row
              icon="document-text-outline"
              label="Terms & Privacy Policy"
              color="#6366F1"
              onPress={() => navigation.navigate("ProfileTab", { screen: "TermsPrivacy" })}
            />
          </Section>

          {/* ── Danger zone ─────────────────────────────────────────────── */}
          <Section title="DANGER ZONE">
            <Row
              icon="trash-outline"
              label="Delete Account"
              color="#EF4444"
              onPress={() => navigation.navigate("ProfileTab", { screen: "AccountDeletion" })}
            />
          </Section>

          {/* ── Sign out ────────────────────────────────────────────────── */}
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[s.version, { color: muted }]}>ShopIt v1.0.0</Text>
        </View>
      </ScrollView>

      {/* ── Change password modal ────────────────────────────────────────── */}
      <Modal
        visible={pwModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPwModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <View style={[s.modalSheet, { backgroundColor: surface }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.text }]}>Change Password</Text>
            <Text style={[s.modalSub, { color: muted }]}>Enter your new password below</Text>

            {/* New password */}
            <View style={[s.inputWrap, { backgroundColor: input }]}>
              <Ionicons name="lock-closed-outline" size={18} color={muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="New password"
                placeholderTextColor={muted}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color={muted} />
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <View style={[s.inputWrap, { backgroundColor: input }]}>
              <Ionicons name="lock-closed-outline" size={18} color={muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Confirm new password"
                placeholderTextColor={muted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.modalSave, pwLoading && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={pwLoading}
              activeOpacity={0.85}
            >
              {pwLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.modalSaveTxt}>Update Password</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modalCancel, { borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "#E5E7EB" }]}
              onPress={() => { setPwModalVisible(false); setNewPassword(""); setConfirmPassword(""); }}
            >
              <Text style={[s.modalCancelTxt, { color: muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 22, fontFamily: FONTS.bold, color: "#fff" },
  heroSub:   { fontSize: 12, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  heroAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroAvatarTxt: { fontSize: 18, fontFamily: FONTS.bold, color: "#fff" },

  body: { padding: 16, paddingBottom: 32, gap: 8 },

  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 11, fontFamily: FONTS.bold,
    letterSpacing: 0.8, marginBottom: 6, marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: FONTS.medium },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutTxt: { fontSize: 16, fontFamily: FONTS.bold, color: "#fff" },

  version: { textAlign: "center", fontSize: 12, fontFamily: FONTS.regular, marginTop: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontFamily: FONTS.bold },
  modalSub:   { fontSize: 13, fontFamily: FONTS.regular },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 8,
  },
  inputIcon: { marginRight: 2 },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  modalSave: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalSaveTxt: { color: "#fff", fontSize: 15, fontFamily: FONTS.bold },
  modalCancel: {
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelTxt: { fontSize: 15, fontFamily: FONTS.medium },
});

export default SellerSettingsScreen;
