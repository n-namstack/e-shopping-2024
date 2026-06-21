import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
  Clipboard,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { COLORS, FONTS, SHADOWS } from "../../constants/theme";
import {
  formatOrderNumber,
  formatCurrency,
  formatDate,
} from "../../utils/formatters";
import CommentModal from "../../components/common/CommentModal";

const STATUS_CONFIG = {
  pending:    { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "time-outline",          label: "Pending" },
  processing: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: "sync-outline",          label: "Processing" },
  shipped:    { color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",  icon: "car-outline",           label: "Shipped" },
  delivered:  { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   icon: "checkmark-circle-outline", label: "Delivered" },
  cancelled:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "close-circle-outline",  label: "Cancelled" },
};

const OrderDetailsScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("Notification data[18-01-2025]: ", data);
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Fetching order details for orderId:", orderId);
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          shop:shops(
            id,
            name,
            logo_url,
            owner:profiles!shops_owner_id_fkey(
              id,
              firstname,
              lastname,
              email,
              cellphone_no
            )
          ),
          order_items!order_items_order_id_fkey(
            id,
            quantity,
            product:products!order_items_product_id_fkey(
              id,
              name,
              price,
              description
            )
          ),
          buyer:profiles!orders_buyer_id_fkey(
            id,
            firstname,
            lastname,
            email,
            cellphone_no,
            role
          )
        `,
        )
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error("Failed to fetch order details");
      }

      if (!data) {
        throw new Error("Order not found");
      }

      console.log("Fetched order:", JSON.stringify(data, null, 2));
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order details:", error.message);
      Alert.alert(
        "Error",
        error.message === "User not authenticated"
          ? "Please log in to view order details"
          : "Failed to load order details. Please try again.",
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "N$0.00";
    }
    return (
      "N$" +
      parseFloat(amount)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")
    );
  };

  const getPaymentStatusUI = (paymentStatus) => {
    const configs = {
      paid:           { color: "#22C55E", bg: "rgba(34,197,94,0.1)",    icon: "checkmark-circle", label: "Paid" },
      pending:        { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   icon: "time",             label: "Pending" },
      deferred:       { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",   icon: "calendar",         label: "Pay Later" },
      proof_submitted:{ color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   icon: "cloud-upload",     label: "Verifying Payment" },
      proof_rejected: { color: "#EF4444", bg: "rgba(239,68,68,0.1)",    icon: "alert-circle",     label: "Proof Rejected" },
    };
    const cfg = configs[paymentStatus];
    if (!cfg) return null;
    return (
      <View style={[styles.paymentBadge, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={13} color={cfg.color} />
        <Text style={[styles.paymentBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  };

  const handleContactShop = () => {
    if (!order?.shop?.owner) {
      Alert.alert("Error", "Shop owner information not available");
      return;
    }

    const owner = order.shop.owner;
    Alert.alert(
      "Contact Shop Owner",
      `Would you like to contact ${owner.firstname} ${owner.lastname}?`,
      [
        {
          text: "Call",
          onPress: async () => {
            if (owner.cellphone_no) {
              const phoneNumber = owner.cellphone_no.replace(/\D/g, "");
              const formattedNumber = phoneNumber.startsWith("0")
                ? phoneNumber.substring(1)
                : phoneNumber;

              try {
                await Linking.openURL(`tel:+264${formattedNumber}`);
              } catch (error) {
                console.error("Error opening phone:", error);
                Alert.alert(
                  "Error",
                  "Could not open phone app. Please try calling manually: +264" +
                    formattedNumber,
                );
              }
            } else {
              Alert.alert("Error", "Phone number not available");
            }
          },
        },
        {
          text: "Email",
          onPress: async () => {
            if (owner.email) {
              try {
                const emailUrl = `mailto:${owner.email}?subject=Regarding Order #${order.id}`;
                const canOpen = await Linking.canOpenURL(emailUrl);
                if (canOpen) {
                  await Linking.openURL(emailUrl);
                } else {
                  throw new Error("Cannot open email app");
                }
              } catch (error) {
                console.error("Error opening email:", error);
                Alert.alert(
                  "Error",
                  "Could not open email app. Please try emailing manually: " +
                    owner.email,
                );
              }
            } else {
              Alert.alert("Error", "Email not available");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.background }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.background }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Order Not Found</Text>
          <Text style={styles.errorSub}>The order details could not be loaded.</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const status = STATUS_CONFIG[order.status] || { color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: "help-circle-outline", label: order.status };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.background }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero Card */}
        <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Order ID</Text>
              <Text style={styles.heroOrderId}>{formatOrderNumber(order.id)}</Text>
              <Text style={styles.heroDate}>{formattedDate}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name={status.icon} size={14} color="#fff" />
              <Text style={styles.statusPillText}>{status.label}</Text>
            </View>
          </View>

          {/* Shop row inside hero */}
          <View style={styles.heroShopRow}>
            <View style={styles.heroShopIcon}>
              <Ionicons name="storefront-outline" size={16} color="#6366F1" />
            </View>
            <Text style={styles.heroShopName} numberOfLines={1}>
              {order.shop?.name || "Unknown Shop"}
            </Text>
            <TouchableOpacity style={styles.heroContactBtn} onPress={handleContactShop}>
              <Ionicons name="call-outline" size={13} color="#fff" />
              <Text style={styles.heroContactText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Order Items */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="bag-outline" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Order Items</Text>
            <Text style={styles.cardCount}>{order.order_items?.length || 0} item{order.order_items?.length !== 1 ? "s" : ""}</Text>
          </View>

          {order.order_items?.map((item, index) => (
            <View key={item.id} style={[styles.itemRow, index < order.order_items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={styles.itemQtyBadge}>
                <Text style={styles.itemQtyText}>{item.quantity}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.product?.name}</Text>
                {item.product?.description ? (
                  <Text style={styles.itemDesc} numberOfLines={2}>{item.product.description}</Text>
                ) : null}
                <Text style={styles.itemUnit}>{formatCurrency(item.product?.price)} each</Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.quantity * (item.product?.price || 0))}</Text>
            </View>
          ))}
        </View>

        {/* Message Seller */}
        <TouchableOpacity style={styles.messageBtnWrapper} onPress={() => setCommentModalVisible(true)} activeOpacity={0.85}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.messageBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
            <Text style={styles.messageBtnText}>Message Seller</Text>
          </LinearGradient>
        </TouchableOpacity>

        <CommentModal
          type="order"
          itemId={order.id}
          visible={commentModalVisible}
          onClose={() => setCommentModalVisible(false)}
          itemName={`#${order.id.toString().substring(0, 8).toUpperCase()}`}
        />

        {/* Payment Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="card-outline" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Payment Details</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            {getPaymentStatusUI(order.payment_status)}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Subtotal</Text>
            <Text style={[styles.paymentValue, { color: colors.text }]}>
              {formatCurrency(order.subtotal || order.total_amount)}
            </Text>
          </View>
          {order.shipping_fee > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Shipping</Text>
              <Text style={[styles.paymentValue, { color: colors.text }]}>{formatCurrency(order.shipping_fee)}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(order.total_amount)}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="location-outline" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Delivery Details</Text>
          </View>

          {order.delivery_address ? (
            <View style={styles.deliveryRow}>
              <View style={[styles.deliveryIcon, { backgroundColor: "rgba(99,102,241,0.08)" }]}>
                <Ionicons name="location-outline" size={16} color="#6366F1" />
              </View>
              <Text style={[styles.deliveryText, { color: colors.text }]}>{order.delivery_address}</Text>
            </View>
          ) : (
            <View style={styles.deliveryRow}>
              <View style={[styles.deliveryIcon, { backgroundColor: "rgba(245,158,11,0.08)" }]}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.deliveryText, { color: "#F59E0B" }]}>No delivery address provided</Text>
            </View>
          )}

          {order.delivery_location && (
            <View style={styles.deliveryRow}>
              <View style={[styles.deliveryIcon, { backgroundColor: "rgba(99,102,241,0.08)" }]}>
                <Ionicons name="map-outline" size={16} color="#6366F1" />
              </View>
              <Text style={[styles.deliveryText, { color: colors.text }]}>
                {order.delivery_location.charAt(0).toUpperCase() + order.delivery_location.slice(1)}
              </Text>
            </View>
          )}

          {order.phone_number && (
            <View style={styles.deliveryRow}>
              <View style={[styles.deliveryIcon, { backgroundColor: "rgba(99,102,241,0.08)" }]}>
                <Ionicons name="call-outline" size={16} color="#6366F1" />
              </View>
              <Text style={[styles.deliveryText, { color: colors.text }]}>{order.phone_number}</Text>
            </View>
          )}

          {order.special_instructions && (
            <View style={styles.deliveryRow}>
              <View style={[styles.deliveryIcon, { backgroundColor: "rgba(99,102,241,0.08)" }]}>
                <Ionicons name="chatbox-outline" size={16} color="#6366F1" />
              </View>
              <Text style={[styles.deliveryText, { color: colors.text }]}>{order.special_instructions}</Text>
            </View>
          )}

          {order.tracking_number && (
            <View style={styles.deliveryRow}>
              <View style={[styles.deliveryIcon, { backgroundColor: "rgba(99,102,241,0.08)" }]}>
                <Ionicons name="cube-outline" size={16} color="#6366F1" />
              </View>
              <Text style={[styles.deliveryText, { color: colors.text }]}>Tracking: {order.tracking_number}</Text>
            </View>
          )}
        </View>

        {/* Contact Shop Owner */}
        <TouchableOpacity style={styles.contactBtnWrapper} onPress={handleContactShop} activeOpacity={0.85}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.contactBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="headset-outline" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>Contact Shop Owner</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, letterSpacing: -0.3 },

  // Loading / Error
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: FONTS.regular },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  errorIconBox: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(239,68,68,0.08)",
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  errorTitle: { fontSize: 20, fontFamily: FONTS.bold },
  errorSub: { fontSize: 14, color: "#9CA3AF", fontFamily: FONTS.regular, textAlign: "center" },
  errorBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.1)" },
  errorBtnText: { fontSize: 15, color: "#EF4444", fontFamily: FONTS.semiBold },

  content: { flex: 1 },

  // Hero
  heroCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: FONTS.medium, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  heroOrderId: { fontSize: 18, color: "#fff", fontFamily: FONTS.bold, letterSpacing: 0.5, marginBottom: 4 },
  heroDate: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontFamily: FONTS.regular },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
  },
  statusPillText: { fontSize: 13, color: "#fff", fontFamily: FONTS.semiBold },
  heroShopRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 10,
  },
  heroShopIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },
  heroShopName: { flex: 1, fontSize: 14, color: "#fff", fontFamily: FONTS.semiBold },
  heroContactBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  heroContactText: { fontSize: 12, color: "#fff", fontFamily: FONTS.medium },

  // Cards
  card: {
    backgroundColor: "#fff", borderRadius: 18, marginHorizontal: 16, marginTop: 12,
    padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardIconBox: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: FONTS.bold },
  cardCount: {
    fontSize: 12, color: "#6366F1", fontFamily: FONTS.semiBold,
    backgroundColor: "rgba(99,102,241,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },

  // Items
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12,
  },
  itemQtyBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  itemQtyText: { fontSize: 12, color: "#6366F1", fontFamily: FONTS.bold },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 3 },
  itemDesc: { fontSize: 12, color: "#9CA3AF", fontFamily: FONTS.regular, marginBottom: 4, lineHeight: 17 },
  itemUnit: { fontSize: 12, color: "#9CA3AF", fontFamily: FONTS.medium },
  itemTotal: { fontSize: 15, color: "#6366F1", fontFamily: FONTS.bold },

  divider: { height: 1, marginVertical: 8 },

  // Message button
  messageBtnWrapper: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: "hidden" },
  messageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15 },
  messageBtnText: { fontSize: 15, color: "#fff", fontFamily: FONTS.semiBold },

  // Payment
  paymentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  paymentLabel: { fontSize: 14, color: "#9CA3AF", fontFamily: FONTS.medium },
  paymentValue: { fontSize: 14, fontFamily: FONTS.semiBold },
  paymentBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  paymentBadgeText: { fontSize: 12, fontFamily: FONTS.semiBold },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  totalLabel: { fontSize: 16, fontFamily: FONTS.bold },
  totalAmount: { fontSize: 20, color: "#6366F1", fontFamily: FONTS.bold },

  // Delivery
  deliveryRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  deliveryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 1 },
  deliveryText: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20, paddingTop: 6 },

  // Contact btn
  contactBtnWrapper: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: "hidden" },
  contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15 },
  contactBtnText: { fontSize: 15, color: "#fff", fontFamily: FONTS.semiBold },
});

export default OrderDetailsScreen;
