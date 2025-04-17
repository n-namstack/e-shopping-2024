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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import { MaterialIcons } from '@expo/vector-icons';
import { compressImage, compressPDF } from '../../utils/imageHelpers';

const VerificationScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingVerification, setExistingVerification] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Form state
  const [nationalId, setNationalId] = useState(null);
  const [businessType, setBusinessType] = useState('individual');
  const [hasPhysicalStore, setHasPhysicalStore] = useState(false);
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [selfieCaptured, setSelfieCaptured] = useState(null);

  useEffect(() => {
    checkExistingVerification();
  }, []);

  const checkExistingVerification = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('seller_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setExistingVerification(data);
        if (data.status === 'verified') {
          setVerificationStatus('verified');
        } else if (data.status === 'pending') {
          setVerificationStatus('pending');
        } else if (data.status === 'rejected') {
          setVerificationStatus('rejected');
          setRejectionReason(data.rejection_reason);
        }
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      Alert.alert('Error', 'Failed to check verification status');
    } finally {
      setIsLoading(false);
    }
  };
  
  const takeSelfie = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take a selfie');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setSelfieCaptured(selectedAsset);
      }
    } catch (error) {
      console.error('Error taking selfie:', error);
      Alert.alert('Error', 'Failed to capture selfie');
    }
  };
  
  const pickDocument = async (type) => {
    try {
      if (type === 'national_id') {
        // For ID documents, use document picker to support PDF
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        
        if (result.canceled === false && result.assets && result.assets.length > 0) {
          const selectedAsset = result.assets[0];
          setNationalId(selectedAsset);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };
  
  const uploadDocument = async (uri, type) => {
    try {
      let processedUri = uri;
      
      // Compress based on document type
      if (type === 'selfie') {
        processedUri = await compressImage(uri);
      } else if (type === 'national_id' && uri.toLowerCase().endsWith('.pdf')) {
        processedUri = await compressPDF(uri);
      }
      
      const response = await fetch(processedUri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, blob, {
          contentType: type === 'selfie' ? 'image/jpeg' : 'application/pdf',
        });

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };
  
  const validateForm = () => {
    if (!nationalId) {
      Alert.alert('Validation Error', 'National ID or passport is required');
      return false;
    }
    
    if (!selfieCaptured) {
      Alert.alert('Validation Error', 'A selfie photo is required for verification');
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
      const nationalIdUrl = await uploadDocument(
        nationalId.uri,
        'national_id'
      );
      
      const selfieUrl = await uploadDocument(
        selfieCaptured.uri,
        'selfie'
      );
      
      // Save verification data
      const verificationData = {
        user_id: user.id,
        national_id_url: nationalIdUrl,
        selfie_url: selfieUrl,
        business_type: businessType,
        has_physical_store: hasPhysicalStore,
        physical_address: hasPhysicalStore ? physicalAddress : '',
        additional_info: additionalInfo,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      };
      
      let error;
      
      if (existingVerification) {
        // Update existing verification
        const { error: updateError } = await supabase
          .from('seller_verifications')
          .update(verificationData)
          .eq('id', existingVerification.id);
        error = updateError;
      } else {
        // Create new verification
        const { error: insertError } = await supabase
          .from('seller_verifications')
          .insert([verificationData]);
        error = insertError;
      }
      
      if (error) throw error;
      
      // Set status to pending to show the status screen
      setVerificationStatus('pending');
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const checkVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('seller_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        if (data.status === 'verified') {
          setVerificationStatus('verified');
        } else if (data.status === 'pending') {
          setVerificationStatus('pending');
        } else if (data.status === 'rejected') {
          setVerificationStatus('rejected');
          setRejectionReason(data.rejection_reason);
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };
  
  if (verificationStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.statusContainer}>
            {verificationStatus === 'verified' ? (
              <>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="verified" size={40} color="#4CAF50" />
                </View>
                <Text style={[styles.statusTitle, { color: '#4CAF50' }]}>Account Verified</Text>
                <Text style={styles.statusText}>
                  Your account has been successfully verified. All your shops will inherit this verification status.
                </Text>
                <View style={styles.verifiedDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.detailText}>Identity Verified</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.detailText}>Business Information Verified</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.detailText}>All Shops Verified</Text>
                  </View>
                </View>
                <View style={styles.verifiedBenefits}>
                  <Text style={styles.benefitsTitle}>Verification Benefits</Text>
                  <View style={styles.benefitItem}>
                    <MaterialIcons name="star" size={20} color="#FFC107" />
                    <Text style={styles.benefitText}>Verified Badge on your shops</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <MaterialIcons name="trending-up" size={20} color="#4CAF50" />
                    <Text style={styles.benefitText}>Higher visibility in search results</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <MaterialIcons name="security" size={20} color="#2196F3" />
                    <Text style={styles.benefitText}>Increased customer trust</Text>
                  </View>
                </View>
              </>
            ) : verificationStatus === 'pending' ? (
              <>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                  <MaterialIcons name="pending" size={40} color="#FF9800" />
                </View>
                <Text style={[styles.statusTitle, { color: '#FF9800' }]}>Verification Pending</Text>
                <Text style={styles.statusText}>
                  Your verification request is being processed. We will notify you once the review is complete.
                </Text>
                <View style={styles.pendingDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="hourglass-empty" size={20} color="#FF9800" />
                    <Text style={styles.detailText}>Under Review</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="notifications" size={20} color="#FF9800" />
                    <Text style={styles.detailText}>You'll be notified when verified</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="info" size={20} color="#FF9800" />
                    <Text style={styles.detailText}>Typical review time: 1-2 business days</Text>
                  </View>
                </View>
                <View style={styles.pendingInfo}>
                  <Text style={styles.infoTitle}>What's Next?</Text>
                  <View style={styles.infoItem}>
                    <MaterialIcons name="check" size={20} color="#666" />
                    <Text style={styles.infoText}>We're reviewing your documents</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <MaterialIcons name="check" size={20} color="#666" />
                    <Text style={styles.infoText}>Verifying your business information</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <MaterialIcons name="check" size={20} color="#666" />
                    <Text style={styles.infoText}>Checking compliance with our policies</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                  <MaterialIcons name="error-outline" size={40} color="#F44336" />
                </View>
                <Text style={[styles.statusTitle, { color: '#F44336' }]}>Verification Rejected</Text>
                <Text style={styles.statusText}>
                  {rejectionReason || 'Your verification request was not approved.'}
                </Text>
                <View style={styles.rejectedDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="info" size={20} color="#F44336" />
                    <Text style={styles.detailText}>Please review the requirements</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="refresh" size={20} color="#F44336" />
                    <Text style={styles.detailText}>You can submit a new request</Text>
                  </View>
                </View>
                <View style={styles.rejectionTips}>
                  <Text style={styles.tipsTitle}>Tips for Resubmission</Text>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="photo-camera" size={20} color="#666" />
                    <Text style={styles.tipText}>Ensure clear, readable documents</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="description" size={20} color="#666" />
                    <Text style={styles.tipText}>Provide complete business information</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="help" size={20} color="#666" />
                    <Text style={styles.tipText}>Contact support if you need help</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.resubmitButton}
                  onPress={() => setVerificationStatus(null)}
                >
                  <Text style={styles.resubmitButtonText}>Submit New Request</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Shop verification helps us ensure the authenticity and legitimacy of sellers on our platform.
              Verified shops receive a badge and gain customer trust.
            </Text>
          </View>
          
          {/* Selfie Capture */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Seller Photo Verification</Text>
            
            <View style={styles.selfieContainer}>
              {selfieCaptured ? (
                <View style={styles.capturedSelfieContainer}>
                  <Image 
                    source={{ uri: selfieCaptured.uri }} 
                    style={styles.selfieImage} 
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.retakeButton}
                    onPress={takeSelfie}
                  >
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.selfieButton}
                  onPress={takeSelfie}
                >
                  <Ionicons name="camera" size={40} color={COLORS.primary} />
                  <Text style={styles.selfieButtonText}>Take a Selfie</Text>
                  <Text style={styles.selfieDescription}>
                    We need a clear photo of your face to verify your identity
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Documentation */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            
            <View style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>National ID/Passport *</Text>
                <Text style={styles.documentDescription}>
                  Upload a clear copy of your ID card or passport (PDF accepted)
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
                    <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
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
                thumbColor={hasPhysicalStore ? COLORS.primary : '#f4f3f4'}
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
    borderColor: COLORS.primary,
    minWidth: 100,
  },
  documentSelected: {
    backgroundColor: '#E3F2FD',
  },
  uploadText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 5,
  },
  documentSelectedText: {
    fontSize: 12,
    color: COLORS.primary,
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
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioButtonSelected: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selfieContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  selfieButton: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 20,
  },
  selfieButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 5,
  },
  selfieDescription: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  capturedSelfieContainer: {
    width: '100%',
    alignItems: 'center',
  },
  selfieImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  retakeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  verifiedDetails: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  pendingDetails: {
    width: '100%',
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  rejectedDetails: {
    width: '100%',
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  resubmitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  resubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  verifiedBenefits: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  pendingInfo: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.2)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  rejectionTips: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default VerificationScreen; 