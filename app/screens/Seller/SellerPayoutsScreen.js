import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const STATUS_CONFIG = {
  pending:    { color: "#F59E0B", bg: "rgba(245,158,11,0.15)",  icon: "time-outline",          label: "Pending"    },
  processing: { color: "#6366F1", bg: "rgba(99,102,241,0.15)",  icon: "refresh-circle-outline", label: "Processing" },
  paid:       { color: "#22C55E", bg: "rgba(34,197,94,0.15)",   icon: "checkmark-circle-outline", label: "Paid Out" },
};

const formatCurrency = (value) =>
  `N$${new Intl.NumberFormat("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NA", { day: "2-digit", month: "short", year: "numeric" });

const SellerPayoutsScreen = () => {
  const navigation     = useNavigation();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const [payouts,    setPayouts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary,    setSummary]    = useState({ total: 0, pending: 0, paid: 0 });

  const fetchPayouts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select(`
          id, amount, status, transaction_id, created_at, paid_at,
          order:orders(id, total_amount, created_at),
          bank_account:seller_bank_accounts(bank_name, account_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = data || [];
      setPayouts(list);
      setSummary({
        total:   list.reduce((s, p) => s + parseFloat(p.amount), 0),
        pending: list.filter((p) => p.status !== "paid").reduce((s, p) => s + parseFloat(p.amount), 0),
        paid:    list.filter((p) => p.status === "paid").reduce((s, p) => s + parseFloat(p.amount), 0),
      });
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const onRefresh = () => { setRefreshing(true); fetchPayouts(); };

  const renderPayout = ({ item }) => {
    const cfg     = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const orderId = item.order?.id?.slice(0, 8).toUpperCase() ?? "—";
    const bankInfo = item.bank_account
      ? `${item.bank_account.bank_name} ••${item.bank_account.account_number.slice(-4)}`
      : "No bank account linked";

    return (
      <View style={[s.card, { backgroundColor: surface, borderLeftColor: cfg.color }]}>
        <View style={s.cardTop}>
          <View style={s.cardTopLeft}>
            <View style={[s.cardIconWrap, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={18} color={cfg.color} />
            </View>
            <View>
              <Text style={[s.orderId, { color: colors.text }]}>Order #{orderId}</Text>
              <Text style={[s.date, { color: muted }]}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
          <View style={s.cardTopRight}>
            <Text style={[s.amount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
            <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
              <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        <View style={[s.cardBottom, { borderTopColor: border }]}>
          <Ionicons name="business-outline" size={13} color={muted} />
          <Text style={[s.bankText, { color: muted }]}>{bankInfo}</Text>
          {item.status === "paid" && item.paid_at && (
            <Text style={[s.paidAt, { color: muted }]}>· Paid {formatDate(item.paid_at)}</Text>
          )}
        </View>
      </View>
    );
  };

  const listHeader = (
    <>
      {/* Summary cards */}
      <View style={s.summaryRow}>
        {/* Total Earned */}
        <LinearGradient colors={[INDIGO, VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.summaryCard, { flex: 1.2 }]}>
          <Text style={s.summaryValueLight}>{formatCurrency(summary.total)}</Text>
          <Text style={s.summaryLabelLight}>Total Earned</Text>
        </LinearGradient>

        <View style={{ flex: 1, gap: 10 }}>
          {/* Pending */}
          <View style={[s.summaryCardSmall, { backgroundColor: surface }]}>
            <View style={[s.summaryDot, { backgroundColor: "#F59E0B" }]} />
            <View>
              <Text style={[s.summaryValueSmall, { color: "#F59E0B" }]}>{formatCurrency(summary.pending)}</Text>
              <Text style={[s.summaryLabelSmall, { color: muted }]}>Pending</Text>
            </View>
          </View>
          {/* Paid Out */}
          <View style={[s.summaryCardSmall, { backgroundColor: surface }]}>
            <View style={[s.summaryDot, { backgroundColor: "#22C55E" }]} />
            <View>
              <Text style={[s.summaryValueSmall, { color: "#22C55E" }]}>{formatCurrency(summary.paid)}</Text>
              <Text style={[s.summaryLabelSmall, { color: muted }]}>Paid Out</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Manage Bank Account */}
      <TouchableOpacity
        style={[s.bankBtn, { backgroundColor: surface }]}
        onPress={() => navigation.navigate("BankDetails")}
        activeOpacity={0.8}
      >
        <View style={[s.bankBtnIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
          <Ionicons name="card-outline" size={20} color={INDIGO} />
        </View>
        <Text style={[s.bankBtnText, { color: colors.text }]}>Manage Bank Account</Text>
        <View style={[s.bankBtnArrow, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
          <Ionicons name="chevron-forward" size={16} color={INDIGO} />
        </View>
      </TouchableOpacity>

      {/* Section title */}
      <View style={s.sectionTitleRow}>
        <View style={[s.sectionTitleDot, { backgroundColor: INDIGO }]} />
        <Text style={[s.sectionTitle, { color: colors.text }]}>Payout History</Text>
      </View>
    </>
  );

  const emptyList = (
    <View style={s.emptyBox}>
      <LinearGradient colors={[`${INDIGO}20`, `${VIOLET}10`]} style={s.emptyIconCircle}>
        <Ionicons name="cash-outline" size={42} color={INDIGO} />
      </LinearGradient>
      <Text style={[s.emptyTitle, { color: colors.text }]}>No payouts yet</Text>
      <Text style={[s.emptySub, { color: muted }]}>
        Payouts are created automatically when customers complete card payments.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>

      {/* ── Gradient Hero ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[s.heroBubble, { width: 180, height: 180, top: -60, right: -40 }]} />
        <View style={[s.heroBubble, { width: 80,  height: 80,  bottom: -20, left: 20 }]} />

        <View style={s.heroTopRow}>
          <TouchableOpacity style={s.heroBackBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroTitleWrap}>
            <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={s.heroIconBadge}>
              <Ionicons name="wallet-outline" size={22} color="#fff" />
            </LinearGradient>
            <Text style={s.heroTitle}>Payouts</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={INDIGO} />
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          renderItem={renderPayout}
          ListHeaderComponent={() => listHeader}
          ListEmptyComponent={() => emptyList}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[INDIGO]} tintColor={INDIGO} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  // Hero
  hero: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },

  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 48 },

  // Summary
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryCard: {
    borderRadius: 18, padding: 18, justifyContent: "flex-end",
    shadowColor: INDIGO, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    minHeight: 110,
  },
  summaryValueLight: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff", marginBottom: 4 },
  summaryLabelLight: { fontSize: 12, fontFamily: FONTS.medium, color: "rgba(255,255,255,0.75)" },

  summaryCardSmall: {
    flex: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  summaryDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  summaryValueSmall: { fontSize: 14, fontFamily: FONTS.bold, marginBottom: 1 },
  summaryLabelSmall: { fontSize: 11, fontFamily: FONTS.regular },

  // Bank button
  bankBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bankBtnIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bankBtnText:  { flex: 1, fontSize: 15, fontFamily: FONTS.semiBold },
  bankBtnArrow: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Section title
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitleDot: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.bold },

  // Payout cards
  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
  },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  orderId: { fontSize: 14, fontFamily: FONTS.semiBold },
  date: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  cardTopRight: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontFamily: FONTS.bold },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, marginTop: 5 },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  bankText: { fontSize: 12, fontFamily: FONTS.regular, flex: 1 },
  paidAt:   { fontSize: 12, fontFamily: FONTS.regular },

  // Empty
  emptyBox: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32, gap: 14 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, textAlign: "center" },
  emptySub:   { fontSize: 13, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 20 },
});

export default SellerPayoutsScreen;
