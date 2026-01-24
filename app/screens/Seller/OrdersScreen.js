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
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import {
  formatOrderNumber,
  formatCurrency,
  formatDate,
} from "../../utils/formatters";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

const OrdersScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });

  // Extract shopId and fromShop from route params
  const shopId = route.params?.shopId;
  const fromShop = route.params?.fromShop;

  // Add this effect to reset when going back
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      // Reset the shop filter when leaving the screen
      if (fromShop) {
        navigation.setParams({ shopId: null, fromShop: false });
      }
    });

    return unsubscribe;
  }, [navigation, fromShop]);

  useEffect(() => {
    fetchOrders();
  }, [shopId]);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchQuery, selectedFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);

      let query;

      if (shopId) {
        // If shopId is provided, only fetch orders for that shop
        query = supabase
          .from("orders")
          .select(
            `
            *,
            notifications:notifications (
              read
            )
          `
          )
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false });
      } else {
        // Otherwise fetch orders for all shops owned by the user
        const { data: shops, error: shopError } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id);

        if (shopError) throw shopError;

        if (!shops || shops.length === 0) {
          setOrders([]);
          setIsLoading(false);
          setRefreshing(false);
          return;
        }

        const shopIds = shops.map((shop) => shop.id);

        query = supabase
          .from("orders")
          .select(
            `
            *,
            notifications:notifications (
              read
            )
          `
          )
          .in("shop_id", shopIds)
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process the orders to include read status
      const processedOrders = (data || []).map((order) => ({
        ...order,
        isRead: order.notifications?.[0]?.read ?? true, // Default to true if no notification exists
      }));

      setOrders(processedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error.message);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = () => {
    const newStats = {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      processing: orders.filter((order) => order.status === "processing")
        .length,
      shipped: orders.filter((order) => order.status === "shipped").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    };

    setStats(newStats);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filterOrders = () => {
    let result = [...orders];

    // Apply status filter
    if (selectedFilter !== "all") {
      result = result.filter((order) => order.status === selectedFilter);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toString().includes(query) ||
          (order.buyer_id && order.buyer_id.toLowerCase().includes(query))
      );
    }

    setFilteredOrders(result);
  };

  const handleStatusFilter = (status) => {
    setSelectedFilter(status);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const updateData = { status: newStatus };

      // If the order is being marked as delivered or completed, also update payment_status
      if (newStatus === "delivered" || newStatus === "completed") {
        updateData.payment_status = "paid";
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                ...(updateData.payment_status && {
                  payment_status: updateData.payment_status,
                }),
              }
            : order
        )
      );

      Alert.alert("Success", `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error.message);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const showActionSheet = (order) => {
    const options = [];
    const actions = [];

    switch (order.status) {
      case "pending":
        options.push("Accept Order", "Reject Order");
        actions.push(
          () => handleUpdateStatus(order.id, "processing"),
          () => handleUpdateStatus(order.id, "cancelled")
        );
        break;
      case "processing":
        options.push("Mark as Shipped");
        actions.push(() => handleUpdateStatus(order.id, "shipped"));
        break;
      case "shipped":
        options.push("Mark as Delivered");
        actions.push(() => handleUpdateStatus(order.id, "delivered"));
        break;
      default:
        break;
    }

    if (options.length > 0) {
      options.push("Cancel");
      Alert.alert("Update Order Status", "Choose an action:", [
        ...options.map((option, index) => ({
          text: option,
          onPress: option === "Cancel" ? undefined : actions[index],
          style:
            option === "Reject Order" || option === "Cancel"
              ? "cancel"
              : "default",
        })),
      ]);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FF9800";
      case "processing":
        return "#2196F3";
      case "shipped":
        return "#9C27B0";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return (
          <MaterialIcons name="hourglass-bottom" size={16} color="#FF9800" />
        );
      case "processing":
        return <MaterialIcons name="sync" size={16} color="#2196F3" />;
      case "shipped":
        return (
          <MaterialIcons name="local-shipping" size={16} color="#9C27B0" />
        );
      case "delivered":
        return <MaterialIcons name="check-circle" size={16} color="#4CAF50" />;
      case "cancelled":
        return <MaterialIcons name="cancel" size={16} color="#F44336" />;
      default:
        return <MaterialIcons name="help" size={16} color="#757575" />;
    }
  };

  const getPaymentStatusUI = (paymentStatus) => {
    switch (paymentStatus) {
      case "paid":
        return (
          <View style={styles.paymentStatusPaid}>
            <MaterialIcons name="payments" size={12} color="#4CAF50" />
            <Text style={styles.paymentStatusTextPaid}>Paid</Text>
          </View>
        );
      case "pending":
        return (
          <View style={styles.paymentStatusPending}>
            <MaterialIcons name="payment" size={12} color="#FF9800" />
            <Text style={styles.paymentStatusTextPending}>Pending</Text>
          </View>
        );
      case "deferred":
        return (
          <View style={styles.paymentStatusDeferred}>
            <MaterialIcons name="schedule" size={12} color="#9C27B0" />
            <Text style={styles.paymentStatusTextDeferred}>Pay Later</Text>
          </View>
        );
      case "proof_submitted":
        return (
          <View style={styles.paymentStatusPending}>
            <MaterialIcons name="upload" size={12} color="#FF9800" />
            <Text style={styles.paymentStatusTextPending}>Needs Review</Text>
          </View>
        );
      case "proof_rejected":
        return (
          <View style={styles.paymentStatusRejected}>
            <MaterialIcons name="error" size={12} color="#F44336" />
            <Text style={styles.paymentStatusTextRejected}>Proof Rejected</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderOrder = ({ item }) => {
    const navigateToOrderDetails = () => {
      navigation.navigate("OrderDetails", { orderId: item.id });
    };

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          { backgroundColor: colors.card },
          !item.isRead && styles.unreadOrderCard,
        ]}
        onPress={navigateToOrderDetails}
      >
        {!item.isRead && (
          <View style={styles.unreadIndicator}>
            <View style={styles.unreadDot} />
          </View>
        )}
        {/* <LinearGradient
          colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0)"]}
          style={styles.orderCardGradient}
        /> */}

        <View
          style={[styles.orderHeader, { borderBottomColor: colors.border }]}
        >
          <View style={styles.orderIdContainer}>
            <Text style={[styles.orderId, { color: colors.text }]}>
              {formatOrderNumber(item.id)}
            </Text>
            {getPaymentStatusUI(item.payment_status)}
          </View>

          <TouchableOpacity
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
            onPress={() => showActionSheet(item)}
          >
            {getStatusIcon(item.status)}
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orderContent}>
          <View style={styles.customerInfo}>
            <MaterialIcons
              name="person-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.customerName}>
              Customer #{item.buyer_id?.substring(0, 8) || "Unknown"}
            </Text>
          </View>

          <View style={styles.orderDetailRow}>
            <View style={styles.orderDetail}>
              <MaterialIcons
                name="date-range"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.orderDetailText}>
                {formatDate(item.created_at)}
              </Text>
            </View>

            <View style={styles.orderDetail}>
              <MaterialIcons
                name="payments"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={[styles.orderTotal, { color: colors.primary }]}>
                {formatCurrency(item.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.orderFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={navigateToOrderDetails}
          >
            <Text style={[styles.viewDetailsText, { color: colors.text }]}>
              View Details
            </Text>
            <MaterialIcons
              name="arrow-forward-ios"
              size={12}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyOrders = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={["rgba(100, 120, 200, 0.2)", "rgba(100, 120, 200, 0.1)"]}
        style={styles.emptyIconContainer}
      >
        <MaterialCommunityIcons
          name="receipt-text-outline"
          size={60}
          color="#6478C8"
        />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? `No orders match "${searchQuery}"`
          : selectedFilter !== "all"
          ? `No ${selectedFilter} orders found`
          : "You have no orders yet"}
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading orders...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.text} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {fromShop && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text },
            fromShop && { marginLeft: 16 },
          ]}
        >
          {fromShop ? "Shop Orders" : "Orders"}
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchWrapper,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[styles.searchContainer, { backgroundColor: colors.card }]}
        >
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Order Stats */}
      <View
        style={[
          styles.statsContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollView}
        >
          <View
            style={[
              styles.statCard,
              selectedFilter === "all" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => handleStatusFilter("all")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(33, 150, 243, 0.1)" },
                ]}
              >
                <MaterialIcons name="receipt-long" size={18} color="#2196F3" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.total}
                </Text>
                <Text style={styles.statLabel}>All</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              selectedFilter === "pending" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => handleStatusFilter("pending")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(255, 152, 0, 0.1)" },
                ]}
              >
                <MaterialIcons
                  name="hourglass-bottom"
                  size={18}
                  color="#FF9800"
                />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.pending}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              selectedFilter === "processing" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => handleStatusFilter("processing")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(33, 150, 243, 0.1)" },
                ]}
              >
                <MaterialIcons name="sync" size={18} color="#2196F3" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.processing}
                </Text>
                <Text style={styles.statLabel}>Processing</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              selectedFilter === "shipped" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => handleStatusFilter("shipped")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(156, 39, 176, 0.1)" },
                ]}
              >
                <MaterialIcons
                  name="local-shipping"
                  size={18}
                  color="#9C27B0"
                />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.shipped}
                </Text>
                <Text style={styles.statLabel}>Shipped</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              selectedFilter === "delivered" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => handleStatusFilter("delivered")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(76, 175, 80, 0.1)" },
                ]}
              >
                <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.delivered}
                </Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statCard,
              selectedFilter === "cancelled" && styles.selectedStatCard,
            ]}
          >
            <TouchableOpacity
              style={styles.statContent}
              onPress={() => handleStatusFilter("cancelled")}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: "rgba(244, 67, 54, 0.1)" },
                ]}
              >
                <MaterialIcons name="cancel" size={18} color="#F44336" />
              </View>
              <View style={styles.statInfo}>
                <Text style={[styles.statCount, { color: colors.text }]}>
                  {stats.cancelled}
                </Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyOrders}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  searchWrapper: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  statsContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  statsScrollView: {
    paddingHorizontal: 15,
  },
  statCard: {
    marginRight: 12,
    padding: 2,
    borderRadius: 12,
  },
  selectedStatCard: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statInfo: {
    justifyContent: "center",
  },
  statCount: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.small,
  },
  orderCardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  orderIdContainer: {
    flexDirection: "column",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 5,
    fontFamily: FONTS.semiBold,
  },
  orderContent: {
    padding: 15,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontFamily: FONTS.regular,
  },
  orderDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontFamily: FONTS.regular,
  },
  orderTotal: {
    fontSize: 15,
    color: COLORS.primary,
    marginLeft: 6,
    fontFamily: FONTS.semiBold,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    padding: 12,
    alignItems: "flex-end",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 13,
    color: COLORS.primary,
    marginRight: 5,
    fontFamily: FONTS.medium,
  },
  paymentStatusPaid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentStatusTextPaid: {
    fontSize: 10,
    color: "#4CAF50",
    marginLeft: 3,
    fontFamily: FONTS.semiBold,
  },
  paymentStatusPending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentStatusTextPending: {
    fontSize: 10,
    color: "#FF9800",
    fontFamily: FONTS.semiBold,
    marginLeft: 3,
  },
  paymentStatusDeferred: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(156, 39, 176, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentStatusTextDeferred: {
    fontSize: 10,
    color: "#9C27B0",
    fontFamily: FONTS.semiBold,
    marginLeft: 3,
  },
  paymentStatusRejected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentStatusTextRejected: {
    fontSize: 10,
    color: "#F44336",
    fontFamily: FONTS.semiBold,
    marginLeft: 3,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    padding: 10,
  },
  unreadOrderCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  unreadIndicator: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

export default OrdersScreen;
