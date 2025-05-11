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
import Button from "../../components/ui/Button";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import EmptyState from "../../components/ui/EmptyState";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { COLORS, FONTS, SHADOWS } from "../../constants/theme";

const CartScreen = ({ navigation }) => {
  const { cartItems, totalAmount, removeFromCart, updateQuantity, clearCart } =
    useCartStore();
  const { user } = useAuthStore();
  const [total, setTotal] = useState(0);
  const [standardTotal, setStandardTotal] = useState(0);
  const [onOrderTotal, setOnOrderTotal] = useState(0);
  const [deliveryFeesTotal, setDeliveryFeesTotal] = useState(0);
  const [runnerFeesTotal, setRunnerFeesTotal] = useState(0);
  const [hasOnOrderItems, setHasOnOrderItems] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const itemAnimations = useRef([]);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Initialize item animations
  useEffect(() => {
    // Create animation values for each cart item
    itemAnimations.current = cartItems.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(50)
    }));
    
    // Run animations in sequence
    const animations = [];
    itemAnimations.current.forEach((anim, index) => {
      animations.push(
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        })
      );
      animations.push(
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        })
      );
    });
    
    // Start all animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      ...animations
    ]).start();
  }, [cartItems.length]);

  // Calculate totals and other cart statistics
  useEffect(() => {
    let standard = 0;
    let onOrder = 0;
    let total = 0;
    let hasOnOrderItems = false;
    let deliveryFees = 0;
    let runnerFees = 0;

    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      if (item.in_stock) {
        standard += itemTotal;
      } else {
        hasOnOrderItems = true;
        
        // Check if product has delivery fee defined
        if (item.delivery_fee) {
          deliveryFees += item.delivery_fee * item.quantity;
        }
        
        // Always use full amount by default (customer can choose 50% deposit later in checkout)
        onOrder += itemTotal;
      }
      
      // Calculate runner fees if applicable
      if (item.runner_fee) {
        runnerFees += item.runner_fee * item.quantity;
      }
    });

    setStandardTotal(standard);
    setOnOrderTotal(onOrder);
    setDeliveryFeesTotal(deliveryFees);
    setRunnerFeesTotal(runnerFees);
    setHasOnOrderItems(hasOnOrderItems);
    setTotal(standard + onOrder + deliveryFees);
  }, [cartItems]);

  const handleQuantityChange = (id, newQuantity) => {
    updateQuantity(id, newQuantity);
  };

  const handleRemoveItem = (id) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromCart(id),
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Your cart is empty.");
      return;
    }

    navigation.navigate("Checkout");
  };

  const formatPrice = (price) => {
    if (!price) return "0.00";
    return parseFloat(price)
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  const renderCartItem = ({ item, index }) => {
    // Make sure we're using the correct item structure
    const product = item.product || item;
    const isOnOrder = product.in_stock === false;
    
    // Get animation values for this item
    const itemAnim = itemAnimations.current[index] || { opacity: new Animated.Value(1), translateY: new Animated.Value(0) };

    return (
      <Animated.View 
        style={[
          styles.cartItemContainer,
          {
            opacity: itemAnim.opacity,
            transform: [{ translateY: itemAnim.translateY }]
          }
        ]}
      >
        <View style={styles.cartItem}>
          <Image
            source={
              product.images && product.images.length > 0
                ? { uri: product.images[0] }
                : product.image
                ? { uri: product.image }
                : require("../../../assets/logo-placeholder.png")
            }
            style={styles.itemImage}
          />

          <View style={styles.itemDetails}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName} numberOfLines={2}>{product.name}</Text>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => handleRemoveItem(product.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {isOnOrder && (
              <View style={styles.onOrderBadge}>
                <Text style={styles.onOrderText}>On Order - 50% Deposit</Text>
              </View>
            )}

            <Text style={styles.itemPrice}>N${formatPrice(product.price)}</Text>

            <View style={styles.itemActions}>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => {
                    if (item.quantity > 1) {
                      handleQuantityChange(product.id, item.quantity - 1);
                    }
                  }}
                >
                  <Ionicons name="remove" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                <Text style={styles.quantityText}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => {
                    if (item.quantity < (product.stock_quantity || 999)) {
                      handleQuantityChange(product.id, item.quantity + 1);
                    }
                  }}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotal}>
                N$
                {formatPrice(
                  isOnOrder
                    ? product.price * item.quantity * 0.5
                    : product.price * item.quantity
                )}
                {isOnOrder && <Text style={styles.depositText}> (Deposit)</Text>}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };


  if (!fontsLoaded) {
    return null;
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <Text style={styles.title}>Shopping Cart</Text>
        </View>

        <View style={styles.loginContainer}>
          <Ionicons
            name="cart"
            size={80}
            color={COLORS.primary}
            style={styles.loginIcon}
          />
          <Text style={styles.loginTitle}>Login to Use Cart</Text>
          <Text style={styles.loginMessage}>
            You need to be logged in to add items to your cart and make
            purchases.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If cart is empty
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <Text style={styles.title}>Shopping Cart</Text>
        </View>
        <EmptyState
          icon="cart"
          title="Your Cart is Empty"
          message="Add items to your cart to see them here"
          actionLabel="Browse Products"
          onAction={() => navigation.navigate("HomeTab")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.title}>Shopping Cart</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            Alert.alert(
              "Clear Cart",
              "Are you sure you want to clear your cart?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear",
                  style: "destructive",
                  onPress: () => clearCart(),
                },
              ]
            );
          }}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.contentContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.cartItemsCount}>
            <Text style={styles.cartItemsCountText}>
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
            </Text>
          </View>
          
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.cartList}
          />

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Standard Items Total</Text>
              <Text style={styles.summaryValue}>
                N${formatPrice(standardTotal)}
              </Text>
            </View>

            {deliveryFeesTotal > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.futureFee]}>
                  Delivery Fee (due on delivery)
                </Text>
                <Text style={[styles.summaryValue, styles.futureFee]}>
                  N${formatPrice(deliveryFeesTotal)}
                </Text>
              </View>
            )}

            {onOrderTotal > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  On-Order Items Total
                </Text>
                <Text style={styles.summaryValue}>
                  N${formatPrice(onOrderTotal)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>N${formatPrice(total)}</Text>
            </View>

            <Text style={styles.taxNote}>
              * Taxes will be calculated at checkout
            </Text>

            {onOrderTotal > 0 && (
              <View style={styles.infoNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.infoNoteText}>
                  You're seeing the full price for on-order items. During checkout,
                  you'll have the option to pay in full or make a 50% deposit.
                </Text>
              </View>
            )}

            {runnerFeesTotal > 0 && (
              <View style={styles.infoNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.infoNoteText}>
                  Runner fees are paid upfront when placing your order.
                  Transport fees will be due upon delivery of your items.
                </Text>
              </View>
            )}
          </View>
          
          {/* Extra space at bottom to ensure all content is visible above the checkout button */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </Animated.View>

      <View style={styles.checkoutContainer}>
        <View style={styles.checkoutSummary}>
          <Text style={styles.checkoutItemsText}>{cartItems.length} items</Text>
          <Text style={styles.checkoutTotalText}>N${formatPrice(total)}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          variant="primary"
          isFullWidth
          onPress={handleCheckout}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafc",
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.small,
  },
  title: {
    fontSize: 22,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}15`,
  },
  clearButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.medium
  },
  cartItemsCount: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cartItemsCountText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  cartList: {
    paddingHorizontal: 20,
  },
  cartItemContainer: {
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flexShrink: 1,
    width: "80%",
    fontFamily: FONTS.semiBold,
    marginBottom: 4,
  },
  removeButton: {
    backgroundColor: "#FF3B30",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.small,
  },
  onOrderBadge: {
    backgroundColor: "#FFF8E1",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  onOrderText: {
    fontSize: 12,
    color: "#FF9800",
    fontFamily: FONTS.medium
  },
  itemPrice: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 10,
    fontFamily: FONTS.medium
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    ...SHADOWS.tiny,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f6fa",
  },
  quantityText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  itemTotal: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.bold
  },
  depositText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: FONTS.regular
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    margin: 20,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  summaryTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 20,
    fontFamily: FONTS.semiBold
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    flex: 1,
    paddingRight: 10,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold
  },
  totalValue: {
    fontSize: 20,
    color: COLORS.primary,
    fontFamily: FONTS.bold
  },
  taxNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    fontStyle: "italic",
    fontFamily: FONTS.regular
  },
  infoNote: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  infoNoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 10,
    flex: 1,
    fontFamily: FONTS.regular
  },
  checkoutContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.medium,
  },
  checkoutSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  checkoutItemsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  checkoutTotalText: {
    fontSize: 18,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loginIcon: {
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: 12,
    fontFamily: FONTS.bold,
  },
  loginMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: FONTS.regular,
  },
  loginButton: {
    width: "100%",
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    ...SHADOWS.small,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  continueButton: {
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  futureFee: {
    color: COLORS.textLight,
    fontStyle: "italic",
  },
});

export default CartScreen;
