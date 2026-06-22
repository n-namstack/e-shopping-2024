import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS, SHADOWS } from "../../constants/theme";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";

const PRIMARY   = "#6366F1";
const PRIMARY_D = "#4F46E5";

const CartScreen = ({ navigation }) => {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const { user }       = useAuthStore();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();

  const [standardTotal, setStandardTotal]     = useState(0);
  const [onOrderTotal, setOnOrderTotal]       = useState(0);
  const [deliveryFeesTotal, setDeliveryFeesTotal] = useState(0);
  const [runnerFeesTotal, setRunnerFeesTotal] = useState(0);
  const [total, setTotal]                     = useState(0);
  const [hasOnOrderItems, setHasOnOrderItems] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let standard = 0, onOrder = 0, delivery = 0, runner = 0;
    let hasOnOrder = false;
    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      if (item.in_stock) {
        standard += itemTotal;
      } else {
        hasOnOrder = true;
        if (item.delivery_fee) delivery += item.delivery_fee * item.quantity;
        onOrder += itemTotal;
      }
      if (item.runner_fee) runner += item.runner_fee * item.quantity;
    });
    setStandardTotal(standard);
    setOnOrderTotal(onOrder);
    setDeliveryFeesTotal(delivery);
    setRunnerFeesTotal(runner);
    setHasOnOrderItems(hasOnOrder);
    setTotal(standard + onOrder + delivery);
  }, [cartItems]);

  const formatPrice = (v) =>
    parseFloat(v || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");

  const handleQuantityChange = (id, qty) => updateQuantity(id, qty);

  const handleRemoveItem = (id) => {
    Alert.alert("Remove Item", "Remove this item from your cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeFromCart(id) },
    ]);
  };

  const handleClearCart = () => {
    Alert.alert("Clear Cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: () => clearCart() },
    ]);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) { Alert.alert("Empty Cart", "Your cart is empty."); return; }
    navigation.navigate("Checkout");
  };

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";

  // ── Hero header ───────────────────────────────────────────────────────────
  const Hero = ({ subtitle, onClear }) => (
    <LinearGradient
      colors={["#312E81", "#4F46E5", "#7C3AED"]}
      style={s.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.heroTitle}>Shopping Cart</Text>
        {subtitle ? <Text style={s.heroSub}>{subtitle}</Text> : null}
      </View>
      {onClear && (
        <TouchableOpacity style={s.clearBtn} onPress={onClear}>
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={s.clearTxt}>Clear All</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
        <StatusBar barStyle="light-content" />
        <Hero />
        <View style={s.centerContent}>
          <View style={[s.emptyIcon, { backgroundColor: `${PRIMARY}15` }]}>
            <Ionicons name="cart-outline" size={52} color={PRIMARY} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Login to Use Cart</Text>
          <Text style={[s.emptySub, { color: muted }]}>
            Log in to add items to your cart and make purchases.
          </Text>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          >
            <Text style={s.primaryBtnTxt}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ghostBtn, { borderColor: isDarkMode ? "#374151" : "#E5E7EB" }]}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={[s.ghostBtnTxt, { color: colors.text }]}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
        <StatusBar barStyle="light-content" />
        <Hero />
        <View style={s.centerContent}>
          <View style={[s.emptyIcon, { backgroundColor: `${PRIMARY}15` }]}>
            <Ionicons name="cart-outline" size={52} color={PRIMARY} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Your Cart is Empty</Text>
          <Text style={[s.emptySub, { color: muted }]}>
            Browse products and add items to your cart.
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate("Home")}>
            <Text style={s.primaryBtnTxt}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main cart ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const product  = item.product || item;
    const isOnOrder = product.in_stock === false;
    const lineTotal = isOnOrder
      ? product.price * item.quantity * 0.5
      : product.price * item.quantity;

    return (
      <View style={[s.card, { backgroundColor: surface }]}>
        {/* Product image */}
        <Image
          source={
            product.images?.length > 0
              ? { uri: product.images[0] }
              : product.image
              ? { uri: product.image }
              : require("../../../assets/logo-placeholder.png")
          }
          style={s.productImg}
        />

        <View style={{ flex: 1 }}>
          {/* Name + remove */}
          <View style={s.cardTop}>
            <Text style={[s.productName, { color: colors.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => handleRemoveItem(product.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* On-order badge */}
          {isOnOrder && (
            <View style={s.onOrderBadge}>
              <Ionicons name="time-outline" size={12} color="#D97706" />
              <Text style={s.onOrderTxt}>On Order · 50% Deposit</Text>
            </View>
          )}

          {/* Unit price */}
          <Text style={[s.unitPrice, { color: muted }]}>N${formatPrice(product.price)} each</Text>

          {/* Qty stepper + line total */}
          <View style={s.cardBottom}>
            <View style={[s.stepper, { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6" }]}>
              <TouchableOpacity
                style={[s.stepBtn, item.quantity <= 1 && { opacity: 0.35 }]}
                onPress={() => { if (item.quantity > 1) handleQuantityChange(product.id, item.quantity - 1); }}
              >
                <Ionicons name="remove" size={15} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.stepQty, { color: colors.text }]}>{item.quantity}</Text>
              <TouchableOpacity
                style={s.stepBtn}
                onPress={() => {
                  if (item.quantity < (product.stock_quantity || 999))
                    handleQuantityChange(product.id, item.quantity + 1);
                }}
              >
                <Ionicons name="add" size={15} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.lineTotal, { color: PRIMARY }]}>N${formatPrice(lineTotal)}</Text>
              {isOnOrder && <Text style={[s.depositNote, { color: muted }]}>Deposit</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" />

      <Hero
        subtitle={`${cartItems.length} ${cartItems.length === 1 ? "item" : "items"} in cart`}
        onClear={handleClearCart}
      />

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Cart items */}
        <View style={s.section}>
          {cartItems.map((item) => (
            <View key={(item.product || item).id}>
              {renderItem({ item })}
            </View>
          ))}
        </View>

        {/* Order summary */}
        <View style={[s.summaryCard, { backgroundColor: surface }]}>
          <View style={s.summaryHeader}>
            <Ionicons name="receipt-outline" size={18} color={PRIMARY} />
            <Text style={[s.summaryTitle, { color: colors.text }]}>Order Summary</Text>
          </View>

          {standardTotal > 0 && (
            <SummaryRow label="Standard Items" value={`N$${formatPrice(standardTotal)}`} colors={colors} muted={muted} />
          )}
          {onOrderTotal > 0 && (
            <SummaryRow label="On-Order Items" value={`N$${formatPrice(onOrderTotal)}`} colors={colors} muted={muted} />
          )}
          {deliveryFeesTotal > 0 && (
            <SummaryRow label="Delivery Fee (on delivery)" value={`N$${formatPrice(deliveryFeesTotal)}`} colors={colors} muted={muted} italic />
          )}

          <View style={[s.divider, { backgroundColor: isDarkMode ? "#2C2C3E" : "#E5E7EB" }]} />

          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[s.totalValue, { color: PRIMARY }]}>N${formatPrice(total)}</Text>
          </View>

          <Text style={[s.taxNote, { color: muted }]}>* Taxes calculated at checkout</Text>

          {hasOnOrderItems && (
            <InfoNote text="You're seeing the full price for on-order items. At checkout you can choose to pay 50% deposit or in full." />
          )}
          {runnerFeesTotal > 0 && (
            <InfoNote text="Runner fees are paid upfront. Transport fees will be due upon delivery." />
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Sticky checkout bar ───────────────────────────────────────────── */}
      <View style={[s.checkoutBar, { backgroundColor: surface }]}>
        <View>
          <Text style={[s.barLabel, { color: muted }]}>{cartItems.length} {cartItems.length === 1 ? "item" : "items"}</Text>
          <Text style={[s.barTotal, { color: colors.text }]}>N${formatPrice(total)}</Text>
        </View>
        <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
          <LinearGradient
            colors={["#4F46E5", "#7C3AED"]}
            style={s.checkoutGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.checkoutTxt}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const SummaryRow = ({ label, value, colors, muted, italic }) => (
  <View style={s.summaryRow}>
    <Text style={[s.summaryLabel, { color: muted }, italic && { fontStyle: "italic" }]}>{label}</Text>
    <Text style={[s.summaryValue, { color: colors.text }, italic && { fontStyle: "italic" }]}>{value}</Text>
  </View>
);

const InfoNote = ({ text }) => (
  <View style={s.infoNote}>
    <Ionicons name="information-circle" size={16} color={PRIMARY} />
    <Text style={s.infoTxt}>{text}</Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },

  // Hero
  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroTitle: { fontSize: 22, fontFamily: FONTS.bold, color: "#fff" },
  heroSub:   { fontSize: 12, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  clearTxt: { fontSize: 13, fontFamily: FONTS.medium, color: "#fff" },

  // Empty / auth states
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontFamily: FONTS.bold, textAlign: "center" },
  emptySub:   { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 22 },
  primaryBtn: {
    width: "100%", backgroundColor: PRIMARY, borderRadius: 14,
    height: 52, alignItems: "center", justifyContent: "center",
  },
  primaryBtnTxt: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
  ghostBtn: {
    width: "100%", borderWidth: 1.5, borderRadius: 14,
    height: 52, alignItems: "center", justifyContent: "center",
  },
  ghostBtnTxt: { fontSize: 16, fontFamily: FONTS.medium },

  // Cart items
  section: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  productImg: { width: 82, height: 82, borderRadius: 12, backgroundColor: "#F3F4F6" },
  cardTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  productName: { fontSize: 15, fontFamily: FONTS.semiBold, flex: 1, paddingRight: 8, lineHeight: 20 },
  removeBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
  },
  onOrderBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FEF3C7", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4,
  },
  onOrderTxt: { fontSize: 11, fontFamily: FONTS.medium, color: "#D97706" },
  unitPrice:  { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 10 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 10, overflow: "hidden" },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  stepQty: { paddingHorizontal: 14, fontSize: 15, fontFamily: FONTS.bold },
  lineTotal:   { fontSize: 17, fontFamily: FONTS.bold },
  depositNote: { fontSize: 11, fontFamily: FONTS.regular },

  // Summary
  summaryCard: {
    margin: 16,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  summaryTitle:  { fontSize: 17, fontFamily: FONTS.bold },
  summaryRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel:  { fontSize: 14, fontFamily: FONTS.regular, flex: 1, paddingRight: 10 },
  summaryValue:  { fontSize: 14, fontFamily: FONTS.medium, textAlign: "right" },
  divider:       { height: 1, marginVertical: 16 },
  totalRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel:    { fontSize: 17, fontFamily: FONTS.bold },
  totalValue:    { fontSize: 24, fontFamily: FONTS.bold },
  taxNote:       { fontSize: 12, fontFamily: FONTS.regular, marginTop: 8, fontStyle: "italic" },
  infoNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: `${PRIMARY}10`, borderRadius: 12, padding: 12, marginTop: 14,
  },
  infoTxt: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: "#6B7280", lineHeight: 20 },

  // Checkout bar
  checkoutBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  barLabel: { fontSize: 12, fontFamily: FONTS.regular, marginBottom: 2 },
  barTotal: { fontSize: 20, fontFamily: FONTS.bold },
  checkoutBtn:      { borderRadius: 14, overflow: "hidden", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  checkoutGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 22, height: 50, gap: 8 },
  checkoutTxt:      { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default CartScreen;
