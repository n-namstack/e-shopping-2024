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
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";

const PRIMARY = "#6366F1";

const EMPTY_FORM = {
  full_name: "",
  phone_number: "",
  street: "",
  city: "",
  state: "",
  zip_code: "",
  country: "Namibia",
  is_default: false,
};

const Field = ({ label, field, placeholder, keyboard, required, value, onChange, colors, inputBg, muted }) => (
  <View style={s.fieldWrap}>
    <Text style={[s.fieldLabel, { color: colors.text }]}>
      {label}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
    </Text>
    <TextInput
      style={[s.fieldInput, { backgroundColor: inputBg, color: colors.text }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={muted}
      keyboardType={keyboard || "default"}
      autoCapitalize={keyboard === "email-address" ? "none" : "words"}
    />
  </View>
);

const ShippingAddressScreen = () => {
  const navigation  = useNavigation();
  const { colors }  = useTheme();
  const { isDarkMode } = useAppTheme();
  const { user }    = useAuthStore();

  const [addresses, setAddresses]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const input   = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  useEffect(() => { fetchAddresses(); }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shipping_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAddresses(data || []);
    } catch (e) {
      console.error("Fetch addresses:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr.id);
    setForm({
      full_name:    addr.full_name    || "",
      phone_number: addr.phone_number || "",
      street:       addr.street       || "",
      city:         addr.city         || "",
      state:        addr.state        || "",
      zip_code:     addr.zip_code     || "",
      country:      addr.country      || "Namibia",
      is_default:   addr.is_default   || false,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const { full_name, phone_number, street, city, state } = form;
    if (!full_name.trim() || !phone_number.trim() || !street.trim() || !city.trim() || !state.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    try {
      setSaving(true);

      // If setting as default, clear existing default first
      if (form.is_default) {
        await supabase
          .from("shipping_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      if (editingId) {
        const { error } = await supabase
          .from("shipping_addresses")
          .update({ ...form })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shipping_addresses")
          .insert({ ...form, user_id: user.id });
        if (error) throw error;
      }

      setModalVisible(false);
      await fetchAddresses();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("shipping_addresses")
              .delete()
              .eq("id", id);
            if (error) throw error;
            setAddresses((prev) => prev.filter((a) => a.id !== id));
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to delete address.");
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id) => {
    try {
      await supabase
        .from("shipping_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
      await supabase
        .from("shipping_addresses")
        .update({ is_default: true })
        .eq("id", id);
      await fetchAddresses();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

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
          <Text style={s.heroTitle}>Shipping Addresses</Text>
          <Text style={s.heroSub}>Manage your delivery locations</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Address list ──────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView style={s.flex} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {addresses.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="location-outline" size={56} color={isDarkMode ? "#374151" : "#D1D5DB"} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No saved addresses</Text>
              <Text style={[s.emptySub, { color: muted }]}>Tap + to add your first delivery address</Text>
            </View>
          )}

          {addresses.map((addr) => (
            <View key={addr.id} style={[s.card, { backgroundColor: surface }]}>
              {/* Default badge */}
              {addr.is_default && (
                <View style={s.defaultBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={s.defaultTxt}>Default</Text>
                </View>
              )}

              <View style={s.cardTop}>
                <View style={[s.cardIcon, { backgroundColor: `${PRIMARY}18` }]}>
                  <Ionicons name="location" size={20} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, { color: colors.text }]}>{addr.full_name}</Text>
                  <Text style={[s.cardPhone, { color: muted }]}>{addr.phone_number}</Text>
                </View>
              </View>

              <Text style={[s.cardAddr, { color: colors.text }]}>{addr.street}</Text>
              <Text style={[s.cardAddr, { color: muted }]}>
                {[addr.city, addr.state, addr.zip_code].filter(Boolean).join(", ")}
                {addr.country ? `, ${addr.country}` : ""}
              </Text>

              <View style={[s.cardActions, { borderTopColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#F1F5F9" }]}>
                {!addr.is_default && (
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleSetDefault(addr.id)}>
                    <Ionicons name="star-outline" size={16} color={PRIMARY} />
                    <Text style={[s.actionTxt, { color: PRIMARY }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(addr)}>
                  <Ionicons name="pencil-outline" size={16} color={colors.text} />
                  <Text style={[s.actionTxt, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(addr.id)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={[s.actionTxt, { color: "#EF4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.addNewBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color={PRIMARY} />
            <Text style={[s.addNewTxt, { color: PRIMARY }]}>Add New Address</Text>
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
                {editingId ? "Edit Address" : "New Address"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field label="Full Name"      placeholder="e.g. John Doe"             required value={form.full_name}    onChange={(v) => setForm(p => ({ ...p, full_name: v }))}    colors={colors} inputBg={input} muted={muted} />
              <Field label="Phone Number"   placeholder="e.g. +264 81 234 5678"     required value={form.phone_number} onChange={(v) => setForm(p => ({ ...p, phone_number: v }))} colors={colors} inputBg={input} muted={muted} keyboard="phone-pad" />
              <Field label="Street Address" placeholder="e.g. 12 Independence Ave"  required value={form.street}       onChange={(v) => setForm(p => ({ ...p, street: v }))}       colors={colors} inputBg={input} muted={muted} />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="City"           placeholder="e.g. Windhoek" required value={form.city}     onChange={(v) => setForm(p => ({ ...p, city: v }))}     colors={colors} inputBg={input} muted={muted} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Region / State" placeholder="e.g. Khomas"   required value={form.state}    onChange={(v) => setForm(p => ({ ...p, state: v }))}    colors={colors} inputBg={input} muted={muted} />
                </View>
              </View>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Postal Code" placeholder="e.g. 10001" value={form.zip_code} onChange={(v) => setForm(p => ({ ...p, zip_code: v }))} colors={colors} inputBg={input} muted={muted} keyboard="number-pad" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Country"     placeholder="Namibia"     value={form.country}  onChange={(v) => setForm(p => ({ ...p, country: v }))}  colors={colors} inputBg={input} muted={muted} />
                </View>
              </View>

              {/* Default toggle */}
              <TouchableOpacity
                style={[s.defaultRow, { backgroundColor: input }]}
                onPress={() => setForm((p) => ({ ...p, is_default: !p.is_default }))}
                activeOpacity={0.8}
              >
                <View style={[s.defaultRowIcon, { backgroundColor: `${PRIMARY}18` }]}>
                  <Ionicons name="star" size={16} color={PRIMARY} />
                </View>
                <Text style={[s.defaultRowTxt, { color: colors.text }]}>Set as default address</Text>
                <View style={[s.toggle, form.is_default && s.toggleOn]}>
                  {form.is_default && <Ionicons name="checkmark" size={14} color="#fff" />}
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
                  : <Text style={s.saveTxt}>{editingId ? "Update Address" : "Save Address"}</Text>
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
  flex: { flex: 1 },
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

  list: { padding: 16, gap: 12 },

  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold },
  emptySub:   { fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },

  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginBottom: 4,
  },
  defaultTxt: { fontSize: 11, fontFamily: FONTS.bold, color: "#fff" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  cardIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  cardName:  { fontSize: 15, fontFamily: FONTS.bold },
  cardPhone: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 1 },
  cardAddr:  { fontSize: 13, fontFamily: FONTS.regular, marginLeft: 50 },

  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 10,
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  actionTxt: { fontSize: 13, fontFamily: FONTS.medium },

  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  addNewTxt: { fontSize: 15, fontFamily: FONTS.bold },

  // Modal
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "92%",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontFamily: FONTS.bold },

  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 },
  fieldInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
  row2: { flexDirection: "row" },

  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  defaultRowIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  defaultRowTxt: { flex: 1, fontSize: 14, fontFamily: FONTS.medium },
  toggle: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center",
  },
  toggleOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveTxt: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default ShippingAddressScreen;
