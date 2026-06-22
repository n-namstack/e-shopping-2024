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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const BANKS = [
  "Bank Windhoek",
  "First National Bank (FNB)",
  "Nedbank Namibia",
  "Standard Bank Namibia",
  "Letshego Bank",
  "Other",
];

const ACCOUNT_TYPES = [
  { label: "Savings",          value: "savings"  },
  { label: "Current / Cheque", value: "current"  },
];

const SellerBankAccountScreen = () => {
  const navigation     = useNavigation();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();

  const surface  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg       = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted    = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border   = isDarkMode ? "#2C2C3E" : "#E5E7EB";
  const inputBg  = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [existingId, setExistingId] = useState(null);

  const [form, setForm] = useState({
    bank_name:      "",
    account_number: "",
    account_holder: "",
    branch_code:    "",
    account_type:   "savings",
  });

  useEffect(() => { fetchBankAccount(); }, []);

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
          bank_name:      data.bank_name,
          account_number: data.account_number,
          account_holder: data.account_holder,
          branch_code:    data.branch_code || "",
          account_type:   data.account_type,
        });
      }
    } catch (error) {
      console.error("Error fetching bank account:", error);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!form.bank_name.trim())      { Alert.alert("Error", "Please select a bank"); return false; }
    if (!form.account_number.trim()) { Alert.alert("Error", "Account number is required"); return false; }
    if (!form.account_holder.trim()) { Alert.alert("Error", "Account holder name is required"); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        bank_name:      form.bank_name.trim(),
        account_number: form.account_number.trim(),
        account_holder: form.account_holder.trim(),
        branch_code:    form.branch_code.trim(),
        account_type:   form.account_type,
        is_default:     true,
      };

      if (existingId) {
        const { error } = await supabase.from("seller_bank_accounts").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("seller_bank_accounts").insert({ ...payload, user_id: user.id });
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

  if (loading) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={INDIGO} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>

      {/* ── Gradient Hero ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[s.heroBubble, { width: 180, height: 180, top: -60, right: -40 }]} />
        <View style={[s.heroBubble, { width: 80,  height: 80,  bottom: -20, left: 20 }]} />

        <View style={s.heroTopRow}>
          <TouchableOpacity style={s.heroBackBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroTitleWrap}>
            <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={s.heroIconBadge}>
              <Ionicons name="card-outline" size={22} color="#fff" />
            </LinearGradient>
            <Text style={s.heroTitle}>Bank Account</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={[s.infoCard, { backgroundColor: isDarkMode ? "#052e16" : "#F0FDF4", borderLeftColor: "#16A34A" }]}>
          <View style={[s.infoIconWrap, { backgroundColor: isDarkMode ? "#14532d" : "#DCFCE7" }]}>
            <Ionicons name="information-circle-outline" size={18} color="#16A34A" />
          </View>
          <Text style={[s.infoText, { color: isDarkMode ? "#86EFAC" : "#15803D" }]}>
            This is where DPO will transfer your earnings when customers pay by card.
          </Text>
        </View>

        {/* ── Bank Name ─────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surface }]}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
              <Ionicons name="business-outline" size={18} color={INDIGO} />
            </View>
            <Text style={[s.cardTitle, { color: colors.text }]}>Bank Name</Text>
          </View>
          <View style={[s.cardDivider, { backgroundColor: border }]} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {BANKS.map((bank) => {
              const active = form.bank_name === bank;
              return (
                <TouchableOpacity
                  key={bank}
                  style={[
                    s.chip,
                    { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: border },
                    active && { backgroundColor: INDIGO, borderColor: INDIGO },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, bank_name: bank }))}
                >
                  <Text style={[s.chipText, { color: muted }, active && { color: "#fff", fontFamily: FONTS.semiBold }]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Account Type ──────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surface }]}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
              <Ionicons name="wallet-outline" size={18} color={INDIGO} />
            </View>
            <Text style={[s.cardTitle, { color: colors.text }]}>Account Type</Text>
          </View>
          <View style={[s.cardDivider, { backgroundColor: border }]} />

          <View style={s.typeRow}>
            {ACCOUNT_TYPES.map((type, i) => {
              const active = form.account_type === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    s.typeBtn,
                    { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: border },
                    active && { backgroundColor: INDIGO, borderColor: INDIGO },
                    i === 0 && { marginRight: 10 },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, account_type: type.value }))}
                >
                  {active && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
                  <Text style={[s.typeBtnText, { color: muted }, active && { color: "#fff", fontFamily: FONTS.semiBold }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Account Details ───────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surface }]}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
              <Ionicons name="person-outline" size={18} color={INDIGO} />
            </View>
            <Text style={[s.cardTitle, { color: colors.text }]}>Account Details</Text>
          </View>
          <View style={[s.cardDivider, { backgroundColor: border }]} />

          <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>Account Holder Name *</Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
              value={form.account_holder}
              onChangeText={(t) => setForm((f) => ({ ...f, account_holder: t }))}
              placeholder="Full name as on bank account"
              placeholderTextColor={muted}
              autoCapitalize="words"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>Account Number *</Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
              value={form.account_number}
              onChangeText={(t) => setForm((f) => ({ ...f, account_number: t.replace(/\D/g, "") }))}
              placeholder="e.g. 8012345678"
              placeholderTextColor={muted}
              keyboardType="number-pad"
            />
          </View>

          <View style={[s.fieldWrap, { marginBottom: 0 }]}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>
              Branch Code{" "}
              <Text style={{ color: muted, fontFamily: FONTS.regular }}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text, marginBottom: 0 }]}
              value={form.branch_code}
              onChangeText={(t) => setForm((f) => ({ ...f, branch_code: t }))}
              placeholder="e.g. 280172"
              placeholderTextColor={muted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* ── Save Button ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.saveTouch}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={saving ? ["#9CA3AF", "#9CA3AF"] : [INDIGO, VIOLET]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={s.saveBtnText}>Save Bank Account</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  // Hero
  hero: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },

  scrollContent: { padding: 16, paddingBottom: 48 },

  // Info banner
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  infoIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoText: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, lineHeight: 19 },

  // Section cards
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle:   { fontSize: 15, fontFamily: FONTS.bold },
  cardDivider: { height: 1, marginBottom: 14 },

  // Bank chips
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontFamily: FONTS.medium },

  // Account type buttons
  typeRow: { flexDirection: "row" },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeBtnText: { fontSize: 14, fontFamily: FONTS.medium },

  // Fields
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: FONTS.regular,
  },

  // Save button
  saveTouch: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default SellerBankAccountScreen;
