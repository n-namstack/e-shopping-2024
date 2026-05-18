import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const PaymentMethodTypes = {
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  BANK_ACCOUNT: "bank_account",
};

const PaymentMethodIcons = {
  [PaymentMethodTypes.CREDIT_CARD]: "card",
  [PaymentMethodTypes.DEBIT_CARD]: "card-outline",
  [PaymentMethodTypes.BANK_ACCOUNT]: "business",
};

const PaymentMethodLabels = {
  [PaymentMethodTypes.CREDIT_CARD]: "Credit Card",
  [PaymentMethodTypes.DEBIT_CARD]: "Debit Card",
  [PaymentMethodTypes.BANK_ACCOUNT]: "Bank Account",
};

const PaymentMethodsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
  const [formData, setFormData] = useState({
    type: PaymentMethodTypes.CREDIT_CARD,
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
    isDefault: false,
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    setEditingPaymentMethod(null);
    setFormData({
      type: PaymentMethodTypes.CREDIT_CARD,
      cardNumber: "",
      cardHolder: "",
      expiryDate: "",
      cvv: "",
      isDefault: false,
    });
    setModalVisible(true);
  };

  const handleEditPaymentMethod = (paymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setFormData({
      type: paymentMethod.type,
      cardNumber: formatCardNumber(paymentMethod.card_number),
      cardHolder: paymentMethod.card_holder,
      expiryDate: paymentMethod.expiry_date,
      cvv: "",
      isDefault: paymentMethod.is_default,
    });
    setModalVisible(true);
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    Alert.alert(
      "Delete Payment Method",
      "Are you sure you want to delete this payment method?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("payment_methods")
                .delete()
                .eq("id", paymentMethodId);

              if (error) throw error;
              setPaymentMethods(
                paymentMethods.filter(
                  (method) => method.id !== paymentMethodId,
                ),
              );
              Alert.alert("Success", "Payment method deleted successfully");
            } catch (error) {
              console.error("Error deleting payment method:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to delete payment method",
              );
            }
          },
        },
      ],
    );
  };

  const validateForm = () => {
    if (!formData.cardNumber.trim()) {
      Alert.alert("Error", "Card number is required");
      return false;
    }
    if (!formData.cardHolder.trim()) {
      Alert.alert("Error", "Card holder name is required");
      return false;
    }
    if (!formData.expiryDate.trim()) {
      Alert.alert("Error", "Expiry date is required");
      return false;
    }
    if (!formData.cvv.trim()) {
      Alert.alert("Error", "CVV is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        type: formData.type,
        card_number: formData.cardNumber.replace(/\s/g, ""),
        card_holder: formData.cardHolder,
        expiry_date: formData.expiryDate,
        is_default: formData.isDefault,
      };

      // If setting as default, clear default on all others first
      if (formData.isDefault) {
        await supabase
          .from("payment_methods")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      let error, savedMethod;
      if (editingPaymentMethod) {
        const result = await supabase
          .from("payment_methods")
          .update(payload)
          .eq("id", editingPaymentMethod.id)
          .select()
          .single();
        error = result.error;
        savedMethod = result.data;
      } else {
        const result = await supabase
          .from("payment_methods")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        error = result.error;
        savedMethod = result.data;
      }

      if (error) throw error;

      if (editingPaymentMethod) {
        setPaymentMethods((methods) =>
          methods.map((m) =>
            m.id === editingPaymentMethod.id ? savedMethod : m,
          ),
        );
      } else {
        setPaymentMethods((methods) => [...methods, savedMethod]);
      }

      setModalVisible(false);
      Alert.alert(
        "Success",
        `Payment method ${editingPaymentMethod ? "updated" : "added"} successfully`,
      );
    } catch (error) {
      console.error("Error saving payment method:", error);
      Alert.alert("Error", error.message || "Failed to save payment method");
    }
  };

  const formatCardNumber = (number) => {
    const cleaned = number.replace(/\D/g, "");
    const formatted = cleaned.replace(/(\d{4})/g, "$1 ").trim();
    return formatted;
  };

  const formatExpiryDate = (date) => {
    const cleaned = date.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const renderPaymentMethodCard = (method) => (
    <View
      key={method.id}
      style={[
        styles.paymentCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Ionicons
            name={PaymentMethodIcons[method.type]}
            size={24}
            color={colors.text}
          />
          <View style={styles.cardDetails}>
            <Text
              style={[
                styles.cardType,
                { color: colors.text, fontFamily: FONTS.semiBold },
              ]}
            >
              {PaymentMethodLabels[method.type]}
            </Text>
            <Text
              style={[
                styles.cardNumber,
                {
                  color: isDarkMode ? "#aaa" : "#64748b",
                  fontFamily: FONTS.regular,
                },
              ]}
            >
              •••• •••• •••• {method.card_number.slice(-4)}
            </Text>
          </View>
        </View>
        {method.is_default && (
          <View
            style={[
              styles.defaultBadge,
              {
                backgroundColor: isDarkMode
                  ? "rgba(255,255,255,0.1)"
                  : "#0f172a20",
              },
            ]}
          >
            <Text
              style={[
                styles.defaultText,
                { color: colors.text, fontFamily: FONTS.regular },
              ]}
            >
              Default
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardHolder}>
        <Text
          style={[
            styles.cardHolderLabel,
            { color: isDarkMode ? "#aaa" : "#64748b", fontFamily: FONTS.regular },
          ]}
        >
          Card Holder
        </Text>
        <Text style={[styles.cardHolderName, { color: colors.text, fontFamily: FONTS.semiBold }]}>
          {method.card_holder}
        </Text>
      </View>

      <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.editButton,
            { borderRightColor: colors.border },
          ]}
          onPress={() => handleEditPaymentMethod(method)}
        >
          <Ionicons name="pencil" size={20} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text, fontFamily: FONTS.regular }]}>
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePaymentMethod(method.id)}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText, { fontFamily: FONTS.regular }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.bold }]}>
          Payment Methods
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {paymentMethods.map(renderPaymentMethodCard)}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPaymentMethod}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={[styles.addButtonText, { fontFamily: FONTS.semiBold }]}>Add Payment Method</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: FONTS.bold }]}>
                {editingPaymentMethod
                  ? "Edit Payment Method"
                  : "Add Payment Method"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text, fontFamily: FONTS.regular }]}>
                  Card Number
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={formData.cardNumber}
                  onChangeText={(text) => {
                    const formatted = formatCardNumber(text);
                    if (formatted.length <= 19) {
                      setFormData((prev) => ({
                        ...prev,
                        cardNumber: formatted,
                      }));
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="number-pad"
                  maxLength={19}
                  placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text, fontFamily: FONTS.regular }]}>
                  Card Holder Name
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={formData.cardHolder}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      cardHolder: text.toUpperCase(),
                    }))
                  }
                  placeholder="JOHN DOE"
                  autoCapitalize="characters"
                  placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
                />
              </View>

              <View style={styles.row}>
                <View
                  style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}
                >
                  <Text style={[styles.label, { color: colors.text, fontFamily: FONTS.regular }]}>
                    Expiry Date
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={formData.expiryDate}
                    onChangeText={(text) => {
                      const formatted = formatExpiryDate(text);
                      if (formatted.length <= 5) {
                        setFormData((prev) => ({
                          ...prev,
                          expiryDate: formatted,
                        }));
                      }
                    }}
                    placeholder="MM/YY"
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text, fontFamily: FONTS.regular }]}>
                    CVV
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={formData.cvv}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, "");
                      if (cleaned.length <= 3) {
                        setFormData((prev) => ({ ...prev, cvv: cleaned }));
                      }
                    }}
                    placeholder="123"
                    keyboardType="number-pad"
                    maxLength={3}
                    secureTextEntry
                    placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
                  />
                </View>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    formData.isDefault && styles.checkboxChecked,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      isDefault: !prev.isDefault,
                    }))
                  }
                >
                  {formData.isDefault && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
                <Text style={[styles.checkboxLabel, { color: colors.text, fontFamily: FONTS.regular }]}>
                  Set as default payment method
                </Text>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={[styles.submitButtonText, { fontFamily: FONTS.regular }]}>
                  {editingPaymentMethod
                    ? "Update Payment Method"
                    : "Add Payment Method"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardDetails: {
    marginLeft: 12,
  },
  cardType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardNumber: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: "#0f172a20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0f172a",
  },
  cardHolder: {
    marginBottom: 16,
  },
  cardHolderLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  cardHolderName: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  editButton: {
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  deleteButton: {},
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
  },
  deleteButtonText: {
    color: "#ef4444",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0f172a",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#0f172a",
  },
  submitButton: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PaymentMethodsScreen;
