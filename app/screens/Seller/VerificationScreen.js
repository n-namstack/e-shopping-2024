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
  Switch,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

const VerificationScreen = ({ navigation, route }) => {
  const { shopId } = route.params;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shop, setShop] = useState(null);
  
  // Form state
  const [businessLicense, setBusinessLicense] = useState(null);
  const [nationalId, setNationalId] = useState(null);
  const [taxId, setTaxId] = useState('');
  const [businessType, setBusinessType] = useState('individual');
  const [hasPhysicalStore, setHasPhysicalStore] = useState(false);
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  useEffect(() => {
    fetchShopDetails();
  }, []);
  
  const fetchShopDetails = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
        return;
      }
      
      setShop(data);
      
      // Check if verification was already started
      if (data.verification_status === 'pending') {
        Alert.alert(
          'Verification In Progress',
          'Your shop verification is already being processed. We will notify you once the review is complete.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error fetching shop details:', error.message);
      Alert.alert('Error', 'Failed to load shop details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  const pickDocument = async (type) => {
    try {
      // Select image from media library
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        if (type === 'business_license') {
          setBusinessLicense(selectedAsset);
        } else if (type === 'national_id') {
          setNationalId(selectedAsset);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };
  
  const uploadDocument = async (uri, fileName) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filePath = `verification/${shopId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('verification-docs')
        .upload(filePath, blob);
      
      if (error) throw error;
      
      const { data } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };
  
  const validateForm = () => {
    if (!businessLicense) {
      Alert.alert('Validation Error', 'Business license or permit is required');
      return false;
    }
    
    if (!nationalId) {
      Alert.alert('Validation Error', 'National ID or passport is required');
      return false;
    }
    
    if (!taxId.trim()) {
      Alert.alert('Validation Error', 'Tax identification number is required');
      return false;
    }
    
    if (hasPhysicalStore && !physicalAddress.trim()) {
      Alert.alert('Validation Error', 'Physical store address is required');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      // Upload documents
      const businessLicenseUrl = await uploadDocument(
        businessLicense.uri,
        `business_license_${Date.now()}.${businessLicense.name.split('.').pop()}`
      );
      
      const nationalIdUrl = await uploadDocument(
        nationalId.uri,
        `national_id_${Date.now()}.${nationalId.name.split('.').pop()}`
      );
      
      // Save verification data
      const verificationData = {
        business_license_url: businessLicenseUrl,
        national_id_url: nationalIdUrl,
        tax_id: taxId,
        business_type: businessType,
        has_physical_store: hasPhysicalStore,
        physical_address: hasPhysicalStore ? physicalAddress : '',
        additional_info: additionalInfo,
        submitted_at: new Date().toISOString(),
      };
      
      // Update shop with verification data and change status
      const { error } = await supabase
        .from('shops')
        .update({
          verification_data: verificationData,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);
      
      if (error) throw error;
      
      Alert.alert(
        'Verification Submitted',
        'Your shop verification request has been submitted successfully. We will review your application and get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Shops'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
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
          <Text style={styles.headerTitle}>Shop Verification</Text>
          <View style={styles.spacer} />
        </View>
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" />
            <Text style={styles.infoText}>
              Shop verification helps us ensure the authenticity and legitimacy of sellers on our platform.
              Verified shops receive a badge and gain customer trust.
            </Text>
          </View>
          
          {/* Documentation */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            
            <View style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>Business License/Permit *</Text>
                <Text style={styles.documentDescription}>
                  Upload a clear copy of your business license or operating permit
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  businessLicense && styles.documentSelected,
                ]}
                onPress={() => pickDocument('business_license')}
              >
                {businessLicense ? (
                  <Text style={styles.documentSelectedText} numberOfLines={1}>
                    {businessLicense.name}
                  </Text>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
                    <Text style={styles.uploadText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>National ID/Passport *</Text>
                <Text style={styles.documentDescription}>
                  Upload a clear copy of your ID card or passport
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  nationalId && styles.documentSelected,
                ]}
                onPress={() => pickDocument('national_id')}
              >
                {nationalId ? (
                  <Text style={styles.documentSelectedText} numberOfLines={1}>
                    {nationalId.name}
                  </Text>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
                    <Text style={styles.uploadText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Business Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tax Identification Number *</Text>
              <TextInput
                style={styles.input}
                value={taxId}
                onChangeText={setTaxId}
                placeholder="Enter your tax ID number"
                maxLength={30}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Business Type *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('individual')}
                >
                  <View style={styles.radioButton}>
                    {businessType === 'individual' && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Individual/Sole Proprietor</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('company')}
                >
                  <View style={styles.radioButton}>
                    {businessType === 'company' && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Registered Company</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('partnership')}
                >
                  <View style={styles.radioButton}>
                    {businessType === 'partnership' && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Partnership</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Do you have a physical store?</Text>
              <Switch
                value={hasPhysicalStore}
                onValueChange={setHasPhysicalStore}
                trackColor={{ false: '#e0e0e0', true: '#bbd6ff' }}
                thumbColor={hasPhysicalStore ? '#007AFF' : '#f4f3f4'}
              />
            </View>
            
            {hasPhysicalStore && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Physical Store Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={physicalAddress}
                  onChangeText={setPhysicalAddress}
                  placeholder="Enter complete address of your physical store"
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>
            )}
          </View>
          
          {/* Additional Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Additional Information (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              placeholder="Provide any additional information that might help in the verification process"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
          
          {/* Terms Agreement */}
          <View style={styles.termsContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.termsText}>
              By submitting this verification request, I confirm that all the information provided is accurate and true.
              I understand that providing false information may result in my account being suspended.
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSaving && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
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
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0D47A1',
    marginLeft: 10,
    lineHeight: 20,
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
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentInfo: {
    flex: 1,
    marginRight: 10,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  documentDescription: {
    fontSize: 12,
    color: '#666',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    minWidth: 100,
  },
  documentSelected: {
    backgroundColor: '#E3F2FD',
  },
  uploadText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 5,
  },
  documentSelectedText: {
    fontSize: 12,
    color: '#007AFF',
    maxWidth: 150,
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
  radioGroup: {
    marginTop: 5,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioButtonSelected: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
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

export default VerificationScreen; 