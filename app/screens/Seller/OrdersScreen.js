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
import { useTheme } from "@react-navigation/native";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";
import { formatOrderNumber, formatCurrency, formatDate } from "../../utils/formatters";
import { useFonts, Jost_400Regular, Jost_700Bold, Jost_500Medium, Jost_600SemiBold } from "@expo-google-fonts/jost";

const STATUS_CONFIG = {
  all:        { label: "All",        color: "#6366F1", bg: "rgba(99,102,241,0.1)",  icon: "receipt-long" },
  pending:    { label: "Pending",    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  icon: "hourglass-bottom" },
  processing: { label: "Processing", color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  icon: "sync" },
  shipped:    { label: "Shipped",    color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  icon: "local-shipping" },
  delivered:  { label: "Delivered",  color: "#10B981", bg: "rgba(16,185,129,0.1)",  icon: "check-circle" },
  cancelled:  { label: "Cancelled",  color: "#EF4444", bg: "rgba(239,68,68,0.1)",   icon: "cancel" },
};

const PAYMENT_CONFIG = {
  paid:            { label: "Paid",           color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: "payments" },
  pending:         { label: "Unpaid",         color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "payment" },
  deferred:        { label: "Pay Later",      color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",  icon: "schedule" },
  proof_submitted: { label: "Needs Review",   color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "upload" },
  proof_rejected:  { label: "Proof Rejected", color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "error" },
};

const FILTERS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

export default function OrdersScreen({ navigation, route }) {
  const { user } = useAuthStore();
  const { colors, dark } = useTheme();
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_700Bold, Jost_500Medium, Jost_600SemiBold });

  const [isLoading, setIsLoading]         = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [orders, setOrders]               = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [stats, setStats] = useState({ all: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 });

  const shopId   = route.params?.shopId;
  const fromShop = route.params?.fromShop;

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      if (fromShop) navigation.setParams({ shopId: null, fromShop: false });
    });
    return unsub;
  }, [navigation, fromShop]);

  useEffect(() => { fetchOrders(); }, [shopId]);

  useEffect(() => {
    let result = [...orders];
    if (selectedFilter !== "all") result = result.filter(o => o.status === selectedFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.id.toString().includes(q) ||
        (o.buyer_id && o.buyer_id.toLowerCase().includes(q))
      );
    }
    setFilteredOrders(result);

    setStats({
      all:        orders.length,
      pending:    orders.filter(o => o.status === "pending").length,
      processing: orders.filter(o => o.status === "processing").length,
      shipped:    orders.filter(o => o.status === "shipped").length,
      delivered:  orders.filter(o => o.status === "delivered").length,
      cancelled:  orders.filter(o => o.status === "cancelled").length,
    });
  }, [orders, searchQuery, selectedFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      let query;
      if (shopId) {
        query = supabase.from("orders").select("*, notifications:notifications(read)").eq("shop_id", shopId).order("created_at", { ascending: false });
      } else {
        const { data: shops, error: shopError } = await supabase.from("shops").select("id").eq("owner_id", user.id);
        if (shopError) throw shopError;
        if (!shops?.length) { setOrders([]); return; }
        query = supabase.from("orders").select("*, notifications:notifications(read)").in("shop_id", shops.map(s => s.id)).order("created_at", { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw error;
      setOrders((data || []).map(o => ({ ...o, isRead: o.notifications?.[0]?.read ?? true })));
    } catch (e) {
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === "delivered" || newStatus === "completed") updateData.payment_status = "paid";
      const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
      if (error) throw error;
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, ...(updateData.payment_status && { payment_status: updateData.payment_status }) } : o));
    } catch (e) {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const showActionSheet = (order) => {
    const options = [], actions = [];
    if (order.status === "pending")    { options.push("Accept Order", "Reject Order"); actions.push(() => handleUpdateStatus(order.id, "processing"), () => handleUpdateStatus(order.id, "cancelled")); }
    if (order.status === "processing") { options.push("Mark as Shipped");   actions.push(() => handleUpdateStatus(order.id, "shipped")); }
    if (order.status === "shipped")    { options.push("Mark as Delivered"); actions.push(() => handleUpdateStatus(order.id, "delivered")); }
    if (!options.length) return;
    options.push("Cancel");
    Alert.alert("Update Status", "Choose an action:", options.map((opt, i) => ({
      text: opt,
      onPress: opt === "Cancel" ? undefined : actions[i],
      style: (opt === "Reject Order" || opt === "Cancel") ? "cancel" : "default",
    })));
  };

  if (!fontsLoaded) return null;

  const renderOrder = ({ item }) => {
    const status  = STATUS_CONFIG[item.status]  || STATUS_CONFIG.all;
    const payment = PAYMENT_CONFIG[item.payment_status];

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }, !item.isRead && { borderLeftWidth: 3, borderLeftColor: "#6366F1" }]}
        onPress={() => navigation.navigate("OrderDetails", { orderId: item.id })}
        activeOpacity={0.92}
      >
        {/* Card top: order number + status badge */}
        <View style={[styles.cardTop, { borderBottomColor: dark ? "#2D2D2D" : "#F1F5F9" }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.orderId, { color: colors.text }]} numberOfLines={1}>
              {formatOrderNumber(item.id)}
            </Text>
            {payment && (
              <View style={[styles.paymentChip, { backgroundColor: payment.bg }]}>
                <MaterialIcons name={payment.icon} size={11} color={payment.color} />
                <Text style={[styles.paymentChipText, { color: payment.color }]}>{payment.label}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: status.bg }]}
            onPress={() => showActionSheet(item)}
          >
            <MaterialIcons name={status.icon} size={13} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </TouchableOpacity>
        </View>

        {/* Card body: customer + date + amount */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>
              <Ionicons name="person-outline" size={13} color="#94A3B8" />
            </View>
            <Text style={[styles.infoText, { color: dark ? "#9CA3AF" : "#6B7280" }]}>
              Customer #{item.buyer_id?.substring(0, 8) || "Unknown"}
            </Text>
          </View>

          <View style={styles.cardFooterRow}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBox, { backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>
                <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
              </View>
              <Text style={[styles.infoText, { color: dark ? "#9CA3AF" : "#6B7280" }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.amountValue}>{formatCurrency(item.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* View details link */}
        <View style={[styles.cardAction, { borderTopColor: dark ? "#2D2D2D" : "#F1F5F9" }]}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color="#6366F1" />
        </View>

        {/* Unread dot */}
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={["#EEF2FF", "#E0E7FF"]} style={styles.emptyIconBox}>
        <MaterialCommunityIcons name="receipt-text-outline" size={48} color="#6366F1" />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? `No orders match "${searchQuery}"` : selectedFilter !== "all" ? `No ${selectedFilter} orders` : "Orders will appear here once customers start buying"}
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: dark ? "#9CA3AF" : "#6B7280" }]}>Loading orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: dark ? "#1E293B" : "#F1F5F9" }]}>
        {fromShop && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {fromShop ? "Shop Orders" : "Orders"}
          </Text>
          <Text style={styles.headerSub}>{stats.all} order{stats.all !== 1 ? "s" : ""}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: dark ? "#1E293B" : "#fff", borderColor: dark ? "#2D3748" : "#D1D5DB" }]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search orders…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filtersWrapper, { borderBottomColor: dark ? "#1E293B" : "#F1F5F9" }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map(f => {
            const cfg     = STATUS_CONFIG[f];
            const active  = selectedFilter === f;
            const count   = stats[f];
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedFilter(f)}
                style={[styles.filterChip, active && { backgroundColor: cfg.color }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name={cfg.icon} size={13} color={active ? "#fff" : cfg.color} />
                <Text style={[styles.filterLabel, { color: active ? "#fff" : (dark ? "#9CA3AF" : "#6B7280") }]}>
                  {cfg.label}
                </Text>
                <View style={[styles.filterBadge, { backgroundColor: active ? "rgba(255,255,255,0.25)" : cfg.bg }]}>
                  <Text style={[styles.filterBadgeText, { color: active ? "#fff" : cfg.color }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={["#6366F1"]} tintColor="#6366F1" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15, fontFamily: FONTS.regular },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 24, fontFamily: FONTS.bold, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "#94A3B8", fontFamily: FONTS.regular, marginTop: 2 },

  searchWrapper: { paddingHorizontal: 20, paddingVertical: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14, height: 46, gap: 10, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  filtersWrapper: { borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  filterLabel: { fontSize: 13, fontFamily: FONTS.semiBold },
  filterBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  filterBadgeText: { fontSize: 11, fontFamily: FONTS.bold },

  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },

  card: {
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  orderId: { fontSize: 15, fontFamily: FONTS.bold, letterSpacing: -0.2, marginBottom: 5 },
  paymentChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  paymentChipText: { fontSize: 10, fontFamily: FONTS.semiBold },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: FONTS.semiBold },

  cardBody: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoIconBox: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoText: { fontSize: 13, fontFamily: FONTS.regular },
  cardFooterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amountRow: { flexDirection: "row", alignItems: "center" },
  amountValue: { fontSize: 16, fontFamily: FONTS.bold, color: "#6366F1" },

  cardAction: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1 },
  viewDetailsText: { fontSize: 13, fontFamily: FONTS.semiBold, color: "#6366F1" },

  unreadDot: { position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: "#6366F1" },

  emptyContainer: { flex: 1, alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIconBox: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#94A3B8", fontFamily: FONTS.regular, textAlign: "center", lineHeight: 22 },
});
