import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

const CreateShopScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  
  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload images.'
      );
      return false;
    }
    return true;
  };
  
  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        exif: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Log image details
        console.log('Selected image:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          type: selectedImage.type,
          fileSize: selectedImage.fileSize
        });

        // Basic validation
        if (selectedImage.fileSize && selectedImage.fileSize > 5 * 1024 * 1024) { // 5MB
          Alert.alert(
            'Image Too Large',
            'Please select an image smaller than 5MB.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (type === 'logo') {
          setLogo(selectedImage);
        } else {
          setBanner(selectedImage);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  
  const uploadShopImage = async (imageUri) => {
    try {
      if (!imageUri) return null;

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const fileName = `${timestamp}_${random}.jpg`;
      const filePath = `shops/${user.id}/${fileName}`;

      // Get image data as ArrayBuffer with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const fetchResponse = await fetch(imageUri, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }

        const blob = await fetchResponse.blob();
        if (!blob || blob.size === 0) {
          throw new Error('Invalid image data received');
        }

        console.log('Image blob size:', blob.size, 'bytes');

        // Upload to Supabase with explicit content type
        const { data, error: uploadError } = await supabase.storage
          .from('shop-images')
          .upload(filePath, blob, {
            contentType: blob.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('shop-images')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        console.log('Successfully uploaded image:', {
          path: filePath,
          size: blob.size,
          type: blob.type,
          url: publicUrlData.publicUrl
        });

        return publicUrlData.publicUrl;

      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Image upload timed out. Please try again.');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      console.error('Error uploading shop image:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to upload shop image. ';
      if (error.message.includes('Network request failed')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (error.message.includes('timed out')) {
        errorMessage += 'The upload timed out. Please try again.';
      } else if (error.statusCode === 413) {
        errorMessage += 'The image file is too large. Please choose a smaller image.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      Alert.alert('Upload Error', errorMessage);
      return null;
    }
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Shop name is required');
      return false;
    }
    
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Shop description is required');
      return false;
    }
    
    if (!location.trim()) {
      Alert.alert('Validation Error', 'Shop location is required');
      return false;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Contact phone number is required');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Contact email is required');
      return false;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      
      // Upload images if selected
      let logoUrl = null;
      let bannerUrl = null;
      
      if (logo) {
        logoUrl = await uploadShopImage(logo.uri);
      }
      
      if (banner) {
        bannerUrl = await uploadShopImage(banner.uri);
      }
      
      // Create shop in database
      const { data, error } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          name,
          description,
          location,
          phone_number: phoneNumber,
          email: email,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          verification_status: 'not_submitted',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      Alert.alert(
        'Success',
        'Your shop has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to shop details or verification screen
              navigation.navigate('ShopDetails', { shopId: data.id });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating shop:', error);
      Alert.alert('Error', 'Failed to create shop. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
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
          <Text style={styles.headerTitle}>Create New Shop</Text>
          <View style={styles.spacer} />
        </View>
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Banner Image */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shop Banner</Text>
            <TouchableOpacity
              style={styles.bannerContainer}
              onPress={() => pickImage('banner')}
            >
              {banner ? (
                <Image source={{ uri: banner.uri }} style={styles.bannerImage} />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                  <Text style={styles.placeholderText}>
                    Tap to add a banner image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Logo Image */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shop Logo</Text>
            <TouchableOpacity
              style={styles.logoContainer}
              onPress={() => pickImage('logo')}
            >
              {logo ? (
                <Image source={{ uri: logo.uri }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="camera-outline" size={30} color="#ccc" />
                  <Text style={styles.placeholderText}>
                    Tap to add a logo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Shop Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shop Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your shop name"
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your shop and what you sell"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter your shop location (City, Country)"
                maxLength={100}
              />
            </View>
          </View>
          
          {/* Contact Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter contact phone number"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter contact email"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>
          </View>
          
          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.termsText}>
              By creating a shop, you agree to our Terms of Service and Seller Guidelines. 
              Your shop will need to be verified before you can start selling products.
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Shop</Text>
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
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
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
  bannerContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    alignSelf: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    padding: 10,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
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

export default CreateShopScreen; 