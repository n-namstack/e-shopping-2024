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
import { sendPushNotification } from "../../services/PushNotificationService";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const LOW_STOCK_THRESHOLD = 5;

const EditProductScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
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
  // Delivery fee state
  const [localDeliveryFee, setLocalDeliveryFee] = useState("");
  const [uptownDeliveryFee, setUptownDeliveryFee] = useState("");
  const [outOfTownDeliveryFee, setOutOfTownDeliveryFee] = useState("");
  const [countryWideDeliveryFee, setCountryWideDeliveryFee] = useState("");
  const [showDeliveryFees, setShowDeliveryFees] = useState(false);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [shopId, setShopId] = useState(null);
  // Sales feature state
  const [isOnSale, setIsOnSale] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");

  useEffect(() => {
    fetchProductAndCategories();
    requestMediaLibraryPermission();
  }, []);

  const fetchProductAndCategories = async () => {
    try {
      setIsLoading(true);

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          `
          *,
          shop:shop_id(id, name)
        `
        )
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      if (!productData) {
        Alert.alert("Error", "Product not found");
        navigation.goBack();
        return;
      }

      // Store the shopId for later use in updates
      setShopId(productData.shop_id);

      // Set product data in state
      setName(productData.name);
      setDescription(productData.description);
      setPrice(productData.price?.toString() || "");
      setCategory(productData.category || "");
      setStockQuantity(productData.stock_quantity?.toString() || "0");
      setIsOnOrder(productData.is_on_order || false);
      setLeadTime(productData.lead_time_days?.toString() || "");
      setDeliveryFee(productData.delivery_fee?.toString() || "");

      // Set delivery fees from individual columns
      setLocalDeliveryFee(productData.delivery_fee_local?.toString() || "");
      setUptownDeliveryFee(productData.delivery_fee_uptown?.toString() || "");
      setOutOfTownDeliveryFee(
        productData.delivery_fee_outoftown?.toString() || ""
      );
      setCountryWideDeliveryFee(
        productData.delivery_fee_countrywide?.toString() || ""
      );
      setFreeDeliveryThreshold(
        productData.free_delivery_threshold?.toString() || ""
      );

      // Set sales data
      setIsOnSale(productData.is_on_sale || false);
      setDiscountPercentage(productData.discount_percentage?.toString() || "");
      setOriginalPrice(
        productData.original_price?.toString() ||
          productData.price?.toString() ||
          ""
      );

      // Set existing images
      if (productData.images && Array.isArray(productData.images)) {
        setExistingImages(productData.images);
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // Check if category is custom
      const categoryExists = categoriesData.some(
        (cat) => cat.name === productData.category
      );
      if (!categoryExists && productData.category) {
        setShowCustomCategory(true);
        setCustomCategory(productData.category);
        setCategory("");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      Alert.alert("Error", "Failed to load product details");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to upload product images."
      );
    }
  };

  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check total images limit
        const totalImages =
          existingImages.length + images.length + result.assets.length;
        if (totalImages > 5) {
          Alert.alert(
            "Limit Reached",
            "You can only have up to 5 images total"
          );
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

  const handleRemoveExistingImage = (url) => {
    setExistingImages(existingImages.filter((image) => image !== url));
    setRemovedImages([...removedImages, url]);
  };

  const uploadImages = async () => {
    try {
      setIsUploading(true);
      const imageUrls = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          // Compress the image before upload
          const compressedUri = await compressImage(image.uri);

          // Generate unique filename
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          const fileName = `${timestamp}_${random}.jpg`;
          const filePath = `products/${shopId}/${fileName}`;

          // Get image data as ArrayBuffer
          const fetchResponse = await fetch(compressedUri);
          if (!fetchResponse.ok) {
            throw new Error(`HTTP error! status: ${fetchResponse.status}`);
          }

          const arrayBuffer = await fetchResponse.arrayBuffer();
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error("Invalid image data received");
          }

          // Upload to Supabase
          const { data, error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, arrayBuffer, {
              contentType: "image/jpeg",
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath);

          if (!publicUrlData?.publicUrl) {
            throw new Error("Failed to get public URL");
          }

          imageUrls.push(publicUrlData.publicUrl);
        } catch (error) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          Alert.alert(
            "Upload Error",
            `Failed to upload image ${i + 1}. Please try again.`
          );
        }
      }

      if (imageUrls.length === 0) {
        throw new Error("No images were uploaded successfully");
      }

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
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter a product name");
      return false;
    }

    if (!description.trim()) {
      Alert.alert("Validation Error", "Please enter a product description");
      return false;
    }

    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid price");
      return false;
    }

    if (!category && !customCategory) {
      Alert.alert("Validation Error", "Please select or enter a category");
      return false;
    }

    if (showCustomCategory && !customCategory.trim()) {
      Alert.alert("Validation Error", "Please enter a custom category");
      return false;
    }

    if (!isOnOrder && (!stockQuantity.trim() || isNaN(Number(stockQuantity)))) {
      Alert.alert("Validation Error", "Please enter a valid stock quantity");
      return false;
    }

    if (isOnOrder) {
      if (
        !leadTime.trim() ||
        isNaN(Number(leadTime)) ||
        Number(leadTime) <= 0
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid lead time in days"
        );
        return false;
      }

      // Validate delivery fees
      if (
        localDeliveryFee &&
        (isNaN(Number(localDeliveryFee)) || Number(localDeliveryFee) < 0)
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid delivery fee for Local"
        );
        return false;
      }

      if (
        uptownDeliveryFee &&
        (isNaN(Number(uptownDeliveryFee)) || Number(uptownDeliveryFee) < 0)
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid delivery fee for Uptown"
        );
        return false;
      }

      if (
        outOfTownDeliveryFee &&
        (isNaN(Number(outOfTownDeliveryFee)) ||
          Number(outOfTownDeliveryFee) < 0)
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid delivery fee for Out of Town"
        );
        return false;
      }

      if (
        countryWideDeliveryFee &&
        (isNaN(Number(countryWideDeliveryFee)) ||
          Number(countryWideDeliveryFee) < 0)
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid delivery fee for Country-wide"
        );
        return false;
      }

      if (
        freeDeliveryThreshold &&
        (isNaN(Number(freeDeliveryThreshold)) ||
          Number(freeDeliveryThreshold) < 0)
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid free delivery threshold"
        );
        return false;
      }
    }

    if (isOnSale) {
      if (
        !originalPrice.trim() ||
        isNaN(Number(originalPrice)) ||
        Number(originalPrice) <= 0
      ) {
        Alert.alert("Validation Error", "Please enter a valid original price");
        return false;
      }

      if (
        !discountPercentage.trim() ||
        isNaN(Number(discountPercentage)) ||
        Number(discountPercentage) <= 0 ||
        Number(discountPercentage) >= 100
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid discount percentage (between 1-99)"
        );
        return false;
      }

      if (Number(price) >= Number(originalPrice)) {
        Alert.alert(
          "Validation Error",
          "Sale price must be lower than the original price"
        );
        return false;
      }
    }

    if (existingImages.length === 0 && images.length === 0) {
      Alert.alert("Validation Error", "Please add at least one product image");
      return false;
    }

    if (isOnSale) {
      if (
        !originalPrice.trim() ||
        isNaN(Number(originalPrice)) ||
        Number(originalPrice) <= 0
      ) {
        Alert.alert("Validation Error", "Please enter a valid original price");
        return false;
      }

      if (
        !discountPercentage.trim() ||
        isNaN(Number(discountPercentage)) ||
        Number(discountPercentage) <= 0 ||
        Number(discountPercentage) >= 100
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid discount percentage (between 1-99)"
        );
        return false;
      }

      if (Number(price) >= Number(originalPrice)) {
        Alert.alert(
          "Validation Error",
          "Sale price must be lower than the original price"
        );
        return false;
      }
    }

    if (existingImages.length === 0 && images.length === 0) {
      Alert.alert("Validation Error", "Please add at least one product image");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);

      // Upload new images
      let allImageUrls = [...existingImages];

      if (images.length > 0) {
        const newImageUrls = await uploadImages();
        if (newImageUrls.length === 0) {
          throw new Error("Failed to upload new images");
        }
        allImageUrls = [...allImageUrls, ...newImageUrls];
      }

      // Prepare product data
      const productData = {
        name,
        description,
        price: Number(price),
        category: customCategory || category,
        stock_quantity: isOnOrder ? 0 : Number(stockQuantity),
        images: allImageUrls,
        is_on_order: isOnOrder,
        is_on_sale: isOnSale,
      };

      // Add on-order specific fields if applicable
      if (isOnOrder) {
        productData.lead_time_days = Number(leadTime);

        // Set individual delivery fee columns
        productData.delivery_fee_local = localDeliveryFee
          ? Number(localDeliveryFee)
          : null;
        productData.delivery_fee_uptown = uptownDeliveryFee
          ? Number(uptownDeliveryFee)
          : null;
        productData.delivery_fee_outoftown = outOfTownDeliveryFee
          ? Number(outOfTownDeliveryFee)
          : null;
        productData.delivery_fee_countrywide = countryWideDeliveryFee
          ? Number(countryWideDeliveryFee)
          : null;
        productData.free_delivery_threshold = freeDeliveryThreshold
          ? Number(freeDeliveryThreshold)
          : null;
      } else {
        // Clear on-order fields if product is no longer on-order
        productData.lead_time_days = null;
        productData.delivery_fee_local = null;
        productData.delivery_fee_uptown = null;
        productData.delivery_fee_outoftown = null;
        productData.delivery_fee_countrywide = null;
        productData.free_delivery_threshold = null;
      }

      // Add sale specific fields if applicable
      if (isOnSale) {
        productData.discount_percentage = Number(discountPercentage);
        productData.original_price = Number(originalPrice);
      } else {
        // Clear sale fields if product is no longer on sale
        productData.discount_percentage = null;
        productData.original_price = null;
      }

      // Update product
      const { error: updateError } = await supabase
        .from("products")
        .update(productData)
        .eq("id", productId);

      if (updateError) {
        console.error("Error updating product:", updateError);
        throw updateError;
      }

      // Add category if it's custom and doesn't exist
      if (
        customCategory &&
        !categories.some(
          (c) => c.name.toLowerCase() === customCategory.toLowerCase()
        )
      ) {
        await supabase.from("categories").insert({ name: customCategory });
      }

      // Low-stock push notification to seller
      if (!isOnOrder) {
        const newQty = Number(stockQuantity);
        if (newQty > 0 && newQty <= LOW_STOCK_THRESHOLD) {
          const pushBody = `"${name}" is running low — only ${newQty} unit${newQty === 1 ? '' : 's'} left in stock.`;
          await sendPushNotification(
            user.id,
            'Low Stock Alert',
            pushBody,
            { productId }
          );
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'low_stock',
            message: pushBody,
            product_id: productId,
          });
        }
      }

      Alert.alert("Success", "Product updated successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating product:", error);
      Alert.alert("Error", "Failed to update product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={INDIGO} />
      </SafeAreaView>
    );
  }

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
          <View style={[styles.heroBubble, { width: 80,  height: 80,  bottom: -20, left: 10 }]} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={styles.heroIconBadge}>
                <Ionicons name="create-outline" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.heroTitle}>Edit Product</Text>
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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Product Images
                </Text>
                <Text style={[styles.sectionBadge, { color: muted }]}>
                  {existingImages.length + images.length}/5
                </Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: border }]} />

              <View style={styles.imageGallery}>
                {existingImages.map((imageUrl, index) => (
                  <View key={`existing-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveExistingImage(imageUrl)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.map((image, index) => (
                  <View key={`new-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {existingImages.length + images.length < 5 && (
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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Product Details
                </Text>
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
                  style={[styles.input, styles.textArea, { backgroundColor: inputBg, color: colors.text, borderColor: border, fontFamily: FONTS.regular }]}
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
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
                      <Text
                        style={[
                          styles.categoryButtonText,
                          { color: muted },
                          category === cat.name && { color: "#fff", fontFamily: FONTS.medium },
                        ]}
                      >
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
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: muted, fontFamily: FONTS.medium },
                        showCustomCategory && { color: "#fff" },
                      ]}
                    >
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

            {/* ── Sales Settings ──────────────────────────────────────── */}
            <View style={[styles.sectionContainer, { backgroundColor: surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? "#2D1B1B" : "#FEF2F2" }]}>
                  <Ionicons name="pricetag-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Sales Settings
                </Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: border }]} />

              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: colors.text, fontFamily: FONTS.medium }]}>
                  Put this product on sale
                </Text>
                <Switch
                  value={isOnSale}
                  onValueChange={(value) => {
                    setIsOnSale(value);
                    if (value && !originalPrice) {
                      setOriginalPrice(price);
                    }
                  }}
                  trackColor={{ false: border, true: "#FCA5A5" }}
                  thumbColor={isOnSale ? "#EF4444" : (isDarkMode ? "#6B7280" : "#D1D5DB")}
                />
              </View>

              {isOnSale && (
                <View>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Original Price (N$) *</Text>
                    <View style={[styles.prefixInputWrap, { backgroundColor: inputBg, borderColor: border }]}>
                      <Text style={[styles.prefixText, { color: muted, fontFamily: FONTS.medium }]}>N$</Text>
                      <TextInput
                        style={[styles.prefixInput, { color: colors.text, fontFamily: FONTS.regular }]}
                        value={originalPrice}
                        onChangeText={setOriginalPrice}
                        placeholder="0.00"
                        placeholderTextColor={muted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <Text style={[styles.helperText, { color: muted }]}>The regular price before discount</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Discount Percentage (%) *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: colors.text, fontFamily: FONTS.regular }]}
                      value={discountPercentage}
                      onChangeText={(value) => {
                        setDiscountPercentage(value);
                        if (originalPrice && !isNaN(Number(originalPrice)) && !isNaN(Number(value))) {
                          const discount = (Number(originalPrice) * Number(value)) / 100;
                          const newPrice = (Number(originalPrice) - discount).toFixed(2);
                          setPrice(newPrice);
                        }
                      }}
                      placeholder="10"
                      placeholderTextColor={muted}
                      keyboardType="decimal-pad"
                      maxLength={2}
                    />
                    <Text style={[styles.helperText, { color: muted }]}>Percentage discount off the original price</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Sale Price (N$) *</Text>
                    <View style={[styles.prefixInputWrap, { backgroundColor: inputBg, borderColor: border }]}>
                      <Text style={[styles.prefixText, { color: "#EF4444", fontFamily: FONTS.bold }]}>N$</Text>
                      <TextInput
                        style={[styles.prefixInput, { color: colors.text, fontFamily: FONTS.regular }]}
                        value={price}
                        onChangeText={setPrice}
                        placeholder="0.00"
                        placeholderTextColor={muted}
                        keyboardType="decimal-pad"
                        editable={true}
                      />
                    </View>
                    <Text style={[styles.helperText, { color: muted }]}>Final price after discount</Text>
                  </View>

                  <View style={[styles.salePreview, { backgroundColor: isDarkMode ? "#2D1B1B" : "#FEF2F2", borderColor: "#FCA5A5" }]}>
                    <View style={styles.salePreviewTag}>
                      <Text style={styles.salePreviewTagText}>{discountPercentage || "0"}% OFF</Text>
                    </View>
                    <Text style={[styles.salePreviewText, { color: muted }]}>
                      This is how the sale tag will appear on the product
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Inventory ───────────────────────────────────────────── */}
            <View style={[styles.sectionContainer, { backgroundColor: surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                  <Ionicons name="cube-outline" size={18} color={INDIGO} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Inventory
                </Text>
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

                  <TouchableOpacity
                    style={[styles.deliveryFeesHeader, { borderBottomColor: border }]}
                    onPress={() => setShowDeliveryFees(!showDeliveryFees)}
                  >
                    <View style={styles.deliveryFeesHeaderLeft}>
                      <Ionicons name="location-outline" size={18} color={INDIGO} />
                      <Text style={[styles.deliveryFeesTitle, { color: colors.text }]}>
                        Delivery Fees by Location
                      </Text>
                    </View>
                    <Ionicons
                      name={showDeliveryFees ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={muted}
                    />
                  </TouchableOpacity>

                  {showDeliveryFees && (
                    <View style={[styles.deliveryFeesContainer, { backgroundColor: isDarkMode ? "#1E1B4B20" : "#EEF2FF", borderColor: `${INDIGO}30` }]}>
                      <Text style={[styles.deliveryFeesSubtitle, { color: muted }]}>
                        Set different delivery fees based on customer location
                      </Text>

                      {[
                        { label: "Local (Same Town)", desc: "Customers in the same town as your shop", value: localDeliveryFee, setter: setLocalDeliveryFee },
                        { label: "Uptown", desc: "Customers in nearby urban areas", value: uptownDeliveryFee, setter: setUptownDeliveryFee },
                        { label: "Out of Town", desc: "Customers in different towns but same region", value: outOfTownDeliveryFee, setter: setOutOfTownDeliveryFee },
                        { label: "Country-wide", desc: "Customers anywhere in the country", value: countryWideDeliveryFee, setter: setCountryWideDeliveryFee },
                        { label: "Free Delivery Threshold", desc: "Orders above this amount qualify for free delivery", value: freeDeliveryThreshold, setter: setFreeDeliveryThreshold },
                      ].map((item, i, arr) => (
                        <View key={item.label} style={[styles.locationFeeItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: border }]}>
                          <View style={styles.locationInfo}>
                            <Text style={[styles.locationName, { color: colors.text }]}>{item.label}</Text>
                            <Text style={[styles.locationDescription, { color: muted }]}>{item.desc}</Text>
                          </View>
                          <View style={[styles.feeInputContainer, { backgroundColor: inputBg, borderColor: border }]}>
                            <Text style={[styles.currencySymbol, { color: INDIGO, fontFamily: FONTS.bold }]}>N$</Text>
                            <TextInput
                              style={[styles.feeInput, { color: colors.text }]}
                              value={item.value}
                              onChangeText={item.setter}
                              placeholder="0"
                              placeholderTextColor={muted}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
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
            disabled={isSaving || isUploading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={(isSaving || isUploading) ? ["#9CA3AF", "#9CA3AF"] : [INDIGO, VIOLET]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {isSaving || isUploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Update Product</Text>
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    fontFamily: FONTS.regular,
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

  // Switch row
  switchContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  switchLabel: { fontSize: 14, flex: 1, paddingRight: 12 },

  helperText: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 6 },

  // Sale preview
  salePreview: {
    marginTop: 14,
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  salePreviewTag: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    transform: [{ rotate: "-4deg" }],
  },
  salePreviewTagText: { color: "#fff", fontFamily: FONTS.bold, fontSize: 15 },
  salePreviewText: { fontSize: 12, fontFamily: FONTS.regular, textAlign: "center" },

  // Delivery fees
  deliveryFeesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  deliveryFeesHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  deliveryFeesTitle: { fontSize: 14, fontFamily: FONTS.medium },
  deliveryFeesContainer: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  deliveryFeesSubtitle: { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 12 },
  locationFeeItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  locationInfo: { flex: 1, paddingRight: 12 },
  locationName: { fontSize: 14, fontFamily: FONTS.medium, marginBottom: 2 },
  locationDescription: { fontSize: 12, fontFamily: FONTS.regular },
  feeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 90,
    gap: 4,
  },
  currencySymbol: { fontSize: 13 },
  feeInput: { fontSize: 14, flex: 1, fontFamily: FONTS.regular },

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

export default EditProductScreen;
