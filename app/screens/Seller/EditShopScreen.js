import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";
import { compressImage } from "../../utils/imageHelpers";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const EditShopScreen = ({ navigation, route }) => {
  const { shopId }     = route.params;
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";
  const inputBg = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [location,     setLocation]     = useState("");
  const [phoneNumber,  setPhoneNumber]  = useState("");
  const [email,        setEmail]        = useState("");
  const [logo,         setLogo]         = useState(null);
  const [banner,       setBanner]       = useState(null);
  const [existingLogo,   setExistingLogo]   = useState(null);
  const [existingBanner, setExistingBanner] = useState(null);

  useEffect(() => { fetchShop(); }, []);

  const fetchShop = async () => {
    try {
      const { data, error } = await supabase.from("shops").select("*").eq("id", shopId).single();
      if (error) throw error;
      if (!data) { Alert.alert("Error", "Shop not found"); navigation.goBack(); return; }
      setName(data.name || "");
      setDescription(data.description || "");
      setLocation(data.location || "");
      setPhoneNumber(data.phone_number || "");
      setEmail(data.email || "");
      setExistingLogo(data.logo_url || null);
      setExistingBanner(data.banner_url || null);
    } catch (error) {
      console.error("Error fetching shop:", error);
      Alert.alert("Error", "Failed to load shop details");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload images.");
      return false;
    }
    return true;
  };

  const selectImage = async (type) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: type === "logo" ? [1, 1] : [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        if (type === "logo") setLogo(result.assets[0]);
        else setBanner(result.assets[0]);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadImage = async (uri, path) => {
    const compressedUri = await compressImage(uri);
    const response = await fetch(compressedUri);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error("Invalid image data");
    const { error } = await supabase.storage.from("shop-images").upload(path, arrayBuffer, {
      contentType: "image/jpeg", cacheControl: "3600", upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("shop-images").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Failed to get image URL");
    return data.publicUrl;
  };

  const validateForm = () => {
    if (!name.trim())        { Alert.alert("Validation Error", "Shop name is required");            return false; }
    if (!description.trim()) { Alert.alert("Validation Error", "Shop description is required");     return false; }
    if (!location.trim())    { Alert.alert("Validation Error", "Shop location is required");        return false; }
    if (!phoneNumber.trim()) { Alert.alert("Validation Error", "Phone number is required");         return false; }
    if (!email.trim())       { Alert.alert("Validation Error", "Email is required");                return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Validation Error", "Please enter a valid email address"); return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setIsSaving(true);

      let logoUrl   = existingLogo;
      let bannerUrl = existingBanner;

      if (logo) {
        try {
          const ext = logo.uri.split(".").pop();
          logoUrl = await uploadImage(logo.uri, `shops/${shopId}_logo_${Date.now()}.${ext}`);
        } catch (err) { Alert.alert("Error", `Failed to upload logo: ${err.message}`); return; }
      }

      if (banner) {
        try {
          const ext = banner.uri.split(".").pop();
          bannerUrl = await uploadImage(banner.uri, `shops/${shopId}_banner_${Date.now()}.${ext}`);
        } catch (err) { Alert.alert("Error", `Failed to upload banner: ${err.message}`); return; }
      }

      const { error } = await supabase.from("shops").update({
        name:         name.trim(),
        description:  description.trim(),
        location:     location.trim(),
        phone_number: phoneNumber.trim(),
        email:        email.trim(),
        logo_url:     logoUrl,
        banner_url:   bannerUrl,
        updated_at:   new Date().toISOString(),
      }).eq("id", shopId);

      if (error) throw error;

      Alert.alert("Success", "Shop updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error updating shop:", error);
      Alert.alert("Error", error.message || "Failed to update shop. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[{ flex: 1, justifyContent: "center", alignItems: "center" }, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={INDIGO} />
      </SafeAreaView>
    );
  }

  const logoSource  = logo ? { uri: logo.uri } : existingLogo ? { uri: existingLogo } : null;
  const bannerSource = banner ? { uri: banner.uri } : existingBanner ? { uri: existingBanner } : null;

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
                <Ionicons name="create-outline" size={22} color="#fff" />
              </LinearGradient>
              <Text style={s.heroTitle}>Edit Shop</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

          {/* ── Shop Branding ─────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="images-outline" size={18} color={INDIGO} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Shop Branding</Text>
            </View>
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            {/* Banner */}
            <Text style={[s.fieldLabel, { color: muted }]}>Banner Image</Text>
            <TouchableOpacity
              style={[s.bannerPicker, { borderColor: bannerSource ? INDIGO : border, backgroundColor: isDarkMode ? "#1A1A2E" : "#F8F9FF" }]}
              onPress={() => selectImage("banner")}
              activeOpacity={0.8}
            >
              {bannerSource ? (
                <>
                  <Image source={bannerSource} style={s.bannerImage} />
                  <View style={s.bannerOverlay}>
                    <View style={s.bannerEditBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                      <Text style={s.bannerEditText}>Change</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={s.bannerEmpty}>
                  <View style={[s.bannerEmptyIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                    <Ionicons name="image-outline" size={28} color={INDIGO} />
                  </View>
                  <Text style={[s.bannerEmptyText, { color: muted }]}>Tap to add a banner image</Text>
                  <Text style={[s.bannerEmptyHint, { color: isDarkMode ? "#4B5563" : "#C4C9F0" }]}>Recommended: 16:9 ratio</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Logo */}
            <Text style={[s.fieldLabel, { color: muted, marginTop: 16 }]}>Shop Logo</Text>
            <View style={s.logoRow}>
              <TouchableOpacity
                style={[s.logoPicker, { borderColor: logoSource ? INDIGO : border, backgroundColor: isDarkMode ? "#1A1A2E" : "#F8F9FF" }]}
                onPress={() => selectImage("logo")}
                activeOpacity={0.8}
              >
                {logoSource ? (
                  <>
                    <Image source={logoSource} style={s.logoImage} />
                    <View style={s.logoEditBadge}>
                      <Ionicons name="camera" size={12} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={s.logoEmpty}>
                    <Ionicons name="camera-outline" size={24} color={INDIGO} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[s.logoHint, { color: colors.text, fontFamily: FONTS.medium }]}>Shop Logo</Text>
                <Text style={[s.logoHintSub, { color: muted }]}>Square image, shown on your shop profile</Text>
              </View>
            </View>
          </View>

          {/* ── Shop Information ──────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="information-circle-outline" size={18} color={INDIGO} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Shop Information</Text>
            </View>
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            <View style={s.inputWrap}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Shop Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your shop name"
                placeholderTextColor={muted}
                maxLength={50}
              />
            </View>

            <View style={s.inputWrap}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your shop and what you sell"
                placeholderTextColor={muted}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            <View style={[s.inputWrap, { marginBottom: 0 }]}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Location *</Text>
              <View style={[s.inputWithIcon, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="location-outline" size={18} color={muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.inputInner, { color: colors.text }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City, Country"
                  placeholderTextColor={muted}
                  maxLength={100}
                />
              </View>
            </View>
          </View>

          {/* ── Contact Information ───────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="call-outline" size={18} color={INDIGO} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Contact Information</Text>
            </View>
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            <View style={s.inputWrap}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Phone Number *</Text>
              <View style={[s.inputWithIcon, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="call-outline" size={18} color={muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.inputInner, { color: colors.text }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+264 81 000 0000"
                  placeholderTextColor={muted}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </View>

            <View style={[s.inputWrap, { marginBottom: 0 }]}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Email *</Text>
              <View style={[s.inputWithIcon, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="mail-outline" size={18} color={muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.inputInner, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="shop@example.com"
                  placeholderTextColor={muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={[s.footer, { backgroundColor: surface, borderTopColor: border }]}>
          <TouchableOpacity
            style={s.submitTouch}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isSaving ? ["#9CA3AF", "#9CA3AF"] : [INDIGO, VIOLET]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.submitBtn}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.submitBtnText}>Save Changes</Text>
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

  hero: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },

  scrollContent: { padding: 16, paddingBottom: 32 },

  card: {
    borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle:   { fontSize: 15, fontFamily: FONTS.bold },
  cardDivider: { height: 1, marginBottom: 14 },

  bannerPicker: {
    width: "100%", height: 140, borderRadius: 14, borderWidth: 1.5,
    borderStyle: "dashed", overflow: "hidden",
  },
  bannerImage:      { width: "100%", height: "100%", resizeMode: "cover" },
  bannerOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "flex-end", justifyContent: "flex-end", padding: 10 },
  bannerEditBadge:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  bannerEditText:   { color: "#fff", fontSize: 12, fontFamily: FONTS.medium },
  bannerEmpty:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  bannerEmptyIcon:  { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerEmptyText:  { fontSize: 14, fontFamily: FONTS.medium },
  bannerEmptyHint:  { fontSize: 12, fontFamily: FONTS.regular },

  logoRow:      { flexDirection: "row", alignItems: "center", gap: 14 },
  logoPicker:   { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderStyle: "dashed", overflow: "hidden", position: "relative" },
  logoImage:    { width: "100%", height: "100%", resizeMode: "cover" },
  logoEditBadge:{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: INDIGO, alignItems: "center", justifyContent: "center" },
  logoEmpty:    { flex: 1, alignItems: "center", justifyContent: "center" },
  logoHint:     { fontSize: 14, marginBottom: 4 },
  logoHintSub:  { fontSize: 12, fontFamily: FONTS.regular, lineHeight: 18 },

  inputWrap:     { marginBottom: 14 },
  fieldLabel:    { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 8 },
  input:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: FONTS.regular },
  textArea:      { minHeight: 100, textAlignVertical: "top", paddingTop: 12 },
  inputWithIcon: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  inputInner:    { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  footer:        { padding: 16, borderTopWidth: 1 },
  submitTouch:   { borderRadius: 14, overflow: "hidden" },
  submitBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default EditShopScreen;
