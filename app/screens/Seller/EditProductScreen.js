import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { compressImage } from '../../utils/imageHelpers';

const EditProductScreen = ({ navigation, route }) => {
  const { productId } = route.params;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
  
  // Product form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [images, setImages] = useState([]);
  const [isOnOrder, setIsOnOrder] = useState(false);
  const [leadTime, setLeadTime] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [shopId, setShopId] = useState(null);

  useEffect(() => {
    fetchProductAndCategories();
    requestMediaLibraryPermission();
  }, []);

  const fetchProductAndCategories = async () => {
    try {
      setIsLoading(true);
      
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          shop:shops(id, name)
        `)
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;
      
      if (!productData) {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
        return;
      }
      
      // Store the shopId for later use in updates
      setShopId(productData.shop_id);
      
      // Set product data in state
      setName(productData.name);
      setDescription(productData.description);
      setPrice(productData.price?.toString() || '');
      setCategory(productData.category || '');
      setStockQuantity(productData.stock_quantity?.toString() || '0');
      setIsOnOrder(productData.is_on_order || false);
      setLeadTime(productData.lead_time_days?.toString() || '');
      
      // Set existing images
      if (productData.images && Array.isArray(productData.images)) {
        setExistingImages(productData.images);
      }
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (categoriesError) throw categoriesError;
      
      setCategories(categoriesData || []);
      
      // Check if category is custom
      const categoryExists = categoriesData.some(cat => cat.name === productData.category);
      if (!categoryExists && productData.category) {
        setShowCustomCategory(true);
        setCustomCategory(productData.category);
        setCategory('');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload product images.'
      );
    }
  };

  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check total images limit
        const totalImages = existingImages.length + images.length + result.assets.length;
        if (totalImages > 5) {
          Alert.alert('Limit Reached', 'You can only have up to 5 images total');
          return;
        }

        setImages([...images, ...result.assets]);
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (url) => {
    setExistingImages(existingImages.filter(image => image !== url));
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
            throw new Error('Invalid image data received');
          }

          // Upload to Supabase
          const { data, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, arrayBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

          if (!publicUrlData?.publicUrl) {
            throw new Error('Failed to get public URL');
          }

          imageUrls.push(publicUrlData.publicUrl);

        } catch (error) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          Alert.alert('Upload Error', `Failed to upload image ${i + 1}. Please try again.`);
        }
      }

      if (imageUrls.length === 0) {
        throw new Error('No images were uploaded successfully');
      }

      return imageUrls;
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategorySelect = (value) => {
    if (value === 'custom') {
      setShowCustomCategory(true);
      setCategory('');
    } else {
      setShowCustomCategory(false);
      setCategory(value);
      setCustomCategory('');
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }
    
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Product description is required');
      return false;
    }
    
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return false;
    }
    
    if (!category.trim() && !customCategory.trim()) {
      Alert.alert('Validation Error', 'Please select or enter a category');
      return false;
    }
    
    if (!isOnOrder && (!stockQuantity.trim() || isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0)) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity');
      return false;
    }
    
    if (isOnOrder && (!leadTime.trim() || isNaN(Number(leadTime)) || Number(leadTime) <= 0)) {
      Alert.alert('Validation Error', 'Please enter a valid lead time in days');
      return false;
    }
    
    if (existingImages.length === 0 && images.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product image');
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
          throw new Error('Failed to upload new images');
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
        is_on_order: isOnOrder
      };
      
      // Update product
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId);
      
      if (error) {
        console.error('Error updating product:', error);
        throw error;
      }
      
      // Add category if it's custom and doesn't exist
      if (customCategory && !categories.some(c => c.name.toLowerCase() === customCategory.toLowerCase())) {
        await supabase
          .from('categories')
          .insert({ name: customCategory });
      }
      
      Alert.alert(
        'Success',
        'Product updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Product</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {/* Product Images */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Product Images (Up to 5)</Text>
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
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter product name"
                  maxLength={100}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter product description"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Price (N$) *</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Category *</Text>
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
                          category === cat.name && styles.selectedCategoryButtonText,
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
                    onPress={() => handleCategorySelect('custom')}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        showCustomCategory && styles.selectedCategoryButtonText,
                      ]}
                    >
                      + Custom
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
                
                {showCustomCategory && (
                  <TextInput
                    style={[styles.input, { marginTop: 10 }]}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="Enter custom category"
                    maxLength={50}
                  />
                )}
              </View>
            </View>

            {/* Inventory */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Inventory</Text>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>This is an on-order product</Text>
                <Switch
                  value={isOnOrder}
                  onValueChange={setIsOnOrder}
                  trackColor={{ false: '#e0e0e0', true: '#bbd6ff' }}
                  thumbColor={isOnOrder ? '#007AFF' : '#f4f3f4'}
                />
              </View>
              
              {isOnOrder ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Lead Time (days) *</Text>
                  <TextInput
                    style={styles.input}
                    value={leadTime}
                    onChangeText={setLeadTime}
                    placeholder="Enter lead time in days"
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>
                    How many days will it take to fulfill the order?
                  </Text>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Stock Quantity *</Text>
                  <TextInput
                    style={styles.input}
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (isSaving || isUploading) && styles.disabledButton]}
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addImageText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 5,
  },
  selectedCategoryButton: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A0C0FF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProductScreen; 