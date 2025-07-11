import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS } from '../../constants/theme';

const AccountDeletionScreen = () => {
  const navigation = useNavigation();
  const { deleteAccount } = useAuthStore();
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const deletionReasons = [
    'I no longer need this account',
    'Privacy concerns',
    'Too many emails/notifications',
    'Found a better alternative',
    'Technical issues',
    'Other'
  ];

  const dataToAnonymize = [
    'Profile information (name, email, phone) - replaced with "Deleted User"',
    'Shop information (if seller) - marked as "Shop by Deleted User"',
    'Personal messages and private data',
    'Verification documents and personal uploads',
    'Wishlist, preferences, and personal settings'
  ];

  const dataToKeep = [
    'Order history (anonymized) - needed for tracking and business records',
    'Product listings (if seller) - marked as from deleted user',
    'Reviews (anonymized) - important for other users and business integrity',
    'Transaction records - required for legal and tax compliance'
  ];

  const handleDeleteAccount = async () => {
    if (confirmationText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "DELETE" to confirm account deletion.');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for account deletion.');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This will permanently delete your account and all associated data. This action cannot be undone. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: performDeletion
        }
      ]
    );
  };

  const performDeletion = async () => {
    try {
      setIsDeleting(true);
      
      const { success, error } = await deleteAccount();
      
      if (success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been permanently deleted. You have been logged out and will need to create a new account to use the app again.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigation will automatically redirect to auth screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          error || 'Failed to delete account. Please try again or contact support.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Section */}
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="information-circle" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.warningTitle}>Account Anonymization</Text>
          <Text style={styles.warningText}>
            Your personal information will be removed, but some data is kept anonymized for business continuity and legal compliance (similar to Instagram, Amazon).
          </Text>
        </View>

        {/* Data to be anonymized */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal data that will be removed/anonymized:</Text>
          <View style={styles.dataList}>
            {dataToAnonymize.map((item, index) => (
              <View key={index} style={styles.dataItem}>
                <Ionicons name="eye-off" size={16} color="#f59e0b" />
                <Text style={styles.dataItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Data to be kept */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business data kept (anonymized):</Text>
          <View style={styles.dataList}>
            {dataToKeep.map((item, index) => (
              <View key={index} style={styles.dataItem}>
                <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                <Text style={styles.dataItemText}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.keepDataExplanation}>
            This approach protects other users' order history and maintains business integrity while removing your personal information.
          </Text>
        </View>

        {/* Alternatives */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consider these alternatives:</Text>
          <View style={styles.alternativesList}>
            <TouchableOpacity style={styles.alternativeItem}>
              <Ionicons name="pause-circle" size={20} color="#f59e0b" />
              <Text style={styles.alternativeText}>Temporarily deactivate your account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.alternativeItem}>
              <Ionicons name="settings" size={20} color="#3b82f6" />
              <Text style={styles.alternativeText}>Update your privacy settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.alternativeItem}>
              <Ionicons name="mail" size={20} color="#10b981" />
              <Text style={styles.alternativeText}>Manage email notifications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reason Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why are you deleting your account?</Text>
          <View style={styles.reasonsList}>
            {deletionReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.reasonItem,
                  selectedReason === reason && styles.reasonItemSelected
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={[
                  styles.radioButton,
                  selectedReason === reason && styles.radioButtonSelected
                ]}>
                  {selectedReason === reason && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Confirmation Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type "DELETE" to confirm:</Text>
          <TextInput
            style={styles.confirmationInput}
            value={confirmationText}
            onChangeText={setConfirmationText}
            placeholder="Type DELETE here"
            autoCapitalize="characters"
          />
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[
            styles.deleteButton,
            (confirmationText.toLowerCase() !== 'delete' || !selectedReason || isDeleting) && 
            styles.deleteButtonDisabled
          ]}
          onPress={handleDeleteAccount}
          disabled={confirmationText.toLowerCase() !== 'delete' || !selectedReason || isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need help?</Text>
          <Text style={styles.supportText}>
            If you're having issues with your account, our support team is here to help.
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Ionicons name="help-circle" size={20} color="#3b82f6" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningCard: {
    backgroundColor: '#fef2f2',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  warningIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#7f1d1d',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  dataList: {
    gap: 12,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataItemText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    flex: 1,
  },
  keepDataExplanation: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  alternativesList: {
    gap: 12,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  alternativeText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    flex: 1,
  },
  reasonsList: {
    gap: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3b82f6',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  reasonText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    flex: 1,
  },
  confirmationInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    backgroundColor: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginVertical: 20,
  },
  deleteButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#fff',
  },
  supportSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
  },
  supportButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#3b82f6',
  },
});

export default AccountDeletionScreen; 