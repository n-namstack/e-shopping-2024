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
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";

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
  
  const selectImage = async (type) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (type === 'logo') {
          setLogo(result.assets[0]);
        } else {
          setBanner(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const uploadImage = async (uri, path) => {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Selected image is empty or invalid');
      }

      // Upload to Supabase
      const { error } = await supabase.storage
        .from('shop-images')
        .upload(path, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        if (error.message.includes('Payload too large')) {
          throw new Error('Image is too large. Please select a smaller image (max 5MB)');
        }
        throw error;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('shop-images')
        .getPublicUrl(path);

      if (!data?.publicUrl) {
        throw new Error('Failed to get image URL');
      }

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error(error.message || 'Failed to upload image. Please try again.');
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
        try {
          const fileExt = logo.uri.split('.').pop();
          const fileName = `${user.id}_logo_${Date.now()}.${fileExt}`;
          const filePath = `shops/${fileName}`;
          logoUrl = await uploadImage(logo.uri, filePath);
        } catch (error) {
          Alert.alert('Error', `Failed to upload logo: ${error.message}`);
          return;
        }
      }
      
      if (banner) {
        try {
          const fileExt = banner.uri.split('.').pop();
          const fileName = `${user.id}_banner_${Date.now()}.${fileExt}`;
          const filePath = `shops/${fileName}`;
          bannerUrl = await uploadImage(banner.uri, filePath);
        } catch (error) {
          Alert.alert('Error', `Failed to upload banner: ${error.message}`);
          return;
        }
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
      
      if (error) {
        console.error('Error creating shop:', error);
        throw new Error('Failed to create shop in database');
      }
      
      Alert.alert(
        'Success',
        'Your shop has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('ShopDetails', { shopId: data.id });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating shop:', error);
      Alert.alert('Error', error.message || 'Failed to create shop. Please try again.');
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
              onPress={() => selectImage('banner')}
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
              onPress={() => selectImage('logo')}
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

          {/* Verification Notice */}
          <View style={styles.verificationNotice}>
            <View style={styles.verificationHeader}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <Text style={styles.verificationTitle}>Account Verification Required</Text>
            </View>
            <Text style={styles.verificationText}>
              To ensure a safe and trustworthy marketplace, all sellers must verify their account before their shop and products can be visible to customers.
            </Text>
            <Text style={styles.verificationSteps}>
              • Take a selfie photo{'\n'}
              • Upload your national ID or passport{'\n'}
              • Provide your business information
            </Text>
            <TouchableOpacity 
              style={styles.verifyNowButton}
              onPress={() => navigation.navigate('Verification')}
            >
              <Text style={styles.verifyNowButtonText}>Verify Your Account Now</Text>
            </TouchableOpacity>
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
  verificationNotice: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  verificationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  verificationSteps: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 22,
  },
  verifyNowButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  verifyNowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CreateShopScreen; 