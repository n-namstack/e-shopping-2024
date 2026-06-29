import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
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

const TABS = ["All", "Upcoming", "Completed", "Cancelled"];

export default function MyBookingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { customerBookings, fetchCustomerBookings, cancelBooking, loading } =
    useBookingStore();
  const [activeTab, setActiveTab] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchCustomerBookings(user.id);
    }, [user?.id])
  );

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel(`customer-bookings-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.id}`,
        },
        () => fetchCustomerBookings(user.id)
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) await fetchCustomerBookings(user.id);
    setRefreshing(false);
  }, [user?.id]);

  const filteredBookings = customerBookings.filter((b) => {
    if (activeTab === "All") return true;
    if (activeTab === "Upcoming") return b.status === "pending" || b.status === "confirmed";
    if (activeTab === "Completed") return b.status === "completed";
    if (activeTab === "Cancelled") return b.status === "cancelled";
    return true;
  });

  const handleCancel = (bookingId) => {
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
      { text: "No" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelBooking(bookingId);
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-NA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (t) => {
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
      <View style={styles.cardHeader}>
        {item.services?.image_url ? (
          <Image
            source={{ uri: item.services.image_url }}
            style={styles.serviceThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.serviceThumb, styles.thumbPlaceholder]}>
            <Ionicons name="cut-outline" size={20} color="#6366F1" />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
            {item.services?.name || "Service"}
          </Text>
          <Text style={[styles.providerName, { color: colors.text + "70" }]} numberOfLines={1}>
            @ {item.service_providers?.business_name || "Provider"}
          </Text>
        </View>
        <BookingStatusBadge status={item.status} size="sm" />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.text + "60"} />
          <Text style={[styles.metaText, { color: colors.text + "80" }]}>
            {formatDate(item.booking_date)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.text + "60"} />
          <Text style={[styles.metaText, { color: colors.text + "80" }]}>
            {formatTime(item.start_time)} – {formatTime(item.end_time)}
          </Text>
        </View>
        {item.service_providers?.location ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.text + "60"} />
            <Text
              style={[styles.metaText, { color: colors.text + "80" }]}
              numberOfLines={1}
            >
              {item.service_providers.location}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.price, { color: "#6366F1" }]}>
          N${Number(item.services?.price || 0).toFixed(2)}
        </Text>
      </View>

      {(item.status === "pending" || item.status === "confirmed") && (
        <TouchableOpacity
          onPress={() => handleCancel(item.id)}
          style={[styles.cancelBtn, { borderColor: "#EF4444" }]}
        >
          <Text style={styles.cancelBtnText}>Cancel Booking</Text>
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
        <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
              activeTab === tab && { borderBottomColor: "#6366F1" },
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
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
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
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookings yet</Text>
              <Text style={[styles.emptyText, { color: colors.text + "60" }]}>
                Book a service to get started
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("ServicesTab")}
                style={styles.browseBtn}
              >
                <Text style={styles.browseBtnText}>Browse Services</Text>
              </TouchableOpacity>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: FONTS.bold },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 13, fontFamily: FONTS.medium },
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceThumb: { width: 48, height: 48, borderRadius: 10 },
  thumbPlaceholder: {
    backgroundColor: "rgba(99,102,241,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: FONTS.semiBold },
  providerName: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  divider: { height: 1 },
  cardMeta: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: FONTS.regular },
  price: { fontSize: 15, fontFamily: FONTS.bold, marginTop: 2 },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnText: { color: "#EF4444", fontSize: 14, fontFamily: FONTS.semiBold },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: FONTS.semiBold, marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: FONTS.regular },
  browseBtn: {
    marginTop: 12,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnText: { color: "#fff", fontFamily: FONTS.semiBold, fontSize: 14 },
});
