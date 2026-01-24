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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { compressImage } from "../../utils/imageHelpers";
import { useTheme } from "@react-navigation/native";
import { COLORS, FONTS } from "../../constants/theme";

const EditProductScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
  const { colors } = useTheme();

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
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: colors.border }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text, fontFamily: FONTS.bold },
            ]}
          >
            Edit Product
          </Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {/* Product Images */}
            <View
              style={[
                styles.sectionContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontFamily: FONTS.medium },
                ]}
              >
                Product Images (Up to 5)
              </Text>
              <View style={styles.imageGallery}>
                {/* Existing Images */}
                {existingImages.map((imageUrl, index) => (
                  <View key={`existing-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveExistingImage(imageUrl)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* New Images */}
                {images.map((image, index) => (
                  <View key={`new-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add Image Button */}
                {existingImages.length + images.length < 5 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={handleSelectImages}
                  >
                    <Ionicons name="camera-outline" size={30} color="#999" />
                    <Text style={styles.addImageText}>Add Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Product Details */}
            <View
              style={[
                styles.sectionContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontFamily: FONTS.medium },
                ]}
              >
                Product Details
              </Text>

              <View style={styles.inputContainer}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.text, fontFamily: FONTS.regular },
                  ]}
                >
                  Product Name *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                      color: colors.text,
                      fontFamily: FONTS.regular,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter product name"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.text, fontFamily: FONTS.regular },
                  ]}
                >
                  Description *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                      borderWidth: 1,
                      fontFamily: FONTS.regular,
                    },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter product description"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.text, fontFamily: FONTS.regular },
                  ]}
                >
                  Price (N$) *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                      borderWidth: 1,
                      fontFamily: FONTS.regular,
                    },
                  ]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.text, fontFamily: FONTS.regular },
                  ]}
                >
                  Category *
                </Text>
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
                        category === cat.name && styles.selectedCategoryButton,
                      ]}
                      onPress={() => handleCategorySelect(cat.name)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          category === cat.name &&
                            styles.selectedCategoryButtonText,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      showCustomCategory && styles.selectedCategoryButton,
                    ]}
                    onPress={() => handleCategorySelect("custom")}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { fontFamily: FONTS.medium },
                        showCustomCategory && styles.selectedCategoryButtonText,
                      ]}
                    >
                      + Custom
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {showCustomCategory && (
                  <TextInput
                    style={[
                      styles.input,
                      { marginTop: 10 },
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1,
                        fontFamily: FONTS.regular,
                      },
                    ]}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="Enter custom category"
                    maxLength={50}
                  />
                )}
              </View>
            </View>

            {/* Sales Section */}
            <View
              style={[
                styles.sectionContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontFamily: FONTS.medium },
                ]}
              >
                Sales Settings
              </Text>

              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Put this product on sale
                </Text>
                <Switch
                  value={isOnSale}
                  onValueChange={(value) => {
                    setIsOnSale(value);
                    if (value && !originalPrice) {
                      // If enabling sale and original price is empty, set it to current price
                      setOriginalPrice(price);
                    }
                  }}
                  trackColor={{ false: "#e0e0e0", true: "#ffb2b2" }}
                  thumbColor={isOnSale ? "#FF3B30" : "#f4f3f4"}
                />
              </View>

              {isOnSale && (
                <View>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Original Price (N$) *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      value={originalPrice}
                      onChangeText={setOriginalPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.helperText}>
                      The regular price before discount
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Discount Percentage (%) *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          borderWidth: 1,
                          color: colors.text,
                        },
                      ]}
                      value={discountPercentage}
                      onChangeText={(value) => {
                        setDiscountPercentage(value);
                        if (
                          originalPrice &&
                          !isNaN(Number(originalPrice)) &&
                          !isNaN(Number(value))
                        ) {
                          // Calculate the discounted price
                          const discount =
                            (Number(originalPrice) * Number(value)) / 100;
                          const newPrice = (
                            Number(originalPrice) - discount
                          ).toFixed(2);
                          setPrice(newPrice);
                        }
                      }}
                      placeholder="10"
                      keyboardType="decimal-pad"
                      maxLength={2}
                    />
                    <Text style={styles.helperText}>
                      Percentage discount off the original price
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Sale Price (N$) *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          borderWidth: 1,
                          color: colors.text,
                        },
                      ]}
                      value={price}
                      onChangeText={setPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      editable={true}
                    />
                    <Text style={styles.helperText}>
                      Final price after discount
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.salePreview,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <View style={styles.salePreviewTag}>
                      <Text style={styles.salePreviewTagText}>
                        {discountPercentage || "0"}% OFF
                      </Text>
                    </View>
                    <Text style={styles.salePreviewText}>
                      This is how the sale tag will appear on the product
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Inventory */}
            <View
              style={[
                styles.sectionContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontFamily: FONTS.medium },
                ]}
              >
                Inventory
              </Text>

              <View style={styles.switchContainer}>
                <Text style={[(styles.switchLabel, { color: colors.text })]}>
                  This is an on-order product
                </Text>
                <Switch
                  value={isOnOrder}
                  onValueChange={setIsOnOrder}
                  trackColor={{ false: "#e0e0e0", true: "#bbd6ff" }}
                  thumbColor={isOnOrder ? "#007AFF" : "#f4f3f4"}
                />
              </View>

              {isOnOrder ? (
                <View>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Lead Time (days) *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          borderWidth: 1,
                          color: colors.text,
                        },
                      ]}
                      value={leadTime}
                      onChangeText={setLeadTime}
                      placeholder="Enter lead time in days"
                      keyboardType="numeric"
                    />
                    <Text style={styles.helperText}>
                      How many days will it take to fulfill the order?
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.deliveryFeesHeader,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => setShowDeliveryFees(!showDeliveryFees)}
                  >
                    <View style={styles.deliveryFeesHeaderLeft}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={colors.text}
                      />
                      <Text
                        style={[
                          styles.deliveryFeesTitle,
                          { color: colors.text },
                        ]}
                      >
                        Delivery Fees by Location
                      </Text>
                    </View>
                    <Ionicons
                      name={showDeliveryFees ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  {showDeliveryFees && (
                    <View
                      style={[
                        styles.deliveryFeesContainer,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deliveryFeesSubtitle,
                          { color: colors.text },
                        ]}
                      >
                        Set different delivery fees based on customer location
                      </Text>

                      <View
                        style={[
                          styles.locationFeeItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.locationInfo}>
                          <Text
                            style={[
                              styles.locationName,
                              { color: colors.text },
                            ]}
                          >
                            Local (Same Town)
                          </Text>
                          <Text
                            style={[
                              styles.locationDescription,
                              { color: colors.text },
                            ]}
                          >
                            Customers in the same town as your shop
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.feeInputContainer,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              (styles.currencySymbol,
                              { color: colors.text, fontFamily: FONTS.medium }),
                            ]}
                          >
                            N$
                          </Text>
                          <TextInput
                            style={[
                              styles.feeInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                borderWidth: 1,
                                color: colors.text,
                              },
                            ]}
                            value={localDeliveryFee}
                            onChangeText={setLocalDeliveryFee}
                            placeholder="0"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.locationFeeItem,
                          {
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.locationInfo]}>
                          <Text
                            style={[
                              styles.locationName,
                              { color: colors.text },
                            ]}
                          >
                            Uptown
                          </Text>
                          <Text
                            style={[
                              styles.locationDescription,
                              { color: colors.text },
                            ]}
                          >
                            Customers in nearby urban areas
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.feeInputContainer,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencySymbol,
                              { color: colors.text, fontFamily: FONTS.medium },
                            ]}
                          >
                            N$
                          </Text>
                          <TextInput
                            style={[
                              styles.feeInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                borderWidth: 1,
                                color: colors.text,
                              },
                            ]}
                            value={uptownDeliveryFee}
                            onChangeText={setUptownDeliveryFee}
                            placeholder="0"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.locationFeeItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.locationInfo}>
                          <Text
                            style={[
                              styles.locationName,
                              { color: colors.text },
                            ]}
                          >
                            Out of Town
                          </Text>
                          <Text
                            style={[
                              styles.locationDescription,
                              { color: colors.text },
                            ]}
                          >
                            Customers in different towns but same region
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.feeInputContainer,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencySymbol,
                              { color: colors.text, fontFamily: FONTS.medium },
                            ]}
                          >
                            N$
                          </Text>
                          <TextInput
                            style={[
                              styles.feeInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                borderWidth: 1,
                                color: colors.text,
                              },
                            ]}
                            value={outOfTownDeliveryFee}
                            onChangeText={setOutOfTownDeliveryFee}
                            placeholder="0"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.locationFeeItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.locationInfo}>
                          <Text
                            style={[
                              styles.locationName,
                              { color: colors.text },
                            ]}
                          >
                            Country-wide
                          </Text>
                          <Text
                            style={[
                              styles.locationDescription,
                              { color: colors.text },
                            ]}
                          >
                            Customers anywhere in the country
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.feeInputContainer,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencySymbol,
                              { color: colors.text, fontFamily: FONTS.medium },
                            ]}
                          >
                            N$
                          </Text>
                          <TextInput
                            style={[
                              styles.feeInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                borderWidth: 1,
                                color: colors.text,
                              },
                            ]}
                            value={countryWideDeliveryFee}
                            onChangeText={setCountryWideDeliveryFee}
                            placeholder="0"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.locationFeeItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.locationInfo}>
                          <Text
                            style={[
                              styles.locationName,
                              { color: colors.text },
                            ]}
                          >
                            Free Delivery Threshold
                          </Text>
                          <Text
                            style={[
                              styles.locationDescription,
                              { color: colors.text },
                            ]}
                          >
                            Orders above this amount qualify for free delivery
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.feeInputContainer,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencySymbol,
                              { color: colors.text, fontFamily: FONTS.medium },
                            ]}
                          >
                            N$
                          </Text>
                          <TextInput
                            style={[
                              styles.feeInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                borderWidth: 1,
                                color: colors.text,
                              },
                            ]}
                            value={freeDeliveryThreshold}
                            onChangeText={setFreeDeliveryThreshold}
                            placeholder="0"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Stock Quantity *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderWidth: 1,
                        color: colors.text,
                      },
                    ]}
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    placeholder="Enter available quantity"
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSaving || isUploading) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={isSaving || isUploading}
          >
            {isSaving || isUploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Update Product</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  deliveryFeesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  deliveryFeesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryFeesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  deliveryFeesContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  deliveryFeesSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  locationFeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  locationInfo: {
    flex: 1,
    paddingRight: 10,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 3,
  },
  locationDescription: {
    fontSize: 13,
    color: "#777",
  },
  feeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    minWidth: 100,
  },
  currencySymbol: {
    fontSize: 14,
    color: "#555",
    marginRight: 5,
  },
  feeInput: {
    fontSize: 14,
    flex: 1,
    paddingVertical: 5,
    paddingLeft: 5,
    marginLeft: 5,
  },
  thresholdContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  thresholdLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  spacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 15,
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  imageGallery: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  addImageText: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 5,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
    marginBottom: 5,
  },
  selectedCategoryButton: {
    backgroundColor: "#007AFF",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#333",
  },
  selectedCategoryButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 14,
    color: "#333",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  salePreview: {
    marginTop: 15,
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  salePreviewTag: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 10,
    transform: [{ rotate: "-5deg" }],
  },
  salePreviewTagText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  salePreviewText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#fff",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#A0C0FF",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EditProductScreen;
