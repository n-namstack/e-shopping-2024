import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
<<<<<<< HEAD
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import supabase from '../../lib/supabase';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import CommentSection from '../../components/common/CommentSection';
import CommentModal from '../../components/common/CommentModal';
=======
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
>>>>>>> 612e743d63c43e980cf4000444158aa685075b5a

if (__DEV__) {
  console.warn = () => {};
}

const OrderDetailsScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
<<<<<<< HEAD
  const [commentModalVisible, setCommentModalVisible] = useState(false);
=======
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
>>>>>>> 612e743d63c43e980cf4000444158aa685075b5a

  useEffect(() => {
    console.log("Fetching order with ID:", orderId);
    fetchOrderDetails();
    markNotificationAsRead();
  }, []);

  const markNotificationAsRead = async () => {
    try {
      // First get the notification for this order
      const { data: notifications, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("order_id", orderId)
        .eq("read", false);

      if (fetchError) {
        console.error("Error fetching notification:", fetchError.message);
        return;
      }

      // If there's an unread notification for this order, mark it as read
      if (notifications && notifications.length > 0) {
        const { error: updateError } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("order_id", orderId)
          .eq("read", false);

        if (updateError) {
          console.error(
            "Error marking notification as read:",
            updateError.message
          );
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error.message);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First check if the order exists
      const { data: orderExists, error: existsError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId);

      if (existsError) {
        console.error("Error checking if order exists:", existsError.message);
        throw existsError;
      }

      if (!orderExists || orderExists.length === 0) {
        console.error("No order found with ID:", orderId);
        setError(`Order #${orderId} not found`);
        setIsLoading(false);
        return;
      }

      // Now fetch the full order details
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items(
            *,
            product:product_id(
              id,
              name,
              images,
              price,
              category
            )
          ),
          buyer:buyer_id(
            id,
            email
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (fetchError) {
        console.error("Error fetching order details:", fetchError.message);
        throw fetchError;
      }

      if (!data) {
        console.error("No data returned after successful query");
        setError("Order data could not be loaded");
        return;
      }

      console.log("Order data fetched successfully:", data.id);
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order details:", error.message);
      setError(`Failed to load order details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const updateData = { status: newStatus };

      // If the order is being marked as delivered or completed, also update payment_status
      if (newStatus === "delivered" || newStatus === "completed") {
        updateData.payment_status = "paid";
      }

      // Update in database
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrder({
        ...order,
        status: newStatus,
        ...(updateData.payment_status && {
          payment_status: updateData.payment_status,
        }),
      });

      Alert.alert("Success", `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error.message);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const showStatusActionSheet = () => {
    const options = [];
    const actions = [];

    switch (order.status) {
      case "pending":
        options.push("Accept Order", "Reject Order");
        actions.push(
          () => handleUpdateStatus("processing"),
          () => handleUpdateStatus("cancelled")
        );
        break;
      case "processing":
        options.push("Mark as Shipped");
        actions.push(() => handleUpdateStatus("shipped"));
        break;
      case "shipped":
        options.push("Mark as Delivered");
        actions.push(() => handleUpdateStatus("delivered"));
        break;
      default:
        break;
    }

    if (options.length === 0) {
      // No actions available for current status
      return;
    }

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return (
          <MaterialIcons name="hourglass-bottom" size={20} color="#FF9800" />
        );
      case "processing":
        return <MaterialIcons name="sync" size={20} color="#2196F3" />;
      case "shipped":
        return (
          <MaterialIcons name="local-shipping" size={20} color="#9C27B0" />
        );
      case "delivered":
        return <MaterialIcons name="check-circle" size={20} color="#4CAF50" />;
      case "cancelled":
        return <MaterialIcons name="cancel" size={20} color="#F44336" />;
      default:
        return <MaterialIcons name="help" size={20} color="#757575" />;
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const getPaymentStatusUI = (paymentStatus) => {
    switch (paymentStatus) {
      case "paid":
        return (
          <View style={styles.paymentStatusPaid}>
            <MaterialIcons name="payments" size={14} color="#4CAF50" />
            <Text style={styles.paymentStatusTextPaid}>Paid</Text>
          </View>
        );
      case "pending":
        return (
          <View style={styles.paymentStatusPending}>
            <MaterialIcons name="payment" size={14} color="#FF9800" />
            <Text style={styles.paymentStatusTextPending}>Payment Pending</Text>
          </View>
        );
      default:
        return (
          <View style={styles.paymentStatusUnknown}>
            <MaterialIcons name="help-outline" size={14} color="#757575" />
            <Text style={styles.paymentStatusTextUnknown}>
              Payment Status Unknown
            </Text>
          </View>
        );
    }
  };

  const getPaymentMethodUI = (method) => {
    switch (method) {
      case "card":
      case "credit_card":
        return (
          <View style={styles.paymentMethodContainer}>
            <MaterialIcons
              name="credit-card"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.paymentMethodText}>Credit Card</Text>
          </View>
        );
      case "cash":
        return (
          <View style={styles.paymentMethodContainer}>
            <MaterialIcons
              name="payments"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.paymentMethodText}>Cash</Text>
          </View>
        );
      default:
        return (
          <View style={styles.paymentMethodContainer}>
            <MaterialIcons
              name="help-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.paymentMethodText}>
              Payment Method Not Specified
            </Text>
          </View>
        );
    }
  };

  // Add a contact buyer function
  const handleContactBuyer = () => {
    // Ensure we have the buyer information
    if (!order?.buyer) {
      Alert.alert('Error', 'Buyer information not available');
      return;
    }

    const buyerId = order.buyer.id;
    const buyerName = `${order.buyer.firstname || ''} ${order.buyer.lastname || ''}`.trim() || order.buyer.username || 'Buyer';
    const buyerImage = order.buyer.profile_image;

    // Navigate to the chat screen
    navigation.navigate('MessagesTab', {
      screen: 'ChatDetail',
      params: {
        recipientId: buyerId,
        recipientName: buyerName,
        recipientImage: buyerImage,
        recipientRole: 'buyer'
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <LinearGradient
          colors={["rgba(244, 67, 54, 0.1)", "rgba(244, 67, 54, 0.05)"]}
          style={styles.errorIconContainer}
        >
          <MaterialIcons name="error-outline" size={60} color="#F44336" />
        </LinearGradient>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error || "Order not found"}</Text>
        <TouchableOpacity
          style={styles.errorBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Order #{order.id.toString().substring(0, 8)}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={[
              getStatusColor(order.status) + "20",
              getStatusColor(order.status) + "05",
            ]}
            style={styles.statusCardGradient}
          >
            <View style={styles.statusCardContent}>
              <View style={styles.statusIconContainer}>
                {getStatusIcon(order.status)}
              </View>

              <View style={styles.statusTextContainer}>
                <Text
                  style={[
                    styles.statusTitle,
                    { color: getStatusColor(order.status) },
                  ]}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
                <Text style={styles.statusDate}>
                  Order placed on {formatDate(order.created_at)}
                </Text>
              </View>

              {/* Update Status Button (if not in final state) */}
              {!["delivered", "cancelled"].includes(order.status) && (
                <TouchableOpacity
                  style={styles.updateStatusButton}
                  onPress={showStatusActionSheet}
                >
                  <Text style={styles.updateStatusText}>Update</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Payment Information</Text>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.paymentStatusContainer}>
              {getPaymentStatusUI(order.payment_status)}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method:</Text>
              {getPaymentMethodUI(order.payment_method)}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction ID:</Text>
              <Text style={styles.infoValue}>
                {order.transaction_id || "Not available"}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>

          <View style={styles.sectionContent}>
<<<<<<< HEAD
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer:</Text>
              <Text style={styles.infoValue}>
                {order.buyer ? `${order.buyer.firstname} ${order.buyer.lastname}` : 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>
                {order.buyer?.email || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>
                {order.buyer?.cellphone_no || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.customerActions}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactBuyer}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contact Buyer</Text>
              </TouchableOpacity>
=======
            <View style={styles.customerCard}>
              <View style={styles.customerAvatar}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {order.buyer?.email?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>
              </View>

              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  Customer #{order.buyer_id?.substring(0, 8) || "Unknown"}
                </Text>

                {order.buyer?.email && (
                  <View style={styles.contactItem}>
                    <MaterialIcons
                      name="email"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.contactText}>{order.buyer.email}</Text>
                  </View>
                )}
              </View>
>>>>>>> 612e743d63c43e980cf4000444158aa685075b5a
            </View>
          </View>
        </View>

        {/* Shipping Information */}
        {order.shipping_address && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="local-shipping"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Shipping Information</Text>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.addressCard}>
                <MaterialIcons
                  name="location-on"
                  size={22}
                  color={COLORS.accent}
                  style={styles.addressIcon}
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressText}>
                    {order.shipping_address}
                  </Text>

                  {order.tracking_number && (
                    <View style={styles.trackingInfo}>
                      <Text style={styles.trackingLabel}>Tracking #:</Text>
                      <Text style={styles.trackingNumber}>
                        {order.tracking_number}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="shopping-cart"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.sectionTitle}>Order Items</Text>
          </View>

          <View style={styles.sectionContent}>
            {order.order_items.map((item) => {
              // Determine price from various possible sources
              const itemPrice =
                item.price ||
                item.unit_price ||
                (item.product && item.product.price) ||
                0;

              return (
                <View key={item.id} style={styles.orderItem}>
                  {/* Product Image */}
                  <View style={styles.productImageContainer}>
                    {item.product?.images && item.product.images.length > 0 ? (
                      <Image
                        source={{ uri: item.product.images[0] }}
                        style={styles.productImage}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <MaterialIcons
                          name="image-not-supported"
                          size={24}
                          color="#BBBBBB"
                        />
                      </View>
                    )}
                  </View>

                  {/* Product Info */}
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.productName}>
                      {item.product?.name || "Unknown Product"}
                    </Text>
                    <Text style={styles.productCategory}>
                      {item.product?.category || ""}
                    </Text>

                    <View style={styles.orderItemDetails}>
                      <Text style={styles.productPrice}>
                        {formatCurrency(itemPrice)}
                      </Text>
                      <Text style={styles.productQuantity}>
                        Qty: {item.quantity}
                      </Text>
                    </View>
                  </View>

                  {/* Subtotal */}
                  <View style={styles.subtotalContainer}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>
                      {formatCurrency(itemPrice * item.quantity)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
<<<<<<< HEAD
        
        {/* Separator */}
        <View style={styles.separator} />

        {/* Order Communication Button */}
        <TouchableOpacity 
          style={styles.commentButton}
          onPress={() => setCommentModalVisible(true)}
        >
          <MaterialIcons name="chat" size={20} color={COLORS.primary} />
          <Text style={styles.commentButtonText}>Message Buyer</Text>
        </TouchableOpacity>
        
        {/* Comment Modal */}
        <CommentModal
          type="order"
          itemId={order.id}
          visible={commentModalVisible}
          onClose={() => setCommentModalVisible(false)}
          itemName={`Order #${order.id.toString().substring(0, 8)}`}
        />
        
=======

>>>>>>> 612e743d63c43e980cf4000444158aa685075b5a
        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="receipt" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(
                    order.order_items.reduce((sum, item) => {
                      const itemPrice =
                        item.price ||
                        item.unit_price ||
                        (item.product && item.product.price) ||
                        0;
                      return sum + itemPrice * item.quantity;
                    }, 0)
                  )}
                </Text>
              </View>

              {order.shipping_fee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping Fee</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(order.shipping_fee || 0)}
                  </Text>
                </View>
              )}

              {order.tax_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(order.tax_amount || 0)}
                  </Text>
                </View>
              )}

              {order.discount_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryValue}>
                    -{formatCurrency(order.discount_amount || 0)}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(order.total_amount || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="note" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.notesContainer}>
                <Text style={styles.notesText}>{order.notes}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {!["delivered", "cancelled"].includes(order.status) && (
          <View style={styles.actionsContainer}>
            {order.status === "pending" && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleUpdateStatus("processing")}
                >
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Accept Order</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleUpdateStatus("cancelled")}
                >
                  <MaterialIcons name="close" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject Order</Text>
                </TouchableOpacity>
              </>
            )}

            {order.status === "processing" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.shipButton]}
                onPress={() => handleUpdateStatus("shipped")}
              >
                <MaterialIcons
                  name="local-shipping"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>Mark as Shipped</Text>
              </TouchableOpacity>
            )}

            {order.status === "shipped" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton]}
                onPress={() => handleUpdateStatus("delivered")}
              >
                <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Mark as Delivered</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Extra space at bottom for better scrolling */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
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
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold
  },
  backButton: {
    padding: 5,
  },
  headerRight: {
    width: 30,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    margin: 15,
    borderRadius: 15,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  statusCardGradient: {
    width: "100%",
  },
  statusCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  statusTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    marginBottom: 4,
    fontFamily: FONTS.bold
  },
  statusDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular
  },
  updateStatusButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  updateStatusText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.medium
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 10,
    fontFamily: FONTS.semiBold
  },
  sectionContent: {
    padding: 15,
  },
  paymentStatusContainer: {
    marginBottom: 15,
  },
  paymentStatusPaid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  paymentStatusTextPaid: {
    fontSize: 14,
    color: "#4CAF50",
    marginLeft: 5,
    fontFamily: FONTS.semiBold
  },
  paymentStatusPending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  paymentStatusTextPending: {
    fontSize: 14,
    color: "#FF9800",
    marginLeft: 5,
    fontFamily: FONTS.semiBold
  },
  paymentStatusUnknown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(117, 117, 117, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  paymentStatusTextUnknown: {
    fontSize: 14,
    color: "#757575",
    marginLeft: 5,
    fontFamily: FONTS.semiBold
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    width: 130,
    fontFamily: FONTS.semiBold,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  paymentMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethodText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerAvatar: {
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.accent,
    fontFamily: FONTS.semiBold
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
    fontFamily: FONTS.semiBold
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontFamily: FONTS.regular
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addressIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: FONTS.regular
  },
  trackingInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  trackingLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginRight: 8,
    fontFamily: FONTS.semiBold
  },
  trackingNumber: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.medium
  },
  orderItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 10,
  },
  productImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  productCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 5,
    fontFamily: FONTS.regular
  },
  orderItemDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.medium
  },
  productQuantity: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular
  },
  subtotalContainer: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginLeft: 10,
  },
  subtotalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontFamily: FONTS.regular
  },
  subtotalValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold
  },
  summary: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    fontFamily: FONTS.medium
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold
  },
  totalValue: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.bold
  },
  notesContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: 15,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: FONTS.regular
  },
  actionsContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 5,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  shipButton: {
    backgroundColor: "#2196F3",
  },
  deliverButton: {
    backgroundColor: "#9C27B0",
  },
  actionButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
    marginLeft: 8,
    fontFamily: FONTS.semiBold
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 10,
    fontFamily: FONTS.bold
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    fontFamily: FONTS.regular
  },
  errorBackButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorBackButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: FONTS.regular
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 15,
    marginVertical: 10,
  },
  customerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    margin: 15,
    marginTop: 5,
  },
  commentButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 8,
  },
});

export default OrderDetailsScreen;
