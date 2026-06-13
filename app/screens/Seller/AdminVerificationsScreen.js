import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS, COLORS } from "../../constants/theme";
import { sendPushNotification } from "../../services/PushNotificationService";

const STATUS_COLOR = {
  pending: { bg: "#fef3c7", text: "#92400e", icon: "time-outline" },
  verified: { bg: "#dcfce7", text: "#166534", icon: "checkmark-circle" },
  rejected: { bg: "#fee2e2", text: "#991b1b", icon: "close-circle" },
};

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-NA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const AdminVerificationsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [allVerifications, setAllVerifications] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  const fetchVerifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("seller_verifications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const list = data || [];

      // Fetch seller profiles separately
      const userIds = [...new Set(list.map((v) => v.user_id).filter(Boolean))];
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, email, firstname, lastname, expo_push_token")
          .in("id", userIds);
        (profiles || []).forEach((p) => { profileMap[p.id] = p; });
      }

      const enriched = list.map((v) => ({ ...v, seller: profileMap[v.user_id] || null }));
      setAllVerifications(enriched);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      Alert.alert("Error", "Failed to load verifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchVerifications();
  }, [fetchVerifications]);

  // Apply filter client-side so counts always reflect full dataset
  useEffect(() => {
    setVerifications(
      filter === "all"
        ? allVerifications
        : allVerifications.filter((v) => v.status === filter)
    );
  }, [filter, allVerifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVerifications();
  };

  const loadSignedUrls = async (verification) => {
    setUrlsLoading(true);
    try {
      const urls = {};
      const BUCKET = "verification-documents";
      const EXPIRY = 60 * 60; // 1 hour

      if (verification.national_id_url) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(verification.national_id_url, EXPIRY);
        if (data?.signedUrl) urls.national_id = data.signedUrl;
      }

      if (verification.selfie_url) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(verification.selfie_url, EXPIRY);
        if (data?.signedUrl) urls.selfie = data.signedUrl;
      }

      setSignedUrls(urls);
    } catch (error) {
      console.error("Error generating signed URLs:", error);
    } finally {
      setUrlsLoading(false);
    }
  };

  const openVerification = (item) => {
    setSelected(item);
    setSignedUrls({});
    loadSignedUrls(item);
  };

  const handleApprove = (verification) => {
    const name =
      verification.seller?.username ||
      verification.seller?.email ||
      "this seller";
    Alert.alert(
      "Approve Seller",
      `Approve ${name}? They will be able to start selling immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => confirmApprove(verification),
        },
      ]
    );
  };

  const confirmApprove = async (verification) => {
    setProcessing(true);
    try {
      // Update verification status
      const { error: verError } = await supabase
        .from("seller_verifications")
        .update({ status: "verified" })
        .eq("id", verification.id);
      if (verError) throw verError;

      // Mark seller profile as verified
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", verification.user_id);
      if (profileError) throw profileError;

      // Update all shops owned by this seller to verified
      const { error: shopError } = await supabase
        .from("shops")
        .update({ verification_status: "verified" })
        .eq("owner_id", verification.user_id);
      if (shopError) throw shopError;

      setAllVerifications((prev) =>
        prev.map((v) =>
          v.id === verification.id ? { ...v, status: "verified" } : v
        )
      );
      setSelected(null);

      // Notify the seller — pass cached token to avoid RLS blocking cross-user profile reads
      await sendPushNotification(
        verification.user_id,
        "Account Verified! 🎉",
        "Congratulations! Your seller account has been verified. You can now start selling on ShopIt.",
        { type: "shop_update" },
        verification.seller?.expo_push_token || null
      );

      Alert.alert("Approved", "Seller has been verified successfully.");
    } catch (error) {
      console.error("Approve error:", error);
      Alert.alert("Error", "Failed to approve seller");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = (verification) => {
    setSelected(verification);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection.");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("seller_verifications")
        .update({
          status: "rejected",
          rejection_reason: rejectReason.trim(),
        })
        .eq("id", selected.id);
      if (error) throw error;

      const rejectedUser = selected;
      setAllVerifications((prev) =>
        prev.map((v) =>
          v.id === selected.id
            ? { ...v, status: "rejected", rejection_reason: rejectReason.trim() }
            : v
        )
      );
      setRejectModalVisible(false);
      setSelected(null);

      // Notify the seller — pass cached token to avoid RLS blocking cross-user profile reads
      await sendPushNotification(
        rejectedUser.user_id,
        "Verification Update",
        `Your verification was not approved. Reason: ${rejectReason.trim()}. Please resubmit after making the necessary changes.`,
        { type: "shop_update" },
        rejectedUser.seller?.expo_push_token || null
      );
    } catch (error) {
      console.error("Reject error:", error);
      Alert.alert("Error", "Failed to reject verification");
    } finally {
      setProcessing(false);
    }
  };

  const openDocument = (url) => {
    if (!url) return;
    Linking.openURL(url);
  };

  const renderDocument = (label, storagePath, signedUrl) => {
    if (!storagePath) return null;
    const isPdf = storagePath.toLowerCase().endsWith(".pdf");

    return (
      <View style={styles.docBlock}>
        <Text style={[styles.docLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
          {label}
        </Text>
        {urlsLoading ? (
          <View style={styles.docImagePlaceholder}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
              Loading document...
            </Text>
          </View>
        ) : !signedUrl ? (
          <View style={[styles.docImagePlaceholder, { borderColor: colors.border }]}>
            <Ionicons name="image-outline" size={32} color={isDarkMode ? "#555" : "#cbd5e1"} />
            <Text style={[styles.loadingText, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
              Unable to load document
            </Text>
          </View>
        ) : isPdf ? (
          <TouchableOpacity
            style={[styles.pdfButton, { borderColor: colors.border }]}
            onPress={() => openDocument(signedUrl)}
          >
            <Ionicons name="document-text" size={24} color="#ef4444" />
            <Text style={[styles.pdfText, { color: colors.text }]}>Open PDF</Text>
            <Ionicons name="open-outline" size={16} color={isDarkMode ? "#aaa" : "#64748b"} />
          </TouchableOpacity>
        ) : (
          <Image
            source={{ uri: signedUrl }}
            style={styles.docImage}
            resizeMode="cover"
          />
        )}
      </View>
    );
  };

  const renderDetail = () => {
    if (!selected) return null;
    const statusStyle = STATUS_COLOR[selected.status] || STATUS_COLOR.pending;
    const sellerName =
      selected.seller
        ? `${selected.seller.firstname || ""} ${selected.seller.lastname || ""}`.trim() ||
          selected.seller.username ||
          selected.seller.email
        : "Unknown";

    return (
      <Modal
        visible={!!selected && !rejectModalVisible}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Verification Review
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Seller info */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={40} color={colors.text} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.sellerFullName, { color: colors.text }]}>
                    {sellerName}
                  </Text>
                  <Text style={[styles.sellerEmail, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
                    {selected.seller?.email ?? "—"}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Ionicons name={statusStyle.icon} size={13} color={statusStyle.text} />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Submission details */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Submission Details</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>Business Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selected.business_type === "individual" ? "Individual / Sole Trader" : "Registered Business"}
                </Text>
              </View>
              {selected.has_physical_store && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>Physical Address</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selected.physical_address || "—"}
                  </Text>
                </View>
              )}
              {selected.additional_info ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>Additional Info</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selected.additional_info}
                  </Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>Submitted</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(selected.submitted_at)}
                </Text>
              </View>
            </View>

            {/* Documents */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents</Text>
              {renderDocument("National ID / Passport", selected.national_id_url, signedUrls.national_id)}
              {renderDocument("Selfie with ID", selected.selfie_url, signedUrls.selfie)}
            </View>

            {/* Rejection reason if rejected */}
            {selected.status === "rejected" && selected.rejection_reason && (
              <View style={[styles.infoCard, { backgroundColor: isDarkMode ? "#2a1a1a" : "#fff7ed", borderColor: "#fed7aa" }]}>
                <Text style={[styles.sectionTitle, { color: "#c2410c" }]}>Rejection Reason</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selected.rejection_reason}
                </Text>
              </View>
            )}

            {/* Action buttons — only for pending */}
            {selected.status === "pending" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.rejectBtn, processing && { opacity: 0.6 }]}
                  onPress={() => handleReject(selected)}
                  disabled={processing}
                >
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveBtn, processing && { opacity: 0.6 }]}
                  onPress={() => handleApprove(selected)}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderRejectModal = () => (
    <Modal
      visible={rejectModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setRejectModalVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={[styles.rejectBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.rejectTitle, { color: colors.text }]}>
            Reason for Rejection
          </Text>
          <Text style={[styles.rejectSubtitle, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
            Explain what the seller needs to fix. This will be sent to them as a push notification and shown on their verification screen.
          </Text>
          <TextInput
            style={[
              styles.rejectInput,
              {
                backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="e.g. Your ID photo is blurry — please resubmit a clearer image of the front and back."
            placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <View style={styles.rejectActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setRejectModalVisible(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmRejectBtn, processing && { opacity: 0.6 }]}
              onPress={confirmReject}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Confirm Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item }) => {
    const statusStyle = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
    const name =
      item.seller
        ? `${item.seller.firstname || ""} ${item.seller.lastname || ""}`.trim() ||
          item.seller.username ||
          item.seller.email
        : "Unknown seller";

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => openVerification(item)}
        activeOpacity={0.75}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={[styles.cardName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.cardEmail, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
              {item.seller?.email ?? "—"}
            </Text>
            <Text style={[styles.cardDate, { color: isDarkMode ? "#777" : "#94a3b8" }]}>
              Submitted {formatDate(item.submitted_at)}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDarkMode ? "#555" : "#cbd5e1"}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const counts = allVerifications.reduce(
    (acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc; },
    {}
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Seller Verifications
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={verifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={() => (
            <>
              {/* Summary chips */}
              <View style={styles.summaryRow}>
                {[
                  { label: "Pending", key: "pending", color: "#f59e0b" },
                  { label: "Verified", key: "verified", color: "#16a34a" },
                  { label: "Rejected", key: "rejected", color: "#dc2626" },
                ].map((s) => (
                  <View key={s.key} style={[styles.summaryChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.summaryCount, { color: s.color }]}>
                      {counts[s.key] || 0}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Filter tabs */}
              <View style={styles.filterRow}>
                {["all", "pending", "verified", "rejected"].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: filter === f ? COLORS.primary || "#0f172a" : colors.card,
                        borderColor: filter === f ? COLORS.primary || "#0f172a" : colors.border,
                      },
                    ]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={{ color: filter === f ? "#fff" : colors.text, fontFamily: FONTS.semiBold, fontSize: 12 }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={isDarkMode ? "#555" : "#cbd5e1"} />
              <Text style={[styles.emptyText, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
                No {filter === "all" ? "" : filter} verifications
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {renderDetail()}
      {renderRejectModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold },
  list: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  summaryCount: { fontSize: 20, fontFamily: FONTS.bold },
  summaryLabel: { fontSize: 11, fontFamily: FONTS.regular, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: "flex-end" },
  cardName: { fontSize: 15, fontFamily: FONTS.semiBold },
  cardEmail: { fontSize: 13, fontFamily: FONTS.regular, marginTop: 2 },
  cardDate: { fontSize: 11, fontFamily: FONTS.regular, marginTop: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold },
  emptyContainer: { alignItems: "center", paddingTop: 50, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: FONTS.semiBold },
  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: FONTS.bold },
  modalBody: { padding: 16, paddingBottom: 40 },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  sellerFullName: { fontSize: 16, fontFamily: FONTS.bold },
  sellerEmail: { fontSize: 13, fontFamily: FONTS.regular, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  detailLabel: { fontSize: 13, fontFamily: FONTS.regular, flex: 1 },
  detailValue: { fontSize: 13, fontFamily: FONTS.semiBold, flex: 2, textAlign: "right" },
  docBlock: { marginBottom: 14 },
  docLabel: { fontSize: 12, fontFamily: FONTS.semiBold, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  docImage: { width: "100%", height: 200, borderRadius: 8 },
  docImagePlaceholder: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { fontSize: 13, fontFamily: FONTS.regular },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  pdfText: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 12,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: FONTS.semiBold },
  // Reject modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  rejectBox: {
    borderRadius: 16,
    padding: 20,
  },
  rejectTitle: { fontSize: 17, fontFamily: FONTS.bold, marginBottom: 6 },
  rejectSubtitle: { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 16, lineHeight: 18 },
  rejectInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    minHeight: 100,
    marginBottom: 16,
  },
  rejectActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontFamily: FONTS.semiBold },
  confirmRejectBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
});

export default AdminVerificationsScreen;
