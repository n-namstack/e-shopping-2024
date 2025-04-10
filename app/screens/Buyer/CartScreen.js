import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
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
import { FONTS } from "../../constants/theme";

const CartScreen = ({ navigation }) => {
  const { cartItems, totalAmount, removeFromCart, updateQuantity, clearCart } =
    useCartStore();
  const { user } = useAuthStore();
  const [total, setTotal] = useState(0);
  const [standardTotal, setStandardTotal] = useState(0);
  const [onOrderTotal, setOnOrderTotal] = useState(0);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Calculate totals when cart changes
  useEffect(() => {
    let standardSum = 0;
    let onOrderSum = 0;

    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      if (item.in_stock) {
        standardSum += itemTotal;
      } else {
        // For on-order items, we only calculate 50% deposit
        onOrderSum += itemTotal * 0.5;
      }
    });

    setStandardTotal(standardSum);
    setOnOrderTotal(onOrderSum);
    setTotal(standardSum + onOrderSum);
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

  const renderCartItem = ({ item }) => {
    // Make sure we're using the correct item structure
    const product = item.product || item;
    const isOnOrder = product.in_stock === false;

    return (
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
            <Text style={styles.itemName}>{product.name}</Text>
            <TouchableOpacity onPress={() => handleRemoveItem(product.id)}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
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
                <Ionicons name="remove" size={18} color="#666" />
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
                <Ionicons name="add" size={18} color="#666" />
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
    );
  };


  if (!fontsLoaded) {
    return null;
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shopping Cart</Text>
        </View>

        <View style={styles.loginContainer}>
          <Ionicons
            name="cart"
            size={64}
            color="#007AFF"
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
      <ScrollView>
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

          {onOrderTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                On-Order Items Deposit (50%)
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
            <View style={styles.onOrderNote}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#FF9800"
              />
              <Text style={styles.onOrderNoteText}>
                On-order items require a 50% deposit now, with the remaining
                balance due when the items arrive.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.checkoutContainer}>
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
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    // fontWeight: "bold",
    color: "#333",
    fontFamily: FONTS.bold
  },
  clearButton: {
    padding: 6,
  },
  clearButtonText: {
    color: "#FF3B30",
    fontSize: 14,
    // fontWeight: "500",
    fontFamily: FONTS.medium
  },
  cartList: {
    paddingBottom: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flexShrink: 1,
    width: "85%",
    fontFamily: FONTS.semiBold
  },
  onOrderBadge: {
    backgroundColor: "#FFF9C4",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  onOrderText: {
    fontSize: 12,
    color: "#F57C00",
    fontFamily: FONTS.medium
  },
  itemPrice: {
    fontSize: 15,
    color: "#666",
    marginBottom: 8,
    fontFamily: FONTS.medium
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    overflow: "hidden",
  },
  quantityBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  quantityText: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: FONTS.semiBold
  },
  itemTotal: {
    fontSize: 16,
    color: "#007AFF",
    fontFamily: FONTS.bold
  },
  depositText: {
    fontSize: 12,
    color: "#888",
    fontFamily:FONTS.regular
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    color: "#333",
    marginBottom: 16,
    fontFamily: FONTS.semiBold
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    fontFamily: FONTS.regular
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontFamily: FONTS.medium
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: "#333",
    fontFamily: FONTS.semiBold
  },
  totalValue: {
    fontSize: 18,
    color: "#007AFF",
    fontFamily: FONTS.bold
  },
  taxNote: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
    fontStyle: "italic",
    fontFamily: FONTS.regular
  },
  onOrderNote: {
    flexDirection: "row",
    backgroundColor: "#FFF9C4",
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  onOrderNoteText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    flex: 1,
    fontFamily: FONTS.regular
  },
  checkoutContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loginIcon: {
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  loginMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  loginButton: {
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 6,
    marginBottom: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  continueButton: {
    padding: 12,
    backgroundColor: "#666",
    borderRadius: 6,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default CartScreen;
