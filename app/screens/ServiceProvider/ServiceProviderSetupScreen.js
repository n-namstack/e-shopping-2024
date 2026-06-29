import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import useBookingStore from "../../store/bookingStore";
import useAuthStore from "../../store/authStore";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const CATEGORIES = [
  "Beauty & Wellness",
  "Health",
  "Tech Repair",
  "Automotive",
  "Home Services",
  "Education",
  "Other",
];

async function uploadImage(uri, bucket, path) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${path}.${ext}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, { upsert: true, contentType: `image/${ext}` });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return urlData.publicUrl;
}

export default function ServiceProviderSetupScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { createProvider } = useBookingStore();

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [logoUri, setLogoUri] = useState(null);
  const [bannerUri, setBannerUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!businessName.trim()) {
      Alert.alert("Required", "Please enter your business name.");
      return;
    }
    if (!category) {
      Alert.alert("Required", "Please select a category.");
      return;
    }

    setLoading(true);
    try {
      let logo_url = null;
      let banner_url = null;

      if (logoUri) {
        logo_url = await uploadImage(logoUri, "provider_logos", `${user.id}/logo_${Date.now()}`);
      }
      if (bannerUri) {
        banner_url = await uploadImage(bannerUri, "provider_logos", `${user.id}/banner_${Date.now()}`);
      }

      await createProvider({
        user_id: user.id,
        business_name: businessName.trim(),
        description: description.trim() || null,
        category,
        location: location.trim() || null,
        logo_url,
        banner_url,
      });

      // Update profile role to service_provider
      await supabase
        .from("profiles")
        .update({ role: "service_provider" })
        .eq("id", user.id);

      Alert.alert(
        "Profile Created! 🎉",
        "Your service provider profile is ready. Now add your services and set your availability.",
        [{ text: "Get Started", onPress: () => navigation.replace("SPDashboard") }]
      );
    } catch (e) {
      Alert.alert("Error", e.message || "Could not create your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={styles.heroGradient}
      >
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Become a Service Provider</Text>
          <Text style={styles.heroSub}>
            Create your profile to start accepting bookings
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Banner picker */}
          <TouchableOpacity
            onPress={() => pickImage(setBannerUri)}
            style={styles.bannerPicker}
          >
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerPreview} resizeMode="cover" />
            ) : (
              <View style={[styles.bannerPreview, styles.bannerPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="image-outline" size={32} color={colors.text + "40"} />
                <Text style={[styles.pickerHint, { color: colors.text + "60" }]}>
                  Tap to add a banner image
                </Text>
              </View>
            )}
            <View style={styles.bannerEditBadge}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Logo picker */}
          <TouchableOpacity
            onPress={() => pickImage(setLogoUri)}
            style={styles.logoPicker}
          >
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} resizeMode="cover" />
            ) : (
              <View style={[styles.logoPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="business-outline" size={28} color={colors.text + "40"} />
              </View>
            )}
            <View style={styles.logoEditBadge}>
              <Ionicons name="camera-outline" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Fields */}
          <View style={styles.fields}>
            <Text style={[styles.label, { color: colors.text }]}>
              Business Name *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Sarah's Hair Studio"
              placeholderTextColor={colors.text + "50"}
              value={businessName}
              onChangeText={setBusinessName}
            />

            <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: category === cat ? "#6366F1" : colors.card,
                      borderColor: category === cat ? "#6366F1" : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === cat ? "#fff" : colors.text },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>
              Description
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Tell customers about your services and experience..."
              placeholderTextColor={colors.text + "50"}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Location
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Windhoek, Namibia"
              placeholderTextColor={colors.text + "50"}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                  <Text style={styles.createBtnText}>Create Profile</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroGradient: { paddingBottom: 28 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
  },
  heroContent: { paddingHorizontal: 20, paddingTop: 12 },
  heroTitle: { fontSize: 24, fontFamily: FONTS.bold, color: "#fff" },
  heroSub: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  bannerPicker: { borderRadius: 14, overflow: "hidden", marginBottom: 16, position: "relative" },
  bannerPreview: { width: "100%", height: 140 },
  bannerPlaceholder: {
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerEditBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#6366F1",
    borderRadius: 14,
    padding: 6,
  },
  pickerHint: { fontSize: 13, fontFamily: FONTS.regular },
  logoPicker: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 20,
    alignSelf: "center",
    marginTop: -52,
    position: "relative",
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#6366F1",
    borderRadius: 10,
    padding: 4,
  },
  fields: { gap: 4 },
  label: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 8, marginTop: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 4,
  },
  textArea: { minHeight: 100 },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 12, fontFamily: FONTS.medium },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});
