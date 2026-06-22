import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import supabase from "../../lib/supabase";
import { enhancedCheckoutService } from "../../services/EnhancedCheckoutService";
import { createDPOToken } from "../../services/DPOService";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import { FONTS } from "../../constants/theme";

const PRIMARY = "#6366F1";

const PaymentMethod = {
  CARD: "card",
  CASH: "cash",
  EWALLET: "ewallet",
  PAY_TO_CELL: "pay_to_cell",
  BANK_TRANSFER: "bank_transfer",
  EASY_WALLET: "easy_wallet",
};

const PaymentTiming = { NOW: "now", LATER: "later" };

const STEPS = ["Delivery", "Timing", "Payment", "Review"];

const DELIVERY_LOCATIONS = [
  { id: "local",       label: "Local (Same Town)", icon: "home" },
  { id: "uptown",      label: "Uptown",             icon: "business" },
  { id: "outoftown",   label: "Out of Town",         icon: "car" },
  { id: "countrywide", label: "Country-Wide",        icon: "globe" },
];

const PAYMENT_METHODS_LIST = [
  { id: PaymentMethod.CARD,          icon: "card",          color: "#1565C0", label: "Credit/Debit Card", desc: "Visa, Mastercard — secure online payment", badge: "DPO" },
  { id: PaymentMethod.CASH,          icon: "cash",          color: "#16A34A", label: "Cash",              desc: "Pay with cash on delivery" },
  { id: PaymentMethod.EWALLET,       icon: "wallet",        color: PRIMARY,   label: "E-Wallet",          desc: "Pay with digital wallet" },
  { id: PaymentMethod.PAY_TO_CELL,   icon: "phone-portrait",color: "#D97706", label: "Pay to Cell",       desc: "Mobile money transfer" },
  { id: PaymentMethod.BANK_TRANSFER, icon: "business",      color: PRIMARY,   label: "Bank Transfer",     desc: "Direct bank transfer" },
  { id: PaymentMethod.EASY_WALLET,   icon: "card",          color: "#9C27B0", label: "Easy Wallet",       desc: "Pay with Easy Wallet" },
];

const CheckoutScreen = ({ navigation }) => {
  const { user }                     = useAuthStore();
  const { cartItems, clearCart }     = useCartStore();
  const { colors }                   = useTheme();
  const { isDarkMode }               = useAppTheme();
  const [loading, setLoading]        = useState(false);
  const [step, setStep]              = useState(1);

  // Saved addresses
  const [savedAddresses, setSavedAddresses]           = useState([]);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("shipping_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .then(({ data }) => {
          const list = data || [];
          setSavedAddresses(list);
          // Auto-fill from default (or first) saved address
          if (list.length > 0) applyAddress(list[0], false);
        });
    }
  }, [user?.id]);

  const applyAddress = (addr, closeModal = true) => {
    const parts = [addr.street, addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean);
    setDeliveryAddress(parts.join(", "));
    if (addr.phone_number) setPhoneNumber(addr.phone_number);
    if (closeModal) setAddressPickerVisible(false);
  };

  // Order details
  const [deliveryAddress, setDeliveryAddress]     = useState("");
  const [paymentMethod, setPaymentMethod]         = useState(null);
  const [paymentTiming, setPaymentTiming]         = useState(null);
  const [phoneNumber, setPhoneNumber]             = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [deliveryLocation, setDeliveryLocation]   = useState("local");
  const [isDepositPayment, setIsDepositPayment]   = useState(false);
  const [paymentProofImage, setPaymentProofImage] = useState(null);

  // Totals
  const [standardTotal, setStandardTotal]         = useState(0);
  const [onOrderTotal, setOnOrderTotal]           = useState(0);
  const [fullOnOrderTotal, setFullOnOrderTotal]   = useState(0);
  const [hasOnOrderItems, setHasOnOrderItems]     = useState(false);
  const [shippingFee, setShippingFee]             = useState(50);
  const [total, setTotal]                         = useState(0);
  const [deliveryFeesTotal, setDeliveryFeesTotal] = useState(0);
  const [runnerFeesTotal, setRunnerFeesTotal]     = useState(0);
  const [transportFeesTotal, setTransportFeesTotal] = useState(0);

  useEffect(() => {
    let standardSum = 0, onOrderSum = 0, hasOnOrder = false;
    let deliveryFees = 0, runnerFees = 0, transportFees = 0, onOrderItemsTotal = 0;

    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      let itemDeliveryFee = 0;
      if (item.in_stock) {
        standardSum += itemTotal;
      } else {
        hasOnOrder = true;
        onOrderItemsTotal += itemTotal;
        switch (deliveryLocation) {
          case "local":       if (item.delivery_fee_local      != null) itemDeliveryFee = item.delivery_fee_local      * item.quantity; break;
          case "uptown":      if (item.delivery_fee_uptown     != null) itemDeliveryFee = item.delivery_fee_uptown     * item.quantity; break;
          case "outoftown":   if (item.delivery_fee_outoftown  != null) itemDeliveryFee = item.delivery_fee_outoftown  * item.quantity; break;
          case "countrywide": if (item.delivery_fee_countrywide!= null) itemDeliveryFee = item.delivery_fee_countrywide* item.quantity; break;
        }
        if (item.free_delivery_threshold > 0 && itemTotal >= item.free_delivery_threshold) itemDeliveryFee = 0;
        deliveryFees += itemDeliveryFee;
      }
      if (item.runner_fee   && !isNaN(item.runner_fee))   runnerFees   += item.runner_fee   * item.quantity;
      if (item.transport_fee && !isNaN(item.transport_fee)) transportFees += item.transport_fee * item.quantity;
    });

    setFullOnOrderTotal(onOrderItemsTotal);
    onOrderSum = isDepositPayment ? onOrderItemsTotal * 0.5 : onOrderItemsTotal;
    setStandardTotal(standardSum);
    setOnOrderTotal(onOrderSum);
    setDeliveryFeesTotal(deliveryFees);
    setRunnerFeesTotal(runnerFees);
    setTransportFeesTotal(transportFees);
    setHasOnOrderItems(hasOnOrder);
    const calc = standardSum + onOrderSum + shippingFee + deliveryFees + runnerFees;
    setTotal(isNaN(calc) ? 0 : calc);
  }, [cartItems, shippingFee, deliveryLocation, isDepositPayment]);

  const formatPrice = (price) => {
    if (isNaN(price) || price == null) return "0.00";
    return price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  const handleSelectPaymentProof = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission Required", "Permission to access camera roll is required!"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled) setPaymentProofImage(result.assets[0]);
    } catch (e) { Alert.alert("Error", "Failed to select image"); }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!deliveryAddress.trim()) { Alert.alert("Missing Information", "Please enter your delivery address."); return; }
      if (!phoneNumber.trim())     { Alert.alert("Missing Information", "Please enter your phone number.");    return; }
      setStep(2);
    } else if (step === 2) {
      if (!paymentTiming) { Alert.alert("Missing Information", "Please choose when you want to pay."); return; }
      setStep(3);
    } else if (step === 3) {
      if (paymentTiming === PaymentTiming.NOW) {
        if (!paymentMethod) { Alert.alert("Missing Information", "Please select a payment method."); return; }
        const proofRequired = paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.CARD;
        if (proofRequired && !paymentProofImage) { Alert.alert("Payment Proof Required", "Please upload a screenshot of your payment proof."); return; }
        if (paymentMethod === PaymentMethod.CARD) { handlePlaceOrder(); return; }
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => { if (step > 1) setStep(step - 1); };

  const handlePlaceOrder = async () => {
    if (!user)             { Alert.alert("Login Required", "You need to login to complete checkout."); return; }
    if (!cartItems.length) { Alert.alert("Empty Cart",     "Your cart is empty.");                     return; }
    setLoading(true);
    try {
      const orderDetails = { deliveryAddress, phoneNumber, deliveryLocation, specialInstructions, isDepositPayment: hasOnOrderItems ? isDepositPayment : false, paymentTiming };
      const finalPaymentMethod = paymentTiming === PaymentTiming.LATER ? "pay_later" : paymentMethod;
      const finalPaymentProof  = paymentTiming === PaymentTiming.LATER ? null : paymentProofImage?.uri;
      const result = await enhancedCheckoutService.processCheckout(cartItems, orderDetails, finalPaymentMethod, finalPaymentProof);
      if (!result.success) throw new Error("Checkout process failed");
      const firstOrder = result.orders[0];
      if (finalPaymentMethod === PaymentMethod.CARD) {
        try {
          const { paymentUrl, transToken } = await createDPOToken(firstOrder.id, result.totalAmount);
          navigation.navigate("DPOWebView", { paymentUrl, transToken, orderId: firstOrder.id, totalAmount: result.totalAmount, isDeposit: hasOnOrderItems ? isDepositPayment : false });
        } catch (dpoError) {
          Alert.alert("Payment Gateway Error", "Could not connect to the payment gateway. Your order has been saved — please try again from your Orders screen.\n\nOrder ID: " + firstOrder.id.slice(0, 8), [{ text: "OK", onPress: () => navigation.navigate("Orders") }]);
        }
        return;
      }
      clearCart();
      navigation.navigate("OrderSuccess", { orderId: firstOrder.id, totalAmount: result.totalAmount, orderCount: result.orders.length, paymentTiming, paymentMethod: finalPaymentMethod });
    } catch (error) {
      if (paymentMethod === PaymentMethod.CARD) { Alert.alert("Error", `Failed to place order: ${error.message}`); return; }
      try { await handleOriginalCheckout(); } catch (e) { Alert.alert("Error", `Failed to place order: ${e.message}`); }
    } finally {
      setLoading(false);
    }
  };

  const handleOriginalCheckout = async () => {
    const shopId = cartItems[0].shop_id;
    if (!shopId) throw new Error("Shop information not found for products");
    const orderData = { buyer_id: user.id, shop_id: shopId, total_amount: total, status: "pending", payment_method: paymentMethod, delivery_address: deliveryAddress, phone_number: phoneNumber, delivery_location: deliveryLocation, special_instructions: specialInstructions, delivery_fee: deliveryFeesTotal, runner_fee: runnerFeesTotal, transport_fee: transportFeesTotal, is_deposit_payment: hasOnOrderItems ? isDepositPayment : false, has_on_order_items: hasOnOrderItems, runner_fees_total: runnerFeesTotal, transport_fees_total: transportFeesTotal, transport_fees_paid: false, payment_status: "unpaid", created_at: new Date().toISOString() };
    const { data: orderResult, error: orderError } = await supabase.from("orders").insert(orderData).select().single();
    if (orderError) throw orderError;
    const orderItems = cartItems.map((item) => ({ order_id: orderResult.id, product_id: item.id, quantity: item.quantity, price: item.price, runner_fee: item.runner_fee || 0, transport_fee: item.transport_fee || 0 }));
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;
    clearCart();
    navigation.navigate("OrderSuccess", { orderId: orderResult.id });
  };

  // ── Theme helpers ─────────────────────────────────────────────────────────
  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const inputBg = isDarkMode ? "#2C2C3E" : "#F3F4F6";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";

  // ── Step 1: Delivery ──────────────────────────────────────────────────────
  const renderDeliveryStep = () => (
    <View style={[s.card, { backgroundColor: surface }]}>
      <FieldLabel text="Delivery Address *" />

      {savedAddresses.length > 0 && (
        <TouchableOpacity style={s.savedPill} onPress={() => setAddressPickerVisible(true)}>
          <Ionicons name="location" size={14} color={PRIMARY} />
          <Text style={s.savedPillTxt}>Use saved address</Text>
        </TouchableOpacity>
      )}

      <InputField
        icon="location-outline"
        value={deliveryAddress}
        onChangeText={setDeliveryAddress}
        placeholder="Enter your delivery address"
        multiline
        colors={colors} inputBg={inputBg} muted={muted}
      />
      {!deliveryAddress && <Text style={s.fieldError}>Delivery address is required</Text>}

      <FieldLabel text="Delivery Location" style={{ marginTop: 8 }} />
      <View style={s.locationGrid}>
        {DELIVERY_LOCATIONS.map((loc) => {
          const active = deliveryLocation === loc.id;
          return (
            <TouchableOpacity
              key={loc.id}
              style={[s.locationChip, { backgroundColor: active ? `${PRIMARY}15` : inputBg }, active && { borderColor: PRIMARY, borderWidth: 1.5 }]}
              onPress={() => setDeliveryLocation(loc.id)}
            >
              <Ionicons name={loc.icon} size={14} color={active ? PRIMARY : muted} />
              <Text style={[s.locationChipTxt, { color: active ? PRIMARY : muted }]}>{loc.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FieldLabel text="Phone Number" />
      <InputField
        icon="call-outline"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
        colors={colors} inputBg={inputBg} muted={muted}
      />

      <FieldLabel text="Special Instructions (Optional)" />
      <InputField
        icon="document-text-outline"
        value={specialInstructions}
        onChangeText={setSpecialInstructions}
        placeholder="Any special delivery instructions"
        multiline
        numberOfLines={3}
        colors={colors} inputBg={inputBg} muted={muted}
      />
    </View>
  );

  // ── Step 2: Payment Timing ────────────────────────────────────────────────
  const renderPaymentTimingStep = () => (
    <View style={[s.card, { backgroundColor: surface }]}>
      <Text style={[s.cardTitle, { color: colors.text }]}>When would you like to pay?</Text>
      <Text style={[s.cardSubtitle, { color: muted }]}>Choose when you want to complete your payment.</Text>

      <TimingOption
        icon="card" iconColor="#16A34A" bgColor="#DCFCE7"
        title="Pay Now" desc="Complete payment immediately — order processed right away."
        benefits={["Immediate order processing", "Faster delivery", "Order confirmation"]}
        selected={paymentTiming === PaymentTiming.NOW}
        onPress={() => setPaymentTiming(PaymentTiming.NOW)}
        colors={colors} muted={muted} isDarkMode={isDarkMode}
      />
      <TimingOption
        icon="time" iconColor="#D97706" bgColor="#FEF3C7"
        title="Pay Later" desc="Place your order now and pay when it's ready for delivery."
        benefits={["No immediate payment", "Pay on delivery", "Flexible options"]}
        selected={paymentTiming === PaymentTiming.LATER}
        onPress={() => setPaymentTiming(PaymentTiming.LATER)}
        colors={colors} muted={muted} isDarkMode={isDarkMode}
      />

      {paymentTiming === PaymentTiming.LATER && (
        <InfoNote text={'With "Pay Later", your order will be held until payment is completed. Pay via cash on delivery or any digital payment method when ready.'} color="#D97706" bg={isDarkMode ? "rgba(217,119,6,0.15)" : "#FEF3C7"} />
      )}
    </View>
  );

  // ── Step 3: Payment Method ────────────────────────────────────────────────
  const renderPaymentStep = () => {
    if (paymentTiming === PaymentTiming.LATER) {
      return (
        <View style={[s.card, { backgroundColor: surface }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Payment — Pay Later</Text>
          <View style={s.payLaterCenter}>
            <View style={[s.payLaterIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time" size={40} color="#D97706" />
            </View>
            <Text style={[s.payLaterTitle, { color: colors.text }]}>Payment Deferred</Text>
            <Text style={[s.payLaterDesc, { color: muted }]}>
              You've chosen to pay later. Your order will be processed and you can pay when it's ready for delivery using any of the following methods:
            </Text>
            <View style={[s.payLaterMethods, { backgroundColor: inputBg }]}>
              {["Cash on Delivery","E-Wallet","Pay to Cell","Bank Transfer","Easy Wallet"].map((m) => (
                <View key={m} style={s.payLaterMethodRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={[s.payLaterMethodTxt, { color: colors.text }]}>{m}</Text>
                </View>
              ))}
            </View>
            <InfoNote text="We'll notify you when your order is ready for delivery and payment." color="#D97706" bg={isDarkMode ? "rgba(217,119,6,0.15)" : "#FEF3C7"} />
          </View>
        </View>
      );
    }

    return (
      <View style={[s.card, { backgroundColor: surface }]}>
        <Text style={[s.cardTitle, { color: colors.text }]}>Payment Method</Text>
        <Text style={[s.cardSubtitle, { color: muted }]}>
          Choose how you want to pay right now.{hasOnOrderItems && " For on-order items, only a 50% deposit is charged today."}
        </Text>

        {PAYMENT_METHODS_LIST.map((pm) => {
          const active = paymentMethod === pm.id;
          return (
            <TouchableOpacity
              key={pm.id}
              style={[s.paymentCard, { backgroundColor: active ? `${PRIMARY}10` : inputBg }, active && { borderColor: PRIMARY, borderWidth: 1.5 }]}
              onPress={() => setPaymentMethod(pm.id)}
              activeOpacity={0.85}
            >
              <View style={[s.paymentIconWrap, { backgroundColor: `${pm.color}18` }]}>
                <Ionicons name={pm.icon} size={22} color={pm.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[s.paymentCardTitle, { color: colors.text }]}>{pm.label}</Text>
                  {pm.badge && <View style={s.dpoBadge}><Text style={s.dpoBadgeTxt}>{pm.badge}</Text></View>}
                </View>
                <Text style={[s.paymentCardDesc, { color: muted }]}>{pm.desc}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={PRIMARY} />}
            </TouchableOpacity>
          );
        })}

        {/* Payment proof upload */}
        {paymentMethod && paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.CARD && (
          <View style={[s.proofSection, { backgroundColor: inputBg }]}>
            <Text style={[s.proofTitle, { color: colors.text }]}>Payment Proof Required</Text>
            <Text style={[s.proofDesc, { color: muted }]}>Upload a screenshot of your payment confirmation</Text>
            {!paymentProofImage ? (
              <TouchableOpacity style={s.uploadBtn} onPress={handleSelectPaymentProof}>
                <Ionicons name="cloud-upload-outline" size={24} color={PRIMARY} />
                <Text style={s.uploadBtnTxt}>Upload Payment Proof</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ alignItems: "center" }}>
                <Image source={{ uri: paymentProofImage.uri }} style={s.proofImg} />
                <TouchableOpacity style={s.removeProofBtn} onPress={() => setPaymentProofImage(null)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: FONTS.medium }}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {hasOnOrderItems && (
          <InfoNote text={runnerFeesTotal > 0 ? "Runner fees are paid upfront while transport fees will be due on delivery." : "Your order contains on-order items. You can pay in full or pay a 50% deposit now."} color="#D97706" bg={isDarkMode ? "rgba(217,119,6,0.15)" : "#FEF3C7"} />
        )}

        {hasOnOrderItems && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={[s.depositTitle, { color: colors.text }]}>Payment Option for On-Order Items:</Text>
            {[false, true].map((isDeposit) => (
              <TouchableOpacity
                key={String(isDeposit)}
                style={[s.depositOption, { backgroundColor: inputBg }, isDepositPayment === isDeposit && { backgroundColor: `${PRIMARY}10`, borderColor: PRIMARY, borderWidth: 1.5 }]}
                onPress={() => setIsDepositPayment(isDeposit)}
              >
                <Ionicons name={isDepositPayment === isDeposit ? "radio-button-on" : "radio-button-off"} size={22} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.depositOptionTitle, { color: colors.text }]}>{isDeposit ? "Pay 50% Deposit" : "Pay Full Amount"}</Text>
                  <Text style={[s.depositOptionDesc, { color: muted }]}>{isDeposit ? "Pay 50% now, rest on delivery" : "Pay the entire amount now"}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Step 4: Review ────────────────────────────────────────────────────────
  const renderReviewStep = () => (
    <View style={[s.card, { backgroundColor: surface }]}>
      <Text style={[s.cardTitle, { color: colors.text }]}>Review Your Order</Text>

      <ReviewSection title="Delivery Information" onEdit={() => setStep(1)} inputBg={inputBg} colors={colors}>
        <ReviewRow label="Address" value={deliveryAddress} colors={colors} muted={muted} />
        <ReviewRow label="Phone"   value={phoneNumber}     colors={colors} muted={muted} />
        {specialInstructions.trim() && <ReviewRow label="Notes" value={specialInstructions} colors={colors} muted={muted} />}
      </ReviewSection>

      <ReviewSection title="Payment Method" onEdit={() => setStep(3)} inputBg={inputBg} colors={colors}>
        <ReviewRow
          label="Method"
          value={
            paymentTiming === PaymentTiming.LATER ? "Pay Later" :
            paymentMethod === PaymentMethod.CARD          ? "Credit/Debit Card (DPO)" :
            paymentMethod === PaymentMethod.CASH          ? "Cash" :
            paymentMethod === PaymentMethod.EWALLET       ? "E-Wallet" :
            paymentMethod === PaymentMethod.PAY_TO_CELL   ? "Pay to Cell" :
            paymentMethod === PaymentMethod.BANK_TRANSFER ? "Bank Transfer" :
            paymentMethod === PaymentMethod.EASY_WALLET   ? "Easy Wallet" : ""
          }
          colors={colors} muted={muted}
        />
        {paymentProofImage && <ReviewRow label="Proof" value="Uploaded ✓" colors={colors} muted={muted} />}
      </ReviewSection>

      <ReviewSection title="Order Summary" onEdit={null} inputBg={inputBg} colors={colors}>
        {standardTotal > 0 && <ReviewRow label={`Items (${cartItems.length})`} value={`N$${formatPrice(standardTotal)}`} colors={colors} muted={muted} />}
        {runnerFeesTotal > 0 && <ReviewRow label="Runner Fees" value={`N$${formatPrice(runnerFeesTotal)}`} colors={colors} muted={muted} />}
        {onOrderTotal > 0 && <ReviewRow label={isDepositPayment ? "On-Order Deposit (50%)" : "On-Order Items"} value={`N$${formatPrice(onOrderTotal)}`} colors={colors} muted={muted} />}
        <ReviewRow label="Shipping" value={`N$${formatPrice(shippingFee)}`} colors={colors} muted={muted} />

        <View style={[s.totalRow, { borderTopColor: isDarkMode ? "#2C2C3E" : "#E5E7EB" }]}>
          <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[s.totalValue, { color: PRIMARY }]}>N${formatPrice(total)}</Text>
        </View>

        {transportFeesTotal > 0 && (
          <ReviewRow label="Transport (on delivery)" value={`N$${formatPrice(transportFeesTotal)}`} colors={colors} muted={muted} italic />
        )}

        {hasOnOrderItems && (
          <InfoNote
            text={isDepositPayment
              ? `You're paying a 50% deposit. Remaining N$${formatPrice(fullOnOrderTotal - onOrderTotal)} due when items arrive.`
              : "You're paying in full for on-order items."}
            color="#D97706" bg={isDarkMode ? "rgba(217,119,6,0.15)" : "#FEF3C7"}
          />
        )}
      </ReviewSection>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderDeliveryStep();
      case 2: return renderPaymentTimingStep();
      case 3: return renderPaymentStep();
      case 4: return renderReviewStep();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} style={s.flex} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>

        {/* ── Gradient hero with stepper ──────────────────────────────────── */}
        <LinearGradient colors={["#312E81", "#4F46E5", "#7C3AED"]} style={s.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.heroTop}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.heroTitle}>Checkout</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Stepper */}
          <View style={s.stepper}>
            {STEPS.map((label, i) => {
              const n       = i + 1;
              const done    = step > n;
              const current = step === n;
              return (
                <React.Fragment key={label}>
                  <View style={s.stepItem}>
                    <View style={[s.stepCircle, done ? s.stepCircleDone : current ? s.stepCircleActive : s.stepCircleOff]}>
                      {done
                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                        : <Text style={[s.stepNum, { color: current ? "#4F46E5" : "rgba(255,255,255,0.5)" }]}>{n}</Text>
                      }
                    </View>
                    <Text style={[s.stepLabel, { color: current ? "#fff" : done ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }]}>{label}</Text>
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[s.stepLine, step > n && s.stepLineOn]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </LinearGradient>

        {/* ── Step content ────────────────────────────────────────────────── */}
        <ScrollView style={s.flex} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={{ padding: 16 }}>
            {renderStep()}
          </View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={[s.footer, { backgroundColor: surface }]}>
          {step > 1 && (
            <TouchableOpacity
              style={[s.backFooterBtn, { borderColor: isDarkMode ? "#374151" : "#E5E7EB" }]}
              onPress={handlePrevStep}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[s.backFooterTxt, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.continueBtn, loading && { opacity: 0.7 }, step === 1 && { flex: 1 }]}
            onPress={step < 4 ? handleNextStep : handlePlaceOrder}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={s.continueGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Text style={s.continueTxt}>{step < 4 ? "Continue" : "Place Order"}</Text>
                    <Ionicons name={step < 4 ? "arrow-forward" : "checkmark"} size={18} color="#fff" />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Address picker modal ─────────────────────────────────────────── */}
      <Modal visible={addressPickerVisible} transparent animationType="slide" onRequestClose={() => setAddressPickerVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: surface }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Saved Addresses</Text>
              <TouchableOpacity onPress={() => setAddressPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[s.addrCard, { backgroundColor: isDarkMode ? "#2C2C3E" : "#F8FAFC" }, addr.is_default && { borderWidth: 1.5, borderColor: PRIMARY }]}
                  onPress={() => applyAddress(addr)}
                >
                  <View style={[s.addrIcon, { backgroundColor: `${PRIMARY}15` }]}>
                    <Ionicons name="location" size={18} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[s.addrName, { color: colors.text }]}>{addr.full_name}</Text>
                      {addr.is_default && <View style={s.defaultBadge}><Text style={s.defaultBadgeTxt}>Default</Text></View>}
                    </View>
                    <Text style={[s.addrStreet, { color: muted }]}>{[addr.street, addr.city, addr.state].filter(Boolean).join(", ")}</Text>
                    <Text style={[s.addrPhone, { color: isDarkMode ? "#6B7280" : "#9CA3AF" }]}>{addr.phone_number}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Small reusable components ────────────────────────────────────────────────
const FieldLabel = ({ text, style }) => (
  <Text style={[{ fontSize: 13, fontFamily: FONTS.medium, color: "#6B7280", marginBottom: 6, marginTop: 12 }, style]}>{text}</Text>
);

const InputField = ({ icon, colors, inputBg, muted, ...props }) => (
  <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, minHeight: 50, backgroundColor: inputBg }, props.multiline && { alignItems: "flex-start", paddingTop: 14 }]}>
    <Ionicons name={icon} size={18} color={muted} style={props.multiline && { marginTop: 2 }} />
    <TextInput
      style={{ flex: 1, fontSize: 15, fontFamily: FONTS.regular, color: colors.text, paddingVertical: props.multiline ? 0 : 0 }}
      placeholderTextColor={muted}
      {...props}
    />
  </View>
);

const TimingOption = ({ icon, iconColor, bgColor, title, desc, benefits, selected, onPress, colors, muted, isDarkMode }) => (
  <TouchableOpacity
    style={[{ flexDirection: "row", alignItems: "flex-start", gap: 14, borderRadius: 14, padding: 16, marginBottom: 12, backgroundColor: isDarkMode ? "#2C2C3E" : "#F9FAFB" }, selected && { backgroundColor: `${PRIMARY}10`, borderWidth: 1.5, borderColor: PRIMARY }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={[{ width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={26} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: colors.text, marginBottom: 4 }}>{title}</Text>
      <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: muted, marginBottom: 8, lineHeight: 19 }}>{desc}</Text>
      {benefits.map((b) => (
        <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Ionicons name="checkmark-circle" size={14} color={iconColor} />
          <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: muted }}>{b}</Text>
        </View>
      ))}
    </View>
    {selected && <Ionicons name="checkmark-circle" size={22} color={PRIMARY} style={{ marginTop: 2 }} />}
  </TouchableOpacity>
);

const InfoNote = ({ text, color, bg }) => (
  <View style={[{ flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, padding: 12, marginTop: 12 }, { backgroundColor: bg }]}>
    <Ionicons name="information-circle" size={18} color={color} style={{ marginTop: 1 }} />
    <Text style={{ flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: "#6B7280", lineHeight: 19 }}>{text}</Text>
  </View>
);

const ReviewSection = ({ title, onEdit, inputBg, colors, children }) => (
  <View style={[{ borderRadius: 14, padding: 16, marginBottom: 12, position: "relative" }, { backgroundColor: inputBg }]}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: colors.text }}>{title}</Text>
      {onEdit && <TouchableOpacity onPress={onEdit}><Text style={{ fontSize: 13, fontFamily: FONTS.medium, color: PRIMARY }}>Edit</Text></TouchableOpacity>}
    </View>
    {children}
  </View>
);

const ReviewRow = ({ label, value, colors, muted, italic }) => (
  <View style={{ flexDirection: "row", marginBottom: 8 }}>
    <Text style={[{ width: 110, fontSize: 13, fontFamily: FONTS.regular, color: muted }, italic && { fontStyle: "italic" }]}>{label}:</Text>
    <Text style={[{ flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: colors.text }, italic && { fontStyle: "italic" }]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },

  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepCircleActive: { backgroundColor: "#ffffff" },
  stepCircleDone:   { backgroundColor: "rgba(255,255,255,0.35)" },
  stepCircleOff:    { backgroundColor: "rgba(255,255,255,0.2)" },
  stepNum:   { fontSize: 13, fontFamily: FONTS.bold, color: "#fff" },
  stepLabel: { fontSize: 10, fontFamily: FONTS.medium, color: "#fff" },
  stepLine:  { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.25)", marginHorizontal: 4, marginBottom: 16 },
  stepLineOn: { backgroundColor: "rgba(255,255,255,0.8)" },

  card: { borderRadius: 18, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  cardTitle:    { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 16, lineHeight: 20 },

  savedPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: `${PRIMARY}12`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4, marginBottom: 8 },
  savedPillTxt: { fontSize: 13, fontFamily: FONTS.medium, color: PRIMARY },
  fieldError: { color: "#EF4444", fontSize: 12, fontFamily: FONTS.regular, marginTop: 4 },

  locationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  locationChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  locationChipTxt: { fontSize: 13, fontFamily: FONTS.medium },

  paymentCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  paymentIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  paymentCardTitle: { fontSize: 15, fontFamily: FONTS.bold },
  paymentCardDesc:  { fontSize: 13, fontFamily: FONTS.regular, marginTop: 2 },
  dpoBadge: { backgroundColor: "#1565C0", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  dpoBadgeTxt: { color: "#fff", fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 },

  proofSection: { borderRadius: 14, padding: 16, marginTop: 8 },
  proofTitle:   { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 4 },
  proofDesc:    { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 12 },
  uploadBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: PRIMARY, borderStyle: "dashed", borderRadius: 12, paddingVertical: 16 },
  uploadBtnTxt: { color: PRIMARY, fontSize: 15, fontFamily: FONTS.bold },
  proofImg:     { width: "100%", height: 160, borderRadius: 12, marginBottom: 8 },
  removeProofBtn: { flexDirection: "row", alignItems: "center", gap: 6 },

  depositTitle:       { fontSize: 14, fontFamily: FONTS.bold },
  depositOption:      { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 14 },
  depositOptionTitle: { fontSize: 15, fontFamily: FONTS.bold },
  depositOptionDesc:  { fontSize: 13, fontFamily: FONTS.regular, marginTop: 2 },

  payLaterCenter:     { alignItems: "center", paddingVertical: 8, gap: 12 },
  payLaterIcon:       { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  payLaterTitle:      { fontSize: 18, fontFamily: FONTS.bold, textAlign: "center" },
  payLaterDesc:       { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 22 },
  payLaterMethods:    { width: "100%", borderRadius: 14, padding: 16, gap: 10 },
  payLaterMethodRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  payLaterMethodTxt:  { fontSize: 14, fontFamily: FONTS.medium },

  totalRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 12, marginTop: 8, marginBottom: 4 },
  totalLabel: { fontSize: 16, fontFamily: FONTS.bold },
  totalValue: { fontSize: 20, fontFamily: FONTS.bold },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 24, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  backFooterBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 14, height: 50, paddingHorizontal: 18 },
  backFooterTxt: { fontSize: 15, fontFamily: FONTS.medium },
  continueBtn:   { flex: 2, borderRadius: 14, overflow: "hidden", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  continueGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, gap: 8 },
  continueTxt:  { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },

  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "75%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitle:  { fontSize: 18, fontFamily: FONTS.bold },

  addrCard:   { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, marginBottom: 10 },
  addrIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addrName:   { fontSize: 14, fontFamily: FONTS.bold },
  addrStreet: { fontSize: 13, fontFamily: FONTS.regular, marginTop: 2 },
  addrPhone:  { fontSize: 12, fontFamily: FONTS.regular, marginTop: 1 },
  defaultBadge:    { backgroundColor: "#22C55E", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeTxt: { fontSize: 10, fontFamily: FONTS.bold, color: "#fff" },
});

export default CheckoutScreen;
