import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const EditProfileScreen = () => {
  const navigation     = useNavigation();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();
  const { user }       = useAuthStore();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";
  const inputBg = isDarkMode ? "#2C2C3E" : "#F3F4F6";
  const lockedBg = isDarkMode ? "#1A1A2E" : "#F1F3FF";

  const [loading,      setLoading]      = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [formData,     setFormData]     = useState({
    firstname:    "",
    lastname:     "",
    email:        "",
    cellphone_no: "",
  });

  useEffect(() => { fetchUserProfile(); }, []);

  const fetchUserProfile = async () => {
    try {
      setFetchingData(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setFetchingData(false); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setFormData({
        firstname:    data?.firstname    || "",
        lastname:     data?.lastname     || "",
        email:        session.user.email || "",
        cellphone_no: data?.cellphone_no || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setFetchingData(false);
    }
  };

  const validateForm = () => {
    if (!formData.firstname.trim()) { Alert.alert("Error", "First name is required"); return false; }
    if (!formData.lastname.trim())  { Alert.alert("Error", "Last name is required");  return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("You must be logged in to update your profile");

      const { error } = await supabase
        .from("profiles")
        .update({
          firstname:    formData.firstname.trim(),
          lastname:     formData.lastname.trim(),
          cellphone_no: formData.cellphone_no.trim(),
        })
        .eq("id", session.user.id);

      if (error) throw error;
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const initials = [
    formData.firstname.charAt(0),
    formData.lastname.charAt(0),
  ].filter(Boolean).join("").toUpperCase() || "U";

  if (fetchingData) {
    return (
      <SafeAreaView style={[{ flex: 1, justifyContent: "center", alignItems: "center" }, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={INDIGO} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        {/* ── Gradient Hero ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#312E81", "#4F46E5", "#7C3AED"]}
          style={s.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[s.heroBubble, { width: 180, height: 180, top: -60, right: -40 }]} />
          <View style={[s.heroBubble, { width: 80, height: 80, bottom: -20, left: 20 }]} />

          <View style={s.heroTopRow}>
            <TouchableOpacity style={s.heroBackBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.heroTitleWrap}>
              <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={s.heroIconBadge}>
                <Ionicons name="person-outline" size={22} color="#fff" />
              </LinearGradient>
              <Text style={s.heroTitle}>Edit Profile</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <LinearGradient
              colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
              style={s.avatarRing}
            >
              <LinearGradient colors={[INDIGO, VIOLET]} style={s.avatar}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </LinearGradient>
            </LinearGradient>
            <Text style={s.avatarName}>
              {[formData.firstname, formData.lastname].filter(Boolean).join(" ") || "Your Name"}
            </Text>
            <Text style={s.avatarEmail}>{formData.email}</Text>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Personal Info ─────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="person-outline" size={18} color={INDIGO} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Personal Information</Text>
            </View>
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            <View style={s.inputWrap}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>First Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
                value={formData.firstname}
                onChangeText={(t) => setFormData((f) => ({ ...f, firstname: t }))}
                placeholder="Enter your first name"
                placeholderTextColor={muted}
                autoCapitalize="words"
              />
            </View>

            <View style={[s.inputWrap, { marginBottom: 0 }]}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Last Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
                value={formData.lastname}
                onChangeText={(t) => setFormData((f) => ({ ...f, lastname: t }))}
                placeholder="Enter your last name"
                placeholderTextColor={muted}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* ── Contact Info ──────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="call-outline" size={18} color={INDIGO} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Contact Information</Text>
            </View>
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            {/* Email — locked */}
            <View style={s.inputWrap}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Email</Text>
              <View style={[s.lockedRow, { backgroundColor: lockedBg, borderColor: isDarkMode ? "#2C2C3E" : `${INDIGO}30` }]}>
                <Ionicons name="mail-outline" size={16} color={muted} style={{ marginRight: 10 }} />
                <Text style={[s.lockedText, { color: muted }]} numberOfLines={1}>{formData.email}</Text>
                <View style={[s.lockBadge, { backgroundColor: isDarkMode ? "#2C2C3E" : "#E0E7FF" }]}>
                  <Ionicons name="lock-closed" size={11} color={INDIGO} />
                  <Text style={[s.lockText, { color: INDIGO }]}>Fixed</Text>
                </View>
              </View>
              <Text style={[s.hint, { color: muted }]}>Email cannot be changed</Text>
            </View>

            <View style={[s.inputWrap, { marginBottom: 0 }]}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Phone Number</Text>
              <View style={[s.inputWithIcon, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="call-outline" size={18} color={muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.inputInner, { color: colors.text }]}
                  value={formData.cellphone_no}
                  onChangeText={(t) => setFormData((f) => ({ ...f, cellphone_no: t }))}
                  placeholder="+264 81 000 0000"
                  placeholderTextColor={muted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={[s.footer, { backgroundColor: surface, borderTopColor: border }]}>
          <TouchableOpacity
            style={s.submitTouch}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={loading ? ["#9CA3AF", "#9CA3AF"] : [INDIGO, VIOLET]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.submitBtnText}>Update Profile</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero: { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },

  avatarWrap:     { alignItems: "center", marginTop: 20 },
  avatarRing:     { width: 96, height: 96, borderRadius: 48, padding: 3, marginBottom: 12 },
  avatar:         { flex: 1, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 36, fontFamily: FONTS.bold, color: "#fff" },
  avatarName:     { fontSize: 18, fontFamily: FONTS.bold, color: "#fff", marginBottom: 4 },
  avatarEmail:    { fontSize: 13, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)" },

  scrollContent: { padding: 16, paddingBottom: 32 },

  card: {
    borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle:   { fontSize: 15, fontFamily: FONTS.bold },
  cardDivider: { height: 1, marginBottom: 14 },

  inputWrap:     { marginBottom: 14 },
  fieldLabel:    { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 8 },
  input:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: FONTS.regular },
  inputWithIcon: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  inputInner:    { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  lockedRow:   { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  lockedText:  { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  lockBadge:   { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  lockText:    { fontSize: 11, fontFamily: FONTS.semiBold },
  hint:        { fontSize: 12, fontFamily: FONTS.regular, marginTop: 6 },

  footer:      { padding: 16, borderTopWidth: 1 },
  submitTouch: { borderRadius: 14, overflow: "hidden" },
  submitBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default EditProfileScreen;
