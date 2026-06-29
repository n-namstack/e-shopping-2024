import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import BookingStatusBadge from "../../components/BookingStatusBadge";
import useBookingStore from "../../store/bookingStore";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";

export default function ServiceProviderDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, profile } = useAuthStore();
  const { myProvider, providerBookings, fetchMyProvider, fetchProviderBookings } =
    useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.id])
  );

  async function load() {
    if (!user) return;
    setLoading(true);
    const prov = await fetchMyProvider(user.id);
    if (prov) await fetchProviderBookings(prov.id);
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [user?.id]);

  const stats = {
    total: providerBookings.length,
    pending: providerBookings.filter((b) => b.status === "pending").length,
    confirmed: providerBookings.filter((b) => b.status === "confirmed").length,
    completed: providerBookings.filter((b) => b.status === "completed").length,
    revenue: providerBookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + Number(b.services?.price || 0), 0),
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingBookings = providerBookings
    .filter(
      (b) =>
        (b.status === "pending" || b.status === "confirmed") &&
        b.booking_date >= todayStr
    )
    .slice(0, 5);

  const formatTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!myProvider) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="business-outline" size={64} color={colors.text + "30"} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Profile Yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.text + "60" }]}>
          Set up your service provider profile to get started
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("SPSetup")}
          style={styles.setupBtn}
        >
          <Text style={styles.setupBtnText}>Create Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Gradient header */}
        <LinearGradient
          colors={["#312E81", "#4F46E5", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.businessName} numberOfLines={1}>
                {myProvider.business_name}
              </Text>
            </View>
            {myProvider.logo_url ? (
              <Image
                source={{ uri: myProvider.logo_url }}
                style={styles.logo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoInitial}>
                  {myProvider.business_name?.[0]?.toUpperCase() || "S"}
                </Text>
              </View>
            )}
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.confirmed}</Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                N${stats.revenue.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: "list-outline", label: "Bookings", screen: "SPBookings" },
              { icon: "briefcase-outline", label: "Services", screen: "SPServices" },
              { icon: "calendar-outline", label: "Availability", screen: "SPAvailability" },
              { icon: "person-outline", label: "Profile", screen: "SPProfile" },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => navigation.navigate(action.screen)}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={22} color="#6366F1" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Upcoming
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("SPBookings")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="calendar-outline" size={36} color={colors.text + "30"} />
              <Text style={[styles.emptyCardText, { color: colors.text + "70" }]}>
                No upcoming bookings
              </Text>
            </View>
          ) : (
            upcomingBookings.map((booking) => (
              <View
                key={booking.id}
                style={[
                  styles.bookingCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.bookingRow}>
                  <View style={styles.bookingInfo}>
                    <Text style={[styles.bookingService, { color: colors.text }]}>
                      {booking.services?.name || "Service"}
                    </Text>
                    <Text style={[styles.bookingCustomer, { color: colors.text + "70" }]}>
                      {booking.profiles?.full_name || "Customer"}
                    </Text>
                    <View style={styles.bookingMeta}>
                      <Ionicons name="calendar-outline" size={12} color={colors.text + "60"} />
                      <Text style={[styles.bookingMetaText, { color: colors.text + "70" }]}>
                        {booking.booking_date} · {formatTime(booking.start_time)}
                      </Text>
                    </View>
                  </View>
                  <BookingStatusBadge status={booking.status} size="sm" />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  header: { padding: 20, paddingBottom: 28 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: FONTS.regular },
  businessName: { color: "#fff", fontSize: 22, fontFamily: FONTS.bold, maxWidth: 220 },
  logo: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  logoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: { color: "#fff", fontSize: 22, fontFamily: FONTS.bold },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statValue: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: FONTS.regular, marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold },
  seeAll: { color: "#6366F1", fontSize: 14, fontFamily: FONTS.medium },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(99,102,241,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 13, fontFamily: FONTS.semiBold },
  bookingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  bookingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingInfo: { flex: 1, gap: 3 },
  bookingService: { fontSize: 15, fontFamily: FONTS.semiBold },
  bookingCustomer: { fontSize: 13, fontFamily: FONTS.regular },
  bookingMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  bookingMetaText: { fontSize: 12, fontFamily: FONTS.regular },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyCardText: { fontSize: 14, fontFamily: FONTS.regular },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold },
  emptyText: { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center" },
  setupBtn: {
    marginTop: 8,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  setupBtnText: { color: "#fff", fontFamily: FONTS.bold, fontSize: 15 },
});
