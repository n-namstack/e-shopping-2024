import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const SellerRegisterScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    businessAddress: '',
    businessType: '',
    taxId: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Get token from user object or AsyncStorage
      const token = user?.token || await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'You need to be logged in to register as a seller');
        return;
      }
      
      // Use the correct API endpoint
      const API_URL = 'http://10.0.2.2:3000/api';
      
      console.log('Submitting seller application with data:', formData);
      
      const response = await fetch(`${API_URL}/seller/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        Alert.alert(
          'Application Submitted', 
          'Your seller application has been submitted and is pending review.',
          [{ text: 'OK', onPress: () => navigation.navigate('Profile') }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to register as seller');
      }
    } catch (error) {
      console.error('Seller registration error:', error);
      Alert.alert('Error', 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Seller Registration</Text>
        <Text style={styles.subtitle}>Complete your business profile</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
              placeholder="Enter your business name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Address</Text>
            <TextInput
              style={styles.input}
              value={formData.businessAddress}
              onChangeText={(text) => setFormData({ ...formData, businessAddress: text })}
              placeholder="Enter your business address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Type</Text>
            <TextInput
              style={styles.input}
              value={formData.businessType}
              onChangeText={(text) => setFormData({ ...formData, businessType: text })}
              placeholder="e.g. Retail, Wholesale, Manufacturing"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax ID</Text>
            <TextInput
              style={styles.input}
              value={formData.taxId}
              onChangeText={(text) => setFormData({ ...formData, taxId: text })}
              placeholder="Enter your tax ID"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Describe your business"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SellerRegisterScreen; 