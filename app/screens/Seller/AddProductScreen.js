import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { compressImage } from "../../utils/imageHelpers";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import { FONTS } from "../../constants/theme";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const AddProductScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const { shopId } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const surface  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg       = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted    = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border   = isDarkMode ? "#2C2C3E" : "#E5E7EB";
  const inputBg  = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  // Product form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [images, setImages] = useState([]);
  const [isOnOrder, setIsOnOrder] = useState(false);
  const [leadTime, setLeadTime] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  useEffect(() => {
    fetchCategories();
    requestMediaLibraryPermission();

    if (!shopId) {
      Alert.alert(
        "Missing Shop Information",
        "No shop selected. Please return and select a shop first.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }, [shopId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error.message);
    }
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload product images.");
    }
  };

  const handleSelectImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Sorry, we need media library permissions to make this work!");
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (images.length + result.assets.length > 5) {
          Alert.alert("Limit Reached", "You can only upload up to 5 images");
          return;
        }
        setImages([...images, ...result.assets]);
      }
    } catch (error) {
      console.error("Error selecting images:", error);
      Alert.alert("Error", "Failed to select images. Please try again.");
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    try {
      setIsUploading(true);
      const imageUrls = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const compressedUri = await compressImage(image.uri);
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          const fileName = `${timestamp}_${random}.jpg`;
          const filePath = `products/${shopId}/${fileName}`;

          const fetchResponse = await fetch(compressedUri);
          if (!fetchResponse.ok) throw new Error(`HTTP error! status: ${fetchResponse.status}`);

          const arrayBuffer = await fetchResponse.arrayBuffer();
          if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error("Invalid image data received");

          const { data, error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, arrayBuffer, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
          if (!publicUrlData?.publicUrl) throw new Error("Failed to get public URL");

          imageUrls.push(publicUrlData.publicUrl);
        } catch (error) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          Alert.alert("Upload Error", `Failed to upload image ${i + 1}. Please try again.`);
        }
      }

      if (imageUrls.length === 0) throw new Error("No images were uploaded successfully");
      return imageUrls;
    } catch (error) {
      console.error("Error in uploadImages:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategorySelect = (value) => {
    if (value === "custom") {
      setShowCustomCategory(true);
      setCategory("");
    } else {
      setShowCustomCategory(false);
      setCategory(value);
      setCustomCategory("");
    }
  };

  const validateForm = () => {
    if (!name.trim()) { Alert.alert("Validation Error", "Product name is required"); return false; }
    if (!description.trim()) { Alert.alert("Validation Error", "Product description is required"); return false; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) { Alert.alert("Validation Error", "Please enter a valid price"); return false; }
    if (!category.trim() && !customCategory.trim()) { Alert.alert("Validation Error", "Please select or enter a category"); return false; }
    if (!isOnOrder && (!stockQuantity.trim() || isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0)) {
      Alert.alert("Validation Error", "Please enter a valid stock quantity"); return false;
    }
    if (isOnOrder) {
      if (!leadTime.trim() || isNaN(Number(leadTime)) || Number(leadTime) <= 0) {
        Alert.alert("Validation Error", "Please enter a valid lead time in days"); return false;
      }
      if (!deliveryFee.trim() || isNaN(Number(deliveryFee)) || Number(deliveryFee) < 0) {
        Alert.alert("Validation Error", "Please enter a valid delivery fee"); return false;
      }
    }
    if (images.length === 0) { Alert.alert("Validation Error", "Please add at least one product image"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      if (!shopId) throw new Error("Shop ID not found. Please select a shop first.");

      const imageUrls = await uploadImages();
      if (imageUrls.length === 0 && images.length > 0) throw new Error("Failed to upload images");

      const productData = {
        shop_id: shopId,
        name,
        description,
        price: Number(price),
        category: customCategory || category,
        stock_quantity: isOnOrder ? 0 : Number(stockQuantity),
        images: imageUrls,
        is_on_order: isOnOrder,
        created_at: new Date().toISOString(),
      };

      if (isOnOrder) {
        productData.lead_time_days = Number(leadTime);
        productData.delivery_fee = Number(deliveryFee);
      }

      const { data, error } = await supabase.from("products").insert(productData).select().single();
      if (error) throw error;

      if (customCategory && !categories.some((c) => c.name.toLowerCase() === customCategory.toLowerCase())) {
        await supabase.from("categories").insert({ name: customCategory });
      }

      Alert.alert("Success", "Product added successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error creating product:", error);
      Alert.alert("Error", "Failed to create product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        {/* ── Gradient Hero ───────────────────────────────────────────── */}
        <LinearGradient
          colors={["#312E81", "#4F46E5", "#7C3AED"]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.heroBubble, { width: 160, height: 160, top: -50, right: -30 }]} />
          <View style={[styles.heroBubble, { width: 80, height: 80, bottom: -20, left: 10 }]} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <LinearGradient
                colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                style={styles.heroIconBadge}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.heroTitle}>Add Product</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>

            {/* ── Product Images ─────────────────────────────────────── */}
            <View style={[styles.sectionContainer, { backgroundColor: surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                  <Ionicons name="images-outline" size={18} color={INDIGO} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Images</Text>
                <Text style={[styles.sectionBadge, { color: muted }]}>{images.length}/5</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: border }]} />

              <View style={styles.imageGallery}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.image} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(index)}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity
                    style={[styles.addImageButton, { borderColor: INDIGO, backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}
                    onPress={handleSelectImages}
                  >
                    <Ionicons name="camera-outline" size={26} color={INDIGO} />
                    <Text style={[styles.addImageText, { color: INDIGO }]}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Product Details ─────────────────────────────────────── */}
            <View style={[styles.sectionContainer, { backgroundColor: surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                  <Ionicons name="document-text-outline" size={18} color={INDIGO} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Details</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: border }]} />

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Product Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: colors.text, fontFamily: FONTS.regular }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter product name"
                  placeholderTextColor={muted}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: colors.text, fontFamily: FONTS.regular }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter product description"
                  placeholderTextColor={muted}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Price (N$) *</Text>
                <View style={[styles.prefixInputWrap, { backgroundColor: inputBg, borderColor: border }]}>
                  <Text style={[styles.prefixText, { color: INDIGO, fontFamily: FONTS.bold }]}>N$</Text>
                  <TextInput
                    style={[styles.prefixInput, { color: colors.text, fontFamily: FONTS.regular }]}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    placeholderTextColor={muted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryButton,
                        { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: border },
                        category === cat.name && { backgroundColor: INDIGO, borderColor: INDIGO },
                      ]}
                      onPress={() => handleCategorySelect(cat.name)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        { color: muted },
                        category === cat.name && { color: "#fff", fontFamily: FONTS.medium },
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: border },
                      showCustomCategory && { backgroundColor: INDIGO, borderColor: INDIGO },
                    ]}
                    onPress={() => handleCategorySelect("custom")}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: muted, fontFamily: FONTS.medium },
                      showCustomCategory && { color: "#fff" },
                    ]}>
                      + Custom
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {showCustomCategory && (
                  <TextInput
                    style={[styles.input, { marginTop: 10, backgroundColor: inputBg, color: colors.text, borderColor: border, fontFamily: FONTS.regular }]}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="Enter custom category"
                    placeholderTextColor={muted}
                    maxLength={50}
                  />
                )}
              </View>
            </View>

            {/* ── Inventory ───────────────────────────────────────────── */}
            <View style={[styles.sectionContainer, { backgroundColor: surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                  <Ionicons name="cube-outline" size={18} color={INDIGO} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Inventory</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: border }]} />

              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: colors.text, fontFamily: FONTS.medium }]}>
                  This is an on-order product
                </Text>
                <Switch
                  value={isOnOrder}
                  onValueChange={setIsOnOrder}
                  trackColor={{ false: border, true: "#A5B4FC" }}
                  thumbColor={isOnOrder ? INDIGO : (isDarkMode ? "#6B7280" : "#D1D5DB")}
                />
              </View>

              {isOnOrder ? (
                <View>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Lead Time (days) *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: colors.text, fontFamily: FONTS.regular }]}
                      value={leadTime}
                      onChangeText={setLeadTime}
                      placeholder="Enter lead time in days"
                      placeholderTextColor={muted}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.helperText, { color: muted }]}>How many days will it take to fulfill the order?</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Delivery Fee (N$) *</Text>
                    <View style={[styles.prefixInputWrap, { backgroundColor: inputBg, borderColor: border }]}>
                      <Text style={[styles.prefixText, { color: INDIGO, fontFamily: FONTS.bold }]}>N$</Text>
                      <TextInput
                        style={[styles.prefixInput, { color: colors.text, fontFamily: FONTS.regular }]}
                        value={deliveryFee}
                        onChangeText={setDeliveryFee}
                        placeholder="0.00"
                        placeholderTextColor={muted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <Text style={[styles.helperText, { color: muted }]}>Total amount the buyer must pay for delivery of this product</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Stock Quantity *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: colors.text, fontFamily: FONTS.regular }]}
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    placeholder="Enter available quantity"
                    placeholderTextColor={muted}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
          <TouchableOpacity
            style={styles.submitTouch}
            onPress={handleSubmit}
            disabled={isLoading || isUploading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={(isLoading || isUploading) ? ["#9CA3AF", "#9CA3AF"] : [INDIGO, VIOLET]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {isLoading || isUploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Add Product</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },

  // Hero
  hero: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },

  // Form
  formContainer: { padding: 16, paddingBottom: 32 },

  sectionContainer: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 15, fontFamily: FONTS.bold },
  sectionBadge: { fontSize: 13, fontFamily: FONTS.regular },
  sectionDivider: { height: 1, marginBottom: 14 },

  // Images
  imageGallery: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imageContainer: { width: 82, height: 82, borderRadius: 12, position: "relative" },
  image: { width: "100%", height: "100%", borderRadius: 12 },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addImageButton: {
    width: 82,
    height: 82,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addImageText: { fontSize: 11, fontFamily: FONTS.medium },

  // Inputs
  inputContainer: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 8 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: { minHeight: 100, textAlignVertical: "top", paddingTop: 12 },

  prefixInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  prefixText: { fontSize: 15 },
  prefixInput: { flex: 1, fontSize: 15 },

  // Category chips
  categoryScroll: { flexDirection: "row", marginBottom: 4 },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryButtonText: { fontSize: 13, fontFamily: FONTS.regular },

  // Switch
  switchContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  switchLabel: { fontSize: 14, flex: 1, paddingRight: 12 },

  helperText: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 6 },

  // Footer
  footer: { padding: 16, borderTopWidth: 1 },
  submitTouch: { borderRadius: 14, overflow: "hidden" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});

export default AddProductScreen;
