import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS, COLORS } from "../../constants/theme";

const BANKS = [
  "Bank Windhoek",
  "First National Bank (FNB)",
  "Nedbank Namibia",
  "Standard Bank Namibia",
  "Letshego Bank",
  "Other",
];

const ACCOUNT_TYPES = [
  { label: "Savings", value: "savings" },
  { label: "Current / Cheque", value: "current" },
];

const SellerBankAccountScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const [form, setForm] = useState({
    bank_name: "",
    account_number: "",
    account_holder: "",
    branch_code: "",
    account_type: "savings",
  });

  useEffect(() => {
    fetchBankAccount();
  }, []);

  const fetchBankAccount = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_bank_accounts")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingId(data.id);
        setForm({
          bank_name: data.bank_name,
          account_number: data.account_number,
          account_holder: data.account_holder,
          branch_code: data.branch_code || "",
          account_type: data.account_type,
        });
      }
    } catch (error) {
      console.error("Error fetching bank account:", error);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!form.bank_name.trim()) {
      Alert.alert("Error", "Please select a bank");
      return false;
    }
    if (!form.account_number.trim()) {
      Alert.alert("Error", "Account number is required");
      return false;
    }
    if (!form.account_holder.trim()) {
      Alert.alert("Error", "Account holder name is required");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        account_holder: form.account_holder.trim(),
        branch_code: form.branch_code.trim(),
        account_type: form.account_type,
        is_default: true,
      };

      if (existingId) {
        const { error } = await supabase
          .from("seller_bank_accounts")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seller_bank_accounts")
          .insert({ ...payload, user_id: user.id });
        if (error) throw error;
      }

      Alert.alert("Saved", "Your bank account details have been saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error saving bank account:", error);
      Alert.alert("Error", error.message || "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDarkMode ? "#2a2a2a" : "#f8fafc",
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Bank Account
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.infoBox,
            { backgroundColor: isDarkMode ? "#1a2a1a" : "#f0fdf4" },
          ]}
        >
          <Ionicons name="information-circle" size={18} color="#16a34a" />
          <Text style={styles.infoText}>
            This is where DPO will transfer your earnings when customers pay by
            card.
          </Text>
        </View>

        {/* Bank selector */}
        <Text style={[styles.label, { color: colors.text }]}>Bank Name</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {BANKS.map((bank) => (
            <TouchableOpacity
              key={bank}
              style={[
                styles.chip,
                {
                  borderColor:
                    form.bank_name === bank ? COLORS.primary : colors.border,
                  backgroundColor:
                    form.bank_name === bank
                      ? isDarkMode
                        ? "#1e3a5f"
                        : "#eff6ff"
                      : colors.card,
                },
              ]}
              onPress={() => setForm((f) => ({ ...f, bank_name: bank }))}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      form.bank_name === bank ? colors.text : colors.text,
                    fontFamily:
                      form.bank_name === bank ? FONTS.semiBold : FONTS.regular,
                  },
                ]}
              >
                {bank}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.text }]}>Account Type</Text>
        <View style={styles.typeRow}>
          {ACCOUNT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                {
                  borderColor:
                    form.account_type === type.value
                      ? COLORS.primary
                      : colors.border,
                  backgroundColor:
                    form.account_type === type.value
                      ? isDarkMode
                        ? "#1e3a5f"
                        : "#eff6ff"
                      : colors.card,
                  flex: 1,
                  marginRight: type.value === "savings" ? 8 : 0,
                },
              ]}
              onPress={() => setForm((f) => ({ ...f, account_type: type.value }))}
            >
              <Text
                style={{
                  color:
                    form.account_type === type.value
                      ? colors.text
                      : colors.text,
                  fontFamily:
                    form.account_type === type.value
                      ? FONTS.semiBold
                      : FONTS.regular,
                  fontSize: 14,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>
          Account Holder Name
        </Text>
        <TextInput
          style={inputStyle}
          value={form.account_holder}
          onChangeText={(t) => setForm((f) => ({ ...f, account_holder: t }))}
          placeholder="Full name as on bank account"
          placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
          autoCapitalize="words"
        />

        <Text style={[styles.label, { color: colors.text }]}>
          Account Number
        </Text>
        <TextInput
          style={inputStyle}
          value={form.account_number}
          onChangeText={(t) =>
            setForm((f) => ({ ...f, account_number: t.replace(/\D/g, "") }))
          }
          placeholder="e.g. 8012345678"
          placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
          keyboardType="number-pad"
        />

        <Text style={[styles.label, { color: colors.text }]}>
          Branch Code{" "}
          <Text style={{ color: "#aaa", fontFamily: FONTS.regular }}>
            (optional)
          </Text>
        </Text>
        <TextInput
          style={inputStyle}
          value={form.branch_code}
          onChangeText={(t) => setForm((f) => ({ ...f, branch_code: t }))}
          placeholder="e.g. 280172"
          placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Bank Account</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#16a34a",
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: { marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipText: { fontSize: 13 },
  typeRow: { flexDirection: "row", marginBottom: 20 },
  typeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    fontFamily: FONTS.regular,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary || "#0f172a",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
});

export default SellerBankAccountScreen;
