import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const PRIMARY = "#6366F1";

const TYPE_CONFIG = {
  credit_card:  { label: "Credit Card",  icon: "card",         gradient: ["#312E81","#4F46E5","#7C3AED"] },
  debit_card:   { label: "Debit Card",   icon: "card-outline", gradient: ["#065F46","#059669","#10B981"] },
  bank_account: { label: "Bank Account", icon: "business",     gradient: ["#1E3A5F","#1D4ED8","#3B82F6"] },
};

const TYPES = Object.keys(TYPE_CONFIG);

const EMPTY_FORM = {
  type: "credit_card",
  cardNumber: "",
  cardHolder: "",
  expiryDate: "",
  cvv: "",
  isDefault: false,
};

const PaymentMethodsScreen = () => {
  const navigation     = useNavigation();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();

  const [methods, setMethods]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const input   = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  useEffect(() => { fetchMethods(); }, []);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMethods(data || []);
    } catch (e) {
      console.error("Fetch payment methods:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({
      type:       m.type,
      cardNumber: formatCardNumber(m.card_number),
      cardHolder: m.card_holder,
      expiryDate: m.expiry_date,
      cvv:        "",
      isDefault:  m.is_default,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.cardNumber.trim() || !form.cardHolder.trim() || !form.expiryDate.trim()) {
      Alert.alert("Missing Fields", "Please fill in card number, holder name, and expiry date.");
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        type:        form.type,
        card_number: form.cardNumber.replace(/\s/g, ""),
        card_holder: form.cardHolder,
        expiry_date: form.expiryDate,
        is_default:  form.isDefault,
      };

      if (form.isDefault) {
        await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
      }

      if (editingId) {
        const { error } = await supabase.from("payment_methods").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_methods").insert({ ...payload, user_id: user.id });
        if (error) throw error;
      }

      setModalVisible(false);
      await fetchMethods();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Card", "Are you sure you want to remove this payment method?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("payment_methods").delete().eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else setMethods((prev) => prev.filter((m) => m.id !== id));
        },
      },
    ]);
  };

  const handleSetDefault = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("payment_methods").update({ is_default: true }).eq("id", id);
    await fetchMethods();
  };

  const formatCardNumber = (n) => n.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim();
  const formatExpiry     = (v) => { const c = v.replace(/\D/g, ""); return c.length >= 2 ? `${c.slice(0,2)}/${c.slice(2,4)}` : c; };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle}>Payment Methods</Text>
          <Text style={s.heroSub}>Manage your saved cards</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Cards list ────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <ScrollView style={s.flex} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {methods.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="card-outline" size={56} color={isDarkMode ? "#374151" : "#D1D5DB"} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No saved cards</Text>
              <Text style={[s.emptySub, { color: muted }]}>Tap + to add your first payment method</Text>
            </View>
          )}

          {methods.map((m) => {
            const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.credit_card;
            return (
              <View key={m.id} style={s.cardWrap}>
                {/* Visual card */}
                <LinearGradient
                  colors={cfg.gradient}
                  style={s.visualCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={s.vcTop}>
                    <Text style={s.vcType}>{cfg.label}</Text>
                    {m.is_default && (
                      <View style={s.defaultBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                        <Text style={s.defaultTxt}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.vcNumber}>
                    •••• •••• •••• {m.card_number.slice(-4)}
                  </Text>
                  <View style={s.vcBottom}>
                    <View>
                      <Text style={s.vcLabel}>Card Holder</Text>
                      <Text style={s.vcValue}>{m.card_holder}</Text>
                    </View>
                    {m.expiry_date ? (
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={s.vcLabel}>Expires</Text>
                        <Text style={s.vcValue}>{m.expiry_date}</Text>
                      </View>
                    ) : null}
                  </View>
                  {/* Decorative circles */}
                  <View style={[s.circle, { top: -20, right: -20, width: 100, height: 100 }]} />
                  <View style={[s.circle, { top: 20, right: 40, width: 60, height: 60 }]} />
                </LinearGradient>

                {/* Action row */}
                <View style={[s.actions, { backgroundColor: surface }]}>
                  {!m.is_default && (
                    <TouchableOpacity style={s.actionBtn} onPress={() => handleSetDefault(m.id)}>
                      <Ionicons name="star-outline" size={16} color={PRIMARY} />
                      <Text style={[s.actionTxt, { color: PRIMARY }]}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(m)}>
                    <Ionicons name="pencil-outline" size={16} color={colors.text} />
                    <Text style={[s.actionTxt, { color: colors.text }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(m.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[s.actionTxt, { color: "#EF4444" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={s.addNewBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color={PRIMARY} />
            <Text style={[s.addNewTxt, { color: PRIMARY }]}>Add Payment Method</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── Add / Edit modal ──────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.overlay}
        >
          <View style={[s.sheet, { backgroundColor: surface }]}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>
                {editingId ? "Edit Card" : "Add New Card"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Type selector */}
              <Text style={[s.fieldLabel, { color: colors.text, marginBottom: 8 }]}>Card Type</Text>
              <View style={s.typeRow}>
                {TYPES.map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  const active = form.type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeBtn, active && s.typeBtnActive, { backgroundColor: active ? `${PRIMARY}15` : input }]}
                      onPress={() => setForm((p) => ({ ...p, type: t }))}
                    >
                      <Ionicons name={cfg.icon} size={18} color={active ? PRIMARY : muted} />
                      <Text style={[s.typeTxt, { color: active ? PRIMARY : muted }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Card number */}
              <View style={s.fieldWrap}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>Card Number <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <View style={[s.inputRow, { backgroundColor: input }]}>
                  <Ionicons name="card-outline" size={18} color={muted} />
                  <TextInput
                    style={[s.inputField, { color: colors.text }]}
                    value={form.cardNumber}
                    onChangeText={(v) => {
                      const f = formatCardNumber(v);
                      if (f.length <= 19) setForm((p) => ({ ...p, cardNumber: f }));
                    }}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={muted}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                </View>
              </View>

              {/* Card holder */}
              <View style={s.fieldWrap}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>Card Holder Name <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <View style={[s.inputRow, { backgroundColor: input }]}>
                  <Ionicons name="person-outline" size={18} color={muted} />
                  <TextInput
                    style={[s.inputField, { color: colors.text }]}
                    value={form.cardHolder}
                    onChangeText={(v) => setForm((p) => ({ ...p, cardHolder: v.toUpperCase() }))}
                    placeholder="JOHN DOE"
                    placeholderTextColor={muted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Expiry + CVV row */}
              <View style={s.twoCol}>
                <View style={[s.fieldWrap, { flex: 1 }]}>
                  <Text style={[s.fieldLabel, { color: colors.text }]}>Expiry <Text style={{ color: "#EF4444" }}>*</Text></Text>
                  <View style={[s.inputRow, { backgroundColor: input }]}>
                    <Ionicons name="calendar-outline" size={16} color={muted} />
                    <TextInput
                      style={[s.inputField, { color: colors.text }]}
                      value={form.expiryDate}
                      onChangeText={(v) => {
                        const f = formatExpiry(v);
                        if (f.length <= 5) setForm((p) => ({ ...p, expiryDate: f }));
                      }}
                      placeholder="MM/YY"
                      placeholderTextColor={muted}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={[s.fieldWrap, { flex: 1 }]}>
                  <Text style={[s.fieldLabel, { color: colors.text }]}>CVV</Text>
                  <View style={[s.inputRow, { backgroundColor: input }]}>
                    <Ionicons name="lock-closed-outline" size={16} color={muted} />
                    <TextInput
                      style={[s.inputField, { color: colors.text }]}
                      value={form.cvv}
                      onChangeText={(v) => { const c = v.replace(/\D/g,""); if (c.length <= 3) setForm((p) => ({ ...p, cvv: c })); }}
                      placeholder="123"
                      placeholderTextColor={muted}
                      keyboardType="number-pad"
                      maxLength={3}
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>

              {/* Default toggle */}
              <TouchableOpacity
                style={[s.defaultRow, { backgroundColor: input }]}
                onPress={() => setForm((p) => ({ ...p, isDefault: !p.isDefault }))}
              >
                <View style={[s.defaultIcon, { backgroundColor: `${PRIMARY}18` }]}>
                  <Ionicons name="star" size={16} color={PRIMARY} />
                </View>
                <Text style={[s.defaultRowTxt, { color: colors.text }]}>Set as default payment method</Text>
                <View style={[s.toggle, form.isDefault && s.toggleOn]}>
                  {form.isDefault && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.saveTxt}>{editingId ? "Update Card" : "Save Card"}</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },
  heroSub:   { fontSize: 12, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  list: { padding: 16, gap: 14 },

  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold },
  emptySub:   { fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },

  cardWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  visualCard: {
    padding: 20,
    paddingBottom: 24,
    gap: 12,
    overflow: "hidden",
  },
  vcTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vcType: { fontSize: 14, fontFamily: FONTS.bold, color: "rgba(255,255,255,0.9)" },
  defaultBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  defaultTxt: { fontSize: 11, fontFamily: FONTS.bold, color: "#fff" },
  vcNumber: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff", letterSpacing: 2 },
  vcBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  vcLabel: { fontSize: 10, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 },
  vcValue: { fontSize: 14, fontFamily: FONTS.bold, color: "#fff", marginTop: 2 },
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  actions: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, paddingVertical: 8,
  },
  actionTxt: { fontSize: 13, fontFamily: FONTS.medium },

  addNewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1.5, borderColor: PRIMARY, borderStyle: "dashed",
    borderRadius: 14, paddingVertical: 16, marginTop: 2,
  },
  addNewTxt: { fontSize: 15, fontFamily: FONTS.bold },

  // Modal
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  sheetTitle:  { fontSize: 20, fontFamily: FONTS.bold },

  typeRow:    { flexDirection: "row", gap: 8, marginBottom: 20 },
  typeBtn:    { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  typeBtnActive: { borderWidth: 1.5, borderColor: PRIMARY },
  typeTxt:    { fontSize: 11, fontFamily: FONTS.medium, textAlign: "center" },

  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 },
  inputRow:   { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, height: 50 },
  inputField: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  twoCol:     { flexDirection: "row" },

  defaultRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, gap: 12, marginBottom: 20, marginTop: 4 },
  defaultIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  defaultRowTxt: { flex: 1, fontSize: 14, fontFamily: FONTS.medium },
  toggle: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  toggleOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },

  saveBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  saveTxt: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default PaymentMethodsScreen;
