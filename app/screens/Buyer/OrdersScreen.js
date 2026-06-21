import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import { formatOrderNumber, formatCurrency, formatDate } from "../../utils/formatters";
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";

const STATUS_CONFIG = {
  pending:    { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "time-outline",             label: "Pending" },
  processing: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: "sync-outline",             label: "Processing" },
  shipped:    { color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",  icon: "car-outline",              label: "Shipped" },
  delivered:  { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   icon: "checkmark-circle-outline", label: "Delivered" },
  cancelled:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "close-circle-outline",     label: "Cancelled" },
};

const PAYMENT_CONFIG = {
  paid:            { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   icon: "card-outline",    label: "Paid" },
  pending:         { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "time-outline",    label: "Pending" },
  unpaid:          { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "card-outline",    label: "Unpaid" },
  deferred:        { color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",  icon: "calendar-outline",label: "Pay Later" },
  proof_submitted: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: "cloud-upload-outline", label: "Verifying" },
  proof_rejected:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "close-circle-outline", label: "Rejected" },
};

const STAT_FILTERS = [
  { key: "all",        label: "All",        icon: "receipt-outline",           color: "#6366F1", bg: "rgba(99,102,241,0.12)" },
  { key: "pending",    label: "Pending",    icon: "time-outline",              color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { key: "processing", label: "Processing", icon: "sync-outline",              color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  { key: "shipped",    label: "Shipped",    icon: "car-outline",               color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  { key: "delivered",  label: "Delivered",  icon: "checkmark-circle-outline",  color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  { key: "cancelled",  label: "Cancelled",  icon: "close-circle-outline",      color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
];

const OrdersScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 });
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold });

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { filterOrders(); calculateStats(); }, [orders, searchQuery, selectedFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`*, shop:shops(id, name, logo_url)`)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error.message);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = () => {
    setStats({
      total: orders.length,
      pending:    orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      shipped:    orders.filter((o) => o.status === "shipped").length,
      delivered:  orders.filter((o) => o.status === "delivered").length,
      cancelled:  orders.filter((o) => o.status === "cancelled").length,
    });
  };

  const filterOrders = () => {
    let result = [...orders];
    if (selectedFilter !== "all") result = result.filter((o) => o.status === selectedFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) => o.id.toString().includes(q) || o.shop?.name?.toLowerCase().includes(q));
    }
    setFilteredOrders(result);
  };

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  if (!fontsLoaded) return null;

  const statCount = (key) => (key === "all" ? stats.total : stats[key]);

  const renderOrder = ({ item }) => {
    const navigate = () => {
      if (item?.id) navigation.navigate("OrderDetails", { orderId: item.id });
      else Alert.alert("Error", "Cannot view details for this order.");
    };

    const status = STATUS_CONFIG[item.status] || { color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: "help-circle-outline", label: item.status };
    const payment = PAYMENT_CONFIG[item.payment_status] || PAYMENT_CONFIG["pending"];

    return (
      <TouchableOpacity style={[styles.orderCard, { backgroundColor: colors.card }]} onPress={navigate} activeOpacity={0.92}>
        {/* Indigo left accent */}
        <View style={[styles.accentBar, { backgroundColor: status.color }]} />

        <View style={styles.cardInner}>
          {/* Top row: order ID + status */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.orderId, { color: colors.text }]}>{formatOrderNumber(item.id)}</Text>
              {/* Payment badge */}
              <View style={[styles.paymentBadge, { backgroundColor: payment.bg }]}>
                <Ionicons name={payment.icon} size={11} color={payment.color} />
                <Text style={[styles.paymentBadgeText, { color: payment.color }]}>{payment.label}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={13} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Shop + date + amount */}
          <View style={styles.cardBody}>
            <View style={styles.shopRow}>
              <View style={[styles.shopIconBox, { backgroundColor: "rgba(99,102,241,0.1)" }]}>
                <Ionicons name="storefront-outline" size={14} color="#6366F1" />
              </View>
              <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
                {item.shop?.name || "Unknown Shop"}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(item.total_amount)}</Text>
            </View>
          </View>

          {/* Footer */}
          <TouchableOpacity style={[styles.viewDetailsRow, { borderTopColor: colors.border }]} onPress={navigate}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="receipt-outline" size={40} color="#6366F1" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery.trim()
          ? `No orders match "${searchQuery}"`
          : selectedFilter !== "all"
          ? `No ${selectedFilter} orders yet`
          : "You haven't placed any orders yet"}
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: isSearchFocused ? "#6366F1" : colors.border, borderWidth: isSearchFocused ? 2 : 1.5 }]}>
          <Ionicons name="search" size={20} color={isSearchFocused ? "#6366F1" : "#9CA3AF"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats filter strip */}
      <View style={[styles.statsWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          {STAT_FILTERS.map((f) => {
            const active = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.statChip, { backgroundColor: active ? "rgba(99,102,241,0.12)" : colors.background, borderColor: active ? "#6366F1" : colors.border }]}
                onPress={() => setSelectedFilter(f.key)}
              >
                <View style={[styles.statIconBox, { backgroundColor: active ? "rgba(99,102,241,0.15)" : f.bg }]}>
                  <Ionicons name={f.icon} size={16} color={active ? "#6366F1" : f.color} />
                </View>
                <View>
                  <Text style={[styles.statCount, { color: active ? "#6366F1" : colors.text }]}>{statCount(f.key)}</Text>
                  <Text style={[styles.statLabel, active && { color: "#6366F1" }]}>{f.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={filteredOrders.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} tintColor="#6366F1" />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: FONTS.regular },

  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: FONTS.bold },

  // Search
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchContainer: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14, height: 48 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  // Stats strip
  statsWrapper: { borderBottomWidth: 1 },
  statsScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5,
  },
  statIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statCount: { fontSize: 15, fontFamily: FONTS.bold, lineHeight: 18 },
  statLabel: { fontSize: 11, color: "#9CA3AF", fontFamily: FONTS.medium },

  list: { padding: 16, paddingBottom: 100 },
  emptyList: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", padding: 32, gap: 10 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(99,102,241,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: FONTS.regular, textAlign: "center" },

  // Order card
  orderCard: {
    flexDirection: "row", borderRadius: 18, marginBottom: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  accentBar: { width: 4 },
  cardInner: { flex: 1 },

  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 14, paddingBottom: 10 },
  orderId: { fontSize: 16, fontFamily: FONTS.bold, marginBottom: 5 },
  paymentBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  paymentBadgeText: { fontSize: 11, fontFamily: FONTS.semiBold },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: FONTS.semiBold },

  divider: { height: 1, marginHorizontal: 14 },

  cardBody: { paddingHorizontal: 14, paddingVertical: 12 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  shopIconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  shopName: { flex: 1, fontSize: 14, fontFamily: FONTS.medium },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, color: "#9CA3AF", fontFamily: FONTS.regular },
  amountText: { fontSize: 16, fontFamily: FONTS.bold },

  viewDetailsRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1 },
  viewDetailsText: { fontSize: 13, color: "#6366F1", fontFamily: FONTS.semiBold },
});

export default OrdersScreen;
