import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import useBookingStore from "../../store/bookingStore";
import useAuthStore from "../../store/authStore";
import supabase from "../../lib/supabase";
import { FONTS } from "../../constants/theme";

const CATEGORIES = [
  "Beauty & Wellness","Health","Tech Repair","Automotive",
  "Home Services","Education","Other",
];

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
  category: "",
  image_url: null,
  is_active: true,
};

async function uploadServiceImage(uri, userId) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `services/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("service_images")
    .upload(filePath, blob, { upsert: true, contentType: `image/${ext}` });
  if (error) throw error;
  const { data } = supabase.storage.from("service_images").getPublicUrl(filePath);
  return data.publicUrl;
}

export default function ManageServicesScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { myProvider, myServices, fetchMyServices, createService, updateService, deleteService } =
    useBookingStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUri, setImageUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (myProvider) {
        fetchMyServices(myProvider.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }, [myProvider?.id])
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageUri(null);
    setModalVisible(true);
  };

  const openEdit = (service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
      category: service.category,
      image_url: service.image_url,
      is_active: service.is_active,
    });
    setImageUri(null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Required", "Service name is required.");
    if (!form.price || isNaN(Number(form.price)))
      return Alert.alert("Invalid", "Enter a valid price.");
    if (!form.duration_minutes || isNaN(Number(form.duration_minutes)))
      return Alert.alert("Invalid", "Enter a valid duration in minutes.");
    if (!form.category) return Alert.alert("Required", "Please select a category.");

    setSaving(true);
    try {
      let image_url = form.image_url;
      if (imageUri) {
        image_url = await uploadServiceImage(imageUri, user.id);
      }

      const payload = {
        provider_id: myProvider.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        category: form.category,
        image_url,
        is_active: form.is_active,
      };

      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await createService(payload);
      }

      setModalVisible(false);
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save service.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (serviceId) => {
    Alert.alert("Delete Service", "Are you sure? This cannot be undone.", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteService(serviceId);
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const renderService = ({ item }) => (
    <View
      style={[
        styles.serviceCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.serviceImg} resizeMode="cover" />
      ) : (
        <View style={[styles.serviceImg, styles.serviceImgPlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="cut-outline" size={24} color={colors.text + "40"} />
        </View>
      )}
      <View style={styles.serviceInfo}>
        <View style={styles.serviceNameRow}>
          <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: item.is_active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" },
            ]}
          >
            <Text style={{ color: item.is_active ? "#22C55E" : "#EF4444", fontSize: 11, fontFamily: FONTS.medium }}>
              {item.is_active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
        <Text style={[styles.serviceMeta, { color: colors.text + "70" }]}>
          N${Number(item.price).toFixed(2)} · {item.duration_minutes} min · {item.category}
        </Text>
      </View>
      <View style={styles.serviceActions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={18} color="#6366F1" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Services</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={myServices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="briefcase-outline" size={56} color={colors.text + "30"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No services yet</Text>
              <Text style={[styles.emptyText, { color: colors.text + "60" }]}>
                Tap + to add your first service
              </Text>
            </View>
          }
          renderItem={renderService}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modal, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.cancelText, { color: colors.text + "80" }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingId ? "Edit Service" : "New Service"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#6366F1" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Image */}
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {imageUri || form.image_url ? (
                <Image
                  source={{ uri: imageUri || form.image_url }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.imagePreview, styles.imagePlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="image-outline" size={32} color={colors.text + "40"} />
                  <Text style={[styles.imageHint, { color: colors.text + "60" }]}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {[
              { label: "Service Name *", key: "name", placeholder: "e.g. Hair Braiding" },
              { label: "Description", key: "description", placeholder: "Describe the service..." },
              { label: "Price (N$) *", key: "price", placeholder: "e.g. 250", keyboardType: "numeric" },
              { label: "Duration (minutes) *", key: "duration_minutes", placeholder: "e.g. 60", keyboardType: "numeric" },
            ].map((field) => (
              <View key={field.key}>
                <Text style={[styles.label, { color: colors.text }]}>{field.label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.text + "50"}
                  value={form[field.key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                  keyboardType={field.keyboardType || "default"}
                  multiline={field.key === "description"}
                  numberOfLines={field.key === "description" ? 3 : 1}
                  textAlignVertical={field.key === "description" ? "top" : "center"}
                />
              </View>
            ))}

            <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setForm((f) => ({ ...f, category: cat }))}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: form.category === cat ? "#6366F1" : colors.card,
                      borderColor: form.category === cat ? "#6366F1" : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: form.category === cat ? "#fff" : colors.text, fontSize: 12, fontFamily: FONTS.medium }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Active</Text>
              <Switch
                value={form.is_active}
                onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                trackColor={{ true: "#6366F1", false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: FONTS.bold },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6366F1", alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  serviceCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  serviceImg: { width: 56, height: 56, borderRadius: 10 },
  serviceImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  serviceInfo: { flex: 1, gap: 4 },
  serviceNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  serviceName: { fontSize: 14, fontFamily: FONTS.semiBold, flex: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  serviceMeta: { fontSize: 12, fontFamily: FONTS.regular },
  serviceActions: { flexDirection: "column", gap: 8 },
  iconBtn: { padding: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: FONTS.semiBold, marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: FONTS.regular },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: FONTS.bold },
  cancelText: { fontSize: 15, fontFamily: FONTS.regular },
  saveText: { fontSize: 15, fontFamily: FONTS.semiBold, color: "#6366F1" },
  modalContent: { padding: 16, gap: 4 },
  imagePicker: { marginBottom: 16 },
  imagePreview: { width: "100%", height: 160, borderRadius: 14 },
  imagePlaceholder: { borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8 },
  imageHint: { fontSize: 13, fontFamily: FONTS.regular },
  label: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.regular, marginBottom: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
});
