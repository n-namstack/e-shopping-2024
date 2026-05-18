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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS, COLORS } from "../../constants/theme";

const STATUS_COLOR = {
  pending: { bg: "#fef3c7", text: "#92400e" },
  processing: { bg: "#dbeafe", text: "#1e40af" },
  paid: { bg: "#dcfce7", text: "#166534" },
};

const formatCurrency = (value) =>
  `N$${new Intl.NumberFormat("en-NA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const AdminPayoutsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [filter, setFilter] = useState("pending"); // pending | all

  const fetchPayouts = useCallback(async () => {
    try {
      let query = supabase
        .from("payouts")
        .select(
          `id, seller_id, amount, status, transaction_id, created_at, paid_at,
          order:orders(id, total_amount, created_at),
          bank_account:seller_bank_accounts(bank_name, account_number, account_holder, branch_code, account_type)`
        )
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.in("status", ["pending", "processing"]);
      }

      const { data, error } = await query;
      if (error) throw error;

      const payoutList = data || [];

      // Fetch seller profiles separately (seller_id FK points to auth.users, not profiles)
      const sellerIds = [...new Set(payoutList.map((p) => p.seller_id).filter(Boolean))];
      let profileMap = {};
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", sellerIds);
        (profiles || []).forEach((p) => { profileMap[p.id] = p; });
      }

      setPayouts(payoutList.map((p) => ({ ...p, seller: profileMap[p.seller_id] || null })));
    } catch (error) {
      console.error("Error fetching payouts:", error);
      Alert.alert("Error", "Failed to load payouts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchPayouts();
  }, [fetchPayouts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayouts();
  };

  const handleMarkPaid = (payout) => {
    const bankInfo = payout.bank_account
      ? `${payout.bank_account.bank_name}\nAccount: ${payout.bank_account.account_number}\nHolder: ${payout.bank_account.account_holder}${payout.bank_account.branch_code ? `\nBranch: ${payout.bank_account.branch_code}` : ""}`
      : "No bank account registered for this seller.";

    Alert.alert(
      "Confirm Payout",
      `Transfer ${formatCurrency(payout.amount)} to:\n\n${bankInfo}\n\nHave you completed the bank transfer?`,
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, Mark as Paid",
          style: "default",
          onPress: () => confirmMarkPaid(payout.id),
        },
      ]
    );
  };

  const confirmMarkPaid = async (payoutId) => {
    setMarkingId(payoutId);
    try {
      const { error } = await supabase
        .from("payouts")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? { ...p, status: "paid", paid_at: new Date().toISOString() }
            : p
        )
      );
    } catch (error) {
      console.error("Error marking payout as paid:", error);
      Alert.alert("Error", "Failed to update payout status");
    } finally {
      setMarkingId(null);
    }
  };

  const renderPayout = ({ item }) => {
    const statusStyle = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
    const orderId = item.order?.id?.slice(0, 8).toUpperCase() ?? "—";
    const isPending = item.status !== "paid";
    const isMarking = markingId === item.id;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Seller row */}
        <View style={styles.sellerRow}>
          <Ionicons
            name="person-circle-outline"
            size={18}
            color={isDarkMode ? "#aaa" : "#64748b"}
          />
          <Text style={[styles.sellerName, { color: colors.text }]}>
            {item.seller?.username ?? item.seller?.email ?? "Unknown seller"}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Amount + order */}
        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
            <Text
              style={[
                styles.orderId,
                { color: isDarkMode ? "#aaa" : "#64748b" },
              ]}
            >
              Order #{orderId} · {formatDate(item.created_at)}
            </Text>
          </View>
          {isPending && (
            <TouchableOpacity
              style={[styles.payButton, isMarking && { opacity: 0.6 }]}
              onPress={() => handleMarkPaid(item)}
              disabled={isMarking}
            >
              {isMarking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.payButtonText}>Mark Paid</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {!isPending && item.paid_at && (
            <Text
              style={[
                styles.paidAt,
                { color: isDarkMode ? "#aaa" : "#64748b" },
              ]}
            >
              Paid {formatDate(item.paid_at)}
            </Text>
          )}
        </View>

        {/* Bank details */}
        {item.bank_account ? (
          <View
            style={[
              styles.bankBox,
              {
                backgroundColor: isDarkMode ? "#1a2a1a" : "#f0fdf4",
                borderColor: isDarkMode ? "#2a3a2a" : "#bbf7d0",
              },
            ]}
          >
            <Text style={styles.bankLine}>
              <Text style={styles.bankLabel}>Bank: </Text>
              <Text style={{ color: colors.text }}>
                {item.bank_account.bank_name}
              </Text>
            </Text>
            <Text style={styles.bankLine}>
              <Text style={styles.bankLabel}>Account: </Text>
              <Text style={{ color: colors.text }}>
                {item.bank_account.account_number}
              </Text>
            </Text>
            <Text style={styles.bankLine}>
              <Text style={styles.bankLabel}>Holder: </Text>
              <Text style={{ color: colors.text }}>
                {item.bank_account.account_holder}
              </Text>
            </Text>
            {item.bank_account.branch_code ? (
              <Text style={styles.bankLine}>
                <Text style={styles.bankLabel}>Branch: </Text>
                <Text style={{ color: colors.text }}>
                  {item.bank_account.branch_code}
                </Text>
              </Text>
            ) : null}
            <Text style={styles.bankLine}>
              <Text style={styles.bankLabel}>Type: </Text>
              <Text style={{ color: colors.text }}>
                {item.bank_account.account_type}
              </Text>
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.bankBox,
              {
                backgroundColor: isDarkMode ? "#2a1a1a" : "#fff7ed",
                borderColor: isDarkMode ? "#3a2a1a" : "#fed7aa",
              },
            ]}
          >
            <Text style={{ color: "#c2410c", fontFamily: FONTS.regular, fontSize: 13 }}>
              No bank account registered — contact seller to add one.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const pendingTotal = payouts
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + parseFloat(p.amount), 0);

  const ListHeader = () => (
    <>
      {filter === "pending" && payouts.length > 0 && (
        <View
          style={[
            styles.totalBox,
            {
              backgroundColor: isDarkMode ? "#1a2040" : "#eff6ff",
              borderColor: isDarkMode ? "#2a3060" : "#bfdbfe",
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: isDarkMode ? "#93c5fd" : "#1e40af" }]}>
            Total pending payout
          </Text>
          <Text style={[styles.totalAmount, { color: isDarkMode ? "#93c5fd" : "#1e40af" }]}>
            {formatCurrency(pendingTotal)}
          </Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {["pending", "all"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === f
                    ? COLORS.primary || "#0f172a"
                    : colors.card,
                borderColor:
                  filter === f
                    ? COLORS.primary || "#0f172a"
                    : colors.border,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={{
                color: filter === f ? "#fff" : colors.text,
                fontFamily: FONTS.semiBold,
                fontSize: 13,
              }}
            >
              {f === "pending" ? "Pending" : "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="checkmark-circle-outline"
        size={48}
        color={isDarkMode ? "#555" : "#cbd5e1"}
      />
      <Text style={[styles.emptyText, { color: isDarkMode ? "#aaa" : "#64748b" ,fontFamily: FONTS.regular}]}>
        {filter === "pending" ? "No pending payouts" : "No payouts yet"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text ,fontFamily: FONTS.bold}]}>
          Manage Payouts
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          renderItem={renderPayout}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyList}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  totalBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 13, fontFamily: FONTS.semiBold },
  totalAmount: { fontSize: 18, fontFamily: FONTS.bold },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 14,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sellerName: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amount: { fontSize: 20, fontFamily: FONTS.bold },
  orderId: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  payButtonText: { color: "#fff", fontSize: 13, fontFamily: FONTS.semiBold },
  paidAt: { fontSize: 12, fontFamily: FONTS.regular },
  bankBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 3,
  },
  bankLine: { fontSize: 13, fontFamily: FONTS.regular },
  bankLabel: { fontFamily: FONTS.semiBold, color: "#16a34a" },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 50,
    gap: 12,
  },
  emptyText: { fontSize: 15, fontFamily: FONTS.semiBold },
});

export default AdminPayoutsScreen;
