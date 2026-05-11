import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';

const ShippingAddressScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

      const response = await fetch(`${API_URL}/api/shipping-addresses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch addresses');
      }

      setAddresses(data.addresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setFormData({
      fullName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: false,
    });
    setModalVisible(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setFormData({
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      isDefault: address.isDefault,
    });
    setModalVisible(true);
  };

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

              const response = await fetch(`${API_URL}/api/shipping-addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete address');
              }

              setAddresses(addresses.filter(addr => addr.id !== addressId));
              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', error.message || 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.street.trim() ||
        !formData.city.trim() || !formData.state.trim() || !formData.zipCode.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

      const method = editingAddress ? 'PUT' : 'POST';
      const url = editingAddress
        ? `${API_URL}/api/shipping-addresses/${editingAddress.id}`
        : `${API_URL}/api/shipping-addresses`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save address');
      }

      if (editingAddress) {
        setAddresses(addresses.map(addr =>
          addr.id === editingAddress.id ? data.address : addr
        ));
      } else {
        setAddresses([...addresses, data.address]);
      }

      setModalVisible(false);
      Alert.alert('Success', `Address ${editingAddress ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', error.message || 'Failed to save address');
    }
  };

  const renderAddressCard = (address) => (
    <View key={address.id} style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.addressHeader}>
        <View style={styles.addressInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{address.fullName}</Text>
          <Text style={[styles.phone, { color: isDarkMode ? '#aaa' : '#64748b' }]}>{address.phone}</Text>
        </View>
        {address.isDefault && (
          <View style={[styles.defaultBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#0f172a20' }]}>
            <Text style={[styles.defaultText, { color: colors.text }]}>Default</Text>
          </View>
        )}
      </View>

      <Text style={[styles.address, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        {address.street}
      </Text>
      <Text style={[styles.address, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        {`${address.city}, ${address.state} ${address.zipCode}`}
      </Text>

      <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton, { borderRightColor: colors.border }]}
          onPress={() => handleEditAddress(address)}
        >
          <Ionicons name="pencil" size={20} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAddress(address.id)}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Shipping Addresses</Text>
      </View>

      <ScrollView style={styles.content}>
        {addresses.map(renderAddressCard)}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddAddress}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                  placeholder="Enter full name"
                  placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Street Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={formData.street}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, street: text }))}
                  placeholder="Enter street address"
                  placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={formData.city}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                  placeholder="Enter city"
                  placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>State</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={formData.state}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                  placeholder="Enter state"
                  placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>ZIP Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={formData.zipCode}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
                  placeholder="Enter ZIP code"
                  keyboardType="number-pad"
                  placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                />
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    formData.isDefault && styles.checkboxChecked,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                >
                  {formData.isDefault && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  Set as default shipping address
                </Text>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {editingAddress ? 'Update Address' : 'Add Address'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  phone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: '#0f172a20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0f172a',
  },
  address: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  editButton: {
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  deleteButton: {
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#0f172a',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShippingAddressScreen; 