import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import BookingStatusBadge from "../../components/BookingStatusBadge";
import useBookingStore from "../../store/bookingStore";
import useAuthStore from "../../store/authStore";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const TABS = ["Pending", "Confirmed", "Completed", "Cancelled"];

export default function BookingManagementScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { myProvider, providerBookings, fetchProviderBookings, updateBookingStatus } =
    useBookingStore();

  const [activeTab, setActiveTab] = useState("Pending");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const channelRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [myProvider?.id])
  );

  async function load() {
    if (!myProvider) { setLoading(false); return; }
    await fetchProviderBookings(myProvider.id);
    setLoading(false);
  }

  // Realtime: reflect booking status changes immediately
  useEffect(() => {
    if (!myProvider) return;
    channelRef.current = supabase
      .channel(`provider-bookings-${myProvider.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `provider_id=eq.${myProvider.id}`,
        },
        () => fetchProviderBookings(myProvider.id)
      )
      .subscribe();
    return () => { channelRef.current?.unsubscribe(); };
  }, [myProvider?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (myProvider) await fetchProviderBookings(myProvider.id);
    setRefreshing(false);
  }, [myProvider?.id]);

  const filteredBookings = providerBookings.filter(
    (b) => b.status === activeTab.toLowerCase()
  );

  const handleUpdateStatus = (booking, newStatus) => {
    const label = newStatus === "confirmed" ? "Confirm" : "Cancel";
    Alert.alert(
      `${label} Booking`,
      `Are you sure you want to ${label.toLowerCase()} this booking?`,
      [
        { text: "No" },
        {
          text: label,
          style: newStatus === "cancelled" ? "destructive" : "default",
          onPress: async () => {
            setUpdatingId(booking.id);
            try {
              await updateBookingStatus(
                booking.id,
                newStatus,
                booking.customer_id
              );
            } catch (e) {
              Alert.alert("Error", e.message);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-NA", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const renderBooking = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {item.services?.name || "Service"}
          </Text>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={13} color={colors.text + "60"} />
            <Text style={[styles.customerName, { color: colors.text + "80" }]}>
              {item.profiles?.full_name || "Customer"}
            </Text>
          </View>
        </View>
        <BookingStatusBadge status={item.status} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color="#6366F1" />
          <Text style={[styles.metaText, { color: colors.text + "80" }]}>
            {formatDate(item.booking_date)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color="#6366F1" />
          <Text style={[styles.metaText, { color: colors.text + "80" }]}>
            {formatTime(item.start_time)} – {formatTime(item.end_time)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={13} color="#6366F1" />
          <Text style={[styles.metaText, { color: colors.text + "80" }]}>
            N${Number(item.services?.price || 0).toFixed(2)}
          </Text>
        </View>
        {item.notes ? (
          <View style={styles.metaItem}>
            <Ionicons name="document-text-outline" size={13} color="#6366F1" />
            <Text
              style={[styles.metaText, { color: colors.text + "70" }]}
              numberOfLines={2}
            >
              {item.notes}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action buttons for pending */}
      {item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, "cancelled")}
            disabled={updatingId === item.id}
            style={[styles.actionBtn, styles.rejectBtn, { borderColor: "#EF4444" }]}
          >
            <Ionicons name="close-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, "confirmed")}
            disabled={updatingId === item.id}
            style={[styles.actionBtn, styles.acceptBtn]}
          >
            {updatingId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>Confirm</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Mark complete for confirmed */}
      {item.status === "confirmed" && (
        <TouchableOpacity
          onPress={() => handleUpdateStatus(item, "completed")}
          disabled={updatingId === item.id}
          style={styles.completeBtn}
        >
          {updatingId === item.id ? (
            <ActivityIndicator color="#22C55E" />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={18} color="#22C55E" />
              <Text style={{ color: "#22C55E", fontFamily: FONTS.semiBold, fontSize: 14 }}>
                Mark as Completed
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const count = providerBookings.filter(
            (b) => b.status === tab.toLowerCase()
          ).length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: "#6366F1", borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? "#6366F1" : colors.text + "70" },
                ]}
              >
                {tab}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: activeTab === tab ? "#6366F1" : colors.border },
                  ]}
                >
                  <Text
                    style={{
                      color: activeTab === tab ? "#fff" : colors.text,
                      fontSize: 10,
                      fontFamily: FONTS.bold,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={56} color={colors.text + "30"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No {activeTab.toLowerCase()} bookings
              </Text>
            </View>
          }
          renderItem={renderBooking}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: FONTS.bold },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 12, fontFamily: FONTS.medium },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardInfo: { flex: 1, gap: 4 },
  serviceName: { fontSize: 16, fontFamily: FONTS.bold },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  customerName: { fontSize: 13, fontFamily: FONTS.regular },
  divider: { height: 1 },
  metaGrid: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  metaText: { fontSize: 13, fontFamily: FONTS.regular, flex: 1 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectBtn: { borderWidth: 1 },
  acceptBtn: { backgroundColor: "#6366F1" },
  actionBtnText: { fontSize: 14, fontFamily: FONTS.semiBold },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: FONTS.semiBold, marginTop: 8 },
});
