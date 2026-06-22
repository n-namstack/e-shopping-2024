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
  Switch,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";
import { compressImage } from "../../utils/imageHelpers";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";

const PRIMARY = "#6366F1";
const PRIMARY_LIGHT = "rgba(99,102,241,0.12)";

const BUSINESS_TYPES = [
  { key: "individual", label: "Individual", sub: "Sole Proprietor", icon: "person" },
  { key: "company",    label: "Company",    sub: "Registered Biz",  icon: "business" },
  { key: "partnership",label: "Partnership",sub: "Multiple Owners", icon: "people" },
];

const VerificationScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [isLoading, setIsLoading]               = useState(true);
  const [isSaving, setIsSaving]                 = useState(false);
  const [existingVerification, setExistingVerification] = useState(null);
  const [verificationStatus, setVerificationStatus]     = useState(null);
  const [rejectionReason, setRejectionReason]   = useState("");

  const [nationalId, setNationalId]             = useState(null);
  const [businessType, setBusinessType]         = useState("individual");
  const [hasPhysicalStore, setHasPhysicalStore] = useState(false);
  const [physicalAddress, setPhysicalAddress]   = useState("");
  const [additionalInfo, setAdditionalInfo]     = useState("");
  const [selfieCaptured, setSelfieCaptured]     = useState(null);

  useEffect(() => { checkExistingVerification(); }, []);

  const checkExistingVerification = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("seller_verifications")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setExistingVerification(data);
        if (data.status === "verified")       setVerificationStatus("verified");
        else if (data.status === "pending")   setVerificationStatus("pending");
        else if (data.status === "rejected") {
          setVerificationStatus("rejected");
          setRejectionReason(data.rejection_reason);
        }
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      Alert.alert("Error", "Failed to check verification status");
    } finally {
      setIsLoading(false);
    }
  };

  const takeSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take a selfie");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets?.length > 0) {
        setSelfieCaptured(result.assets[0]);
      }
    } catch (error) {
      console.error("Error taking selfie:", error);
      Alert.alert("Error", "Failed to capture selfie");
    }
  };

  const pickDocument = async (type) => {
    try {
      if (type === "national_id") {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
        if (result.canceled === false && result.assets?.length > 0) {
          setNationalId(result.assets[0]);
        }
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to select document");
    }
  };

  const uploadDocument = async (uri, type, asset = null) => {
    try {
      let processedUri = uri;
      if (type === "selfie") {
        try { processedUri = await compressImage(uri); }
        catch { processedUri = uri; }
      }
      const base64 = await FileSystem.readAsStringAsync(processedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      let fileExt = "jpg";
      if (asset?.name) {
        fileExt = asset.name.split(".").pop().toLowerCase();
      } else if (asset?.mimeType) {
        const mimeMap = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png" };
        fileExt = mimeMap[asset.mimeType] || "jpg";
      } else {
        const clean = processedUri.split("?")[0];
        fileExt = clean.split(".").pop().toLowerCase() || "jpg";
      }
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
      const contentType = fileExt === "pdf" ? "application/pdf" : fileExt === "png" ? "image/png" : "image/jpeg";
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, decode(base64), { contentType, upsert: true });
      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  };

  const validateForm = () => {
    if (!nationalId) {
      Alert.alert("Required", "Please upload your National ID or Passport.");
      return false;
    }
    if (!selfieCaptured) {
      Alert.alert("Required", "Please take a selfie for identity verification.");
      return false;
    }
    if (hasPhysicalStore && !physicalAddress.trim()) {
      Alert.alert("Required", "Please enter your physical store address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setIsSaving(true);
      const nationalIdUrl = await uploadDocument(nationalId.uri, "national_id", nationalId);
      const selfieUrl     = await uploadDocument(selfieCaptured.uri, "selfie", selfieCaptured);
      const verificationData = {
        user_id: user.id,
        national_id_url: nationalIdUrl,
        selfie_url: selfieUrl,
        business_type: businessType,
        has_physical_store: hasPhysicalStore,
        physical_address: hasPhysicalStore ? physicalAddress : "",
        additional_info: additionalInfo,
        status: "pending",
        submitted_at: new Date().toISOString(),
      };
      let error;
      if (existingVerification) {
        const { error: e } = await supabase.from("seller_verifications").update(verificationData).eq("id", existingVerification.id);
        error = e;
      } else {
        const { error: e } = await supabase.from("seller_verifications").insert([verificationData]);
        error = e;
      }
      if (error) throw error;
      setVerificationStatus("pending");
    } catch (error) {
      console.error("Error submitting verification:", error);
      Alert.alert("Submission Failed", error?.message || "Failed to submit. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // ─── Status screens ────────────────────────────────────────────────────────
  if (verificationStatus) {
    const isVerified = verificationStatus === "verified";
    const isPending  = verificationStatus === "pending";
    const isRejected = verificationStatus === "rejected";

    const statusConfig = isVerified
      ? { color: "#22C55E", bg: "rgba(34,197,94,0.12)", icon: "shield-checkmark", title: "You're Verified!", sub: "Your seller account has been verified. Your shops now display a verified badge." }
      : isPending
      ? { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: "time", title: "Under Review", sub: "We're reviewing your submission. You'll receive a notification once complete — usually within 1–2 business days." }
      : { color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: "close-circle", title: "Verification Failed", sub: rejectionReason || "Your verification was not approved. Please review the feedback and resubmit." };

    return (
      <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
        <View style={[s.simpleHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Verification Status</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.statusScroll} showsVerticalScrollIndicator={false}>
          {/* Hero icon */}
          <View style={[s.statusHero, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={52} color={statusConfig.color} />
          </View>
          <Text style={[s.statusTitle, { color: statusConfig.color }]}>{statusConfig.title}</Text>
          <Text style={[s.statusSub, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>{statusConfig.sub}</Text>

          {isVerified && (
            <View style={[s.statusCard, { backgroundColor: colors.card, borderColor: "rgba(34,197,94,0.2)" }]}>
              <Text style={[s.statusCardTitle, { color: colors.text }]}>Verification Benefits</Text>
              {[
                { icon: "ribbon",       color: "#F59E0B", text: "Verified badge on all your shops" },
                { icon: "trending-up",  color: "#22C55E", text: "Higher visibility in search results" },
                { icon: "shield",       color: PRIMARY,   text: "Increased buyer trust & conversions" },
              ].map(({ icon, color, text }) => (
                <View key={text} style={s.statusRow}>
                  <View style={[s.statusRowIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={18} color={color} />
                  </View>
                  <Text style={[s.statusRowText, { color: isDarkMode ? "#D1D5DB" : "#374151" }]}>{text}</Text>
                </View>
              ))}
            </View>
          )}

          {isPending && (
            <View style={[s.statusCard, { backgroundColor: colors.card, borderColor: "rgba(245,158,11,0.2)" }]}>
              <Text style={[s.statusCardTitle, { color: colors.text }]}>What happens next?</Text>
              {[
                { icon: "document-text", color: "#6366F1", text: "We review your uploaded documents" },
                { icon: "shield-half",   color: "#F59E0B", text: "Your business information is verified" },
                { icon: "notifications", color: "#22C55E", text: "You'll be notified when complete" },
              ].map(({ icon, color, text }) => (
                <View key={text} style={s.statusRow}>
                  <View style={[s.statusRowIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={18} color={color} />
                  </View>
                  <Text style={[s.statusRowText, { color: isDarkMode ? "#D1D5DB" : "#374151" }]}>{text}</Text>
                </View>
              ))}
            </View>
          )}

          {isRejected && (
            <>
              <View style={[s.statusCard, { backgroundColor: colors.card, borderColor: "rgba(239,68,68,0.2)" }]}>
                <Text style={[s.statusCardTitle, { color: colors.text }]}>Tips for resubmission</Text>
                {[
                  { icon: "camera",      color: "#6366F1", text: "Ensure photos are clear and well-lit" },
                  { icon: "document",    color: "#F59E0B", text: "Documents must be fully visible, unobstructed" },
                  { icon: "person",      color: "#22C55E", text: "Selfie must clearly show your face" },
                ].map(({ icon, color, text }) => (
                  <View key={text} style={s.statusRow}>
                    <View style={[s.statusRowIcon, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={icon} size={18} color={color} />
                    </View>
                    <Text style={[s.statusRowText, { color: isDarkMode ? "#D1D5DB" : "#374151" }]}>{text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={() => setVerificationStatus(null)} style={s.resubmitBtn}>
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={s.resubmitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={s.resubmitBtnText}>Submit New Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const subtle  = isDarkMode ? "rgba(255,255,255,0.06)" : "#F9FAFB";

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}>

        {/* Header */}
        <View style={[s.simpleHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Get Verified</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Hero Banner */}
          <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={s.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.heroIconWrap}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
            <View style={s.heroText}>
              <Text style={s.heroTitle}>Seller Verification</Text>
              <Text style={s.heroSub}>Verified sellers get a badge, higher visibility, and increased buyer trust.</Text>
            </View>
          </LinearGradient>

          {/* ── Step 1: Selfie ─────────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.stepBadge, { backgroundColor: PRIMARY_LIGHT }]}>
                <Text style={[s.stepNum, { color: PRIMARY }]}>1</Text>
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Identity Photo</Text>
            </View>
            <Text style={[s.cardSub, { color: muted }]}>Take a clear selfie so we can confirm your identity.</Text>

            {selfieCaptured ? (
              <View style={s.selfiePreviewWrap}>
                <Image source={{ uri: selfieCaptured.uri }} style={s.selfiePreview} />
                <View style={s.selfieCheck}>
                  <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                </View>
                <TouchableOpacity onPress={takeSelfie} style={[s.retakeBtn, { backgroundColor: isDarkMode ? "#2D2D3F" : "#F3F4F6" }]}>
                  <Ionicons name="camera" size={15} color={PRIMARY} />
                  <Text style={[s.retakeTxt, { color: PRIMARY }]}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={takeSelfie} style={[s.selfieEmpty, { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT }]}>
                <Ionicons name="camera" size={36} color={PRIMARY} />
                <Text style={[s.selfieEmptyTitle, { color: PRIMARY }]}>Take a Selfie</Text>
                <Text style={[s.selfieEmptySub, { color: muted }]}>Face must be clearly visible</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Step 2: National ID ─────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.stepBadge, { backgroundColor: PRIMARY_LIGHT }]}>
                <Text style={[s.stepNum, { color: PRIMARY }]}>2</Text>
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Identity Document</Text>
            </View>
            <Text style={[s.cardSub, { color: muted }]}>Upload a clear copy of your National ID or Passport (PDF or image).</Text>

            <TouchableOpacity onPress={() => pickDocument("national_id")}
              style={[s.uploadArea, {
                backgroundColor: nationalId ? "rgba(34,197,94,0.08)" : subtle,
                borderColor: nationalId ? "#22C55E" : isDarkMode ? "rgba(255,255,255,0.12)" : "#E5E7EB",
              }]}>
              {nationalId ? (
                <>
                  <View style={[s.uploadIcon, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                    <Ionicons name="document-text" size={22} color="#22C55E" />
                  </View>
                  <View style={s.uploadMeta}>
                    <Text style={[s.uploadFileName, { color: colors.text }]} numberOfLines={1}>{nationalId.name}</Text>
                    <Text style={[s.uploadFileSize, { color: "#22C55E" }]}>Uploaded ✓</Text>
                  </View>
                  <Ionicons name="swap-horizontal" size={18} color={muted} />
                </>
              ) : (
                <>
                  <View style={[s.uploadIcon, { backgroundColor: PRIMARY_LIGHT }]}>
                    <Ionicons name="cloud-upload" size={22} color={PRIMARY} />
                  </View>
                  <View style={s.uploadMeta}>
                    <Text style={[s.uploadPromptTitle, { color: colors.text }]}>Tap to upload</Text>
                    <Text style={[s.uploadPromptSub, { color: muted }]}>JPG, PNG or PDF accepted</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Step 3: Business Info ───────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.stepBadge, { backgroundColor: PRIMARY_LIGHT }]}>
                <Text style={[s.stepNum, { color: PRIMARY }]}>3</Text>
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Business Information</Text>
            </View>
            <Text style={[s.cardSub, { color: muted }]}>Select the type that best describes your business.</Text>

            {/* Business type cards */}
            <View style={s.bizRow}>
              {BUSINESS_TYPES.map(({ key, label, sub, icon }) => {
                const active = businessType === key;
                return (
                  <TouchableOpacity key={key} onPress={() => setBusinessType(key)}
                    style={[s.bizCard, {
                      backgroundColor: active ? PRIMARY_LIGHT : subtle,
                      borderColor: active ? PRIMARY : isDarkMode ? "rgba(255,255,255,0.08)" : "#E5E7EB",
                    }]}>
                    <Ionicons name={icon} size={22} color={active ? PRIMARY : muted} />
                    <Text style={[s.bizLabel, { color: active ? PRIMARY : colors.text }]}>{label}</Text>
                    <Text style={[s.bizSub, { color: active ? PRIMARY : muted }]}>{sub}</Text>
                    {active && (
                      <View style={s.bizCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Physical store toggle */}
            <View style={[s.toggleRow, { borderTopColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
              <View style={s.toggleLeft}>
                <Ionicons name="storefront-outline" size={20} color={muted} style={{ marginRight: 10 }} />
                <View>
                  <Text style={[s.toggleLabel, { color: colors.text }]}>Physical Store</Text>
                  <Text style={[s.toggleSub, { color: muted }]}>Do you have a walk-in store?</Text>
                </View>
              </View>
              <Switch
                value={hasPhysicalStore}
                onValueChange={setHasPhysicalStore}
                trackColor={{ false: isDarkMode ? "#374151" : "#E5E7EB", true: "rgba(99,102,241,0.4)" }}
                thumbColor={hasPhysicalStore ? PRIMARY : isDarkMode ? "#6B7280" : "#fff"}
              />
            </View>

            {hasPhysicalStore && (
              <TextInput
                style={[s.textarea, {
                  backgroundColor: subtle,
                  borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                  color: colors.text,
                }]}
                value={physicalAddress}
                onChangeText={setPhysicalAddress}
                placeholder="Enter your store's full address…"
                placeholderTextColor={muted}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            )}
          </View>

          {/* ── Step 4: Additional Info ─────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface }]}>
            <View style={s.cardHeader}>
              <View style={[s.stepBadge, { backgroundColor: PRIMARY_LIGHT }]}>
                <Text style={[s.stepNum, { color: PRIMARY }]}>4</Text>
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Additional Notes <Text style={[s.optionalBadge, { color: muted }]}>(optional)</Text></Text>
            </View>
            <TextInput
              style={[s.textarea, {
                backgroundColor: subtle,
                borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                color: colors.text,
              }]}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              placeholder="Anything else that might help with your verification…"
              placeholderTextColor={muted}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Terms */}
          <View style={[s.terms, { backgroundColor: subtle }]}>
            <Ionicons name="information-circle-outline" size={18} color={muted} style={{ marginTop: 1 }} />
            <Text style={[s.termsTxt, { color: muted }]}>
              By submitting, you confirm all information is accurate and true. False information may result in account suspension.
            </Text>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Submit footer */}
        <View style={[s.footer, { backgroundColor: colors.card, borderTopColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#E5E7EB" }]}>
          <TouchableOpacity onPress={handleSubmit} disabled={isSaving} style={s.submitWrap} activeOpacity={0.85}>
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={[s.submitBtn, isSaving && { opacity: 0.7 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.submitTxt}>Submit for Verification</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
  },

  // Scroll
  scroll: {
    padding: 16,
    paddingBottom: 8,
  },

  // Hero banner
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: "#fff",
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },

  // Card
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    lineHeight: 18,
    marginBottom: 14,
    marginLeft: 36,
  },
  optionalBadge: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },

  // Selfie
  selfiePreviewWrap: {
    alignItems: "center",
    gap: 12,
  },
  selfiePreview: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "#22C55E",
  },
  selfieCheck: {
    position: "absolute",
    top: 96,
    right: "31%",
    backgroundColor: "#fff",
    borderRadius: 14,
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeTxt: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  selfieEmpty: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 32,
    alignItems: "center",
    gap: 6,
  },
  selfieEmptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  selfieEmptySub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },

  // Upload area
  uploadArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadMeta: { flex: 1 },
  uploadFileName: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  uploadFileSize: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  uploadPromptTitle: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  uploadPromptSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },

  // Business type
  bizRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  bizCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  bizLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginTop: 2,
  },
  bizSub: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 14,
  },
  bizCheck: {
    position: "absolute",
    top: 6,
    right: 6,
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginTop: 14,
    borderTopWidth: 1,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  toggleSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },

  // Textarea
  textarea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlignVertical: "top",
    minHeight: 90,
    marginTop: 14,
  },

  // Terms
  terms: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  termsTxt: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },

  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitWrap: { borderRadius: 14, overflow: "hidden" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitTxt: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#fff",
  },

  // Status screen
  statusScroll: {
    padding: 24,
    alignItems: "center",
  },
  statusHero: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 12,
  },
  statusTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 10,
  },
  statusSub: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  statusCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  statusCardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  statusRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRowText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 20,
  },
  resubmitBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  resubmitGrad: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resubmitBtnText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#fff",
  },
});

export default VerificationScreen;
