import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
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

const SellerPayoutsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    paid: 0,
  });

  const fetchPayouts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select(
          `
          id, amount, status, transaction_id, created_at, paid_at,
          order:orders(id, total_amount, created_at),
          bank_account:seller_bank_accounts(bank_name, account_number)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = data || [];
      setPayouts(list);

      setSummary({
        total: list.reduce((s, p) => s + parseFloat(p.amount), 0),
        pending: list
          .filter((p) => p.status !== "paid")
          .reduce((s, p) => s + parseFloat(p.amount), 0),
        paid: list
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + parseFloat(p.amount), 0),
      });
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayouts();
  };

  const renderPayout = ({ item }) => {
    const statusStyle = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
    const orderId = item.order?.id?.slice(0, 8).toUpperCase() ?? "—";
    const bankInfo = item.bank_account
      ? `${item.bank_account.bank_name} ••${item.bank_account.account_number.slice(-4)}`
      : "No bank account linked";

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={[styles.orderId, { color: colors.text }]}>
              Order #{orderId}
            </Text>
            <Text style={[styles.date, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg },
              ]}
            >
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[styles.cardBottom, { borderTopColor: colors.border }]}
        >
          <Ionicons
            name="business-outline"
            size={14}
            color={isDarkMode ? "#aaa" : "#64748b"}
          />
          <Text
            style={[
              styles.bankText,
              { color: isDarkMode ? "#aaa" : "#64748b" },
            ]}
          >
            {bankInfo}
          </Text>
          {item.status === "paid" && item.paid_at && (
            <Text
              style={[
                styles.paidAt,
                { color: isDarkMode ? "#aaa" : "#64748b" },
              ]}
            >
              · Paid {formatDate(item.paid_at)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatCurrency(summary.total)}
          </Text>
          <Text style={[styles.summaryLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
            Total Earned
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>
            {formatCurrency(summary.pending)}
          </Text>
          <Text style={[styles.summaryLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
            Pending
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryValue, { color: "#16a34a" }]}>
            {formatCurrency(summary.paid)}
          </Text>
          <Text style={[styles.summaryLabel, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
            Paid Out
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.bankButton,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate("BankDetails")}
      >
        <Ionicons name="business" size={20} color={COLORS.primary || "#0f172a"} />
        <Text style={[styles.bankButtonText, { color: colors.text }]}>
          Manage Bank Account
        </Text>
        <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#aaa" : "#64748b"} />
      </TouchableOpacity>

      <Text style={[styles.listTitle, { color: colors.text }]}>
        Payout History
      </Text>
    </>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cash-outline" size={48} color={isDarkMode ? "#555" : "#cbd5e1"} />
      <Text style={[styles.emptyText, { color: isDarkMode ? "#aaa" : "#64748b" }]}>
        No payouts yet
      </Text>
      <Text style={[styles.emptySubText, { color: isDarkMode ? "#666" : "#94a3b8" }]}>
        Payouts are created automatically when customers complete card payments.
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Payouts
        </Text>
        <View style={{ width: 24 }} />
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
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  summaryValue: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 2 },
  summaryLabel: { fontSize: 11, fontFamily: FONTS.regular },
  bankButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  bankButtonText: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold },
  listTitle: { fontSize: 16, fontFamily: FONTS.semiBold, marginBottom: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
  },
  orderId: { fontSize: 15, fontFamily: FONTS.semiBold },
  date: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  amount: { fontSize: 16, fontFamily: FONTS.bold, textAlign: "right" },
  statusBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
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
  paidAt: { fontSize: 12, fontFamily: FONTS.regular },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: { fontSize: 16, fontFamily: FONTS.semiBold },
  emptySubText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default SellerPayoutsScreen;
