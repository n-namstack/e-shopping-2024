import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS } from '../../constants/theme';
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold
} from "@expo-google-fonts/jost";

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    cellphone_no: '',
  });
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_700Bold, Jost_500Medium, Jost_600SemiBold });

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setFetchingData(true);
        
        // Get the authenticated user session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Auth session:", session ? "Found" : "Not found");
        
        if (!session?.user?.id) {
          console.log('No authenticated user found');
          setFetchingData(false);
          return;
        }
        
        const userId = session.user.id;
        console.log("User ID for profile fetch:", userId);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        console.log("Profile data:", data);
        console.log("Profile error:", error);
        
        if (error) {
          console.error('Error fetching profile:', error);
          if (error.code === 'PGRST116') {
            // No profile found, just use the email from session
            setFormData({
              firstname: '',
              lastname: '',
              email: session.user.email || '',
              cellphone_no: '',
            });
          } else {
            throw error;
          }
        } else if (data) {
          console.log("Setting form data with profile:", data);
          setFormData({
            firstname: data.firstname || '',
            lastname: data.lastname || '',
            email: session.user.email || '',
            cellphone_no: data.cellphone_no || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error.message);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setFetchingData(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  const validateForm = () => {
    if (!formData.firstname.trim()) {
      Alert.alert('Error', 'First name is required');
      return false;
    }
    if (!formData.lastname.trim()) {
      Alert.alert('Error', 'Last name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Get the current session to ensure we have the user ID
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        throw new Error('You must be logged in to update your profile');
      }
      
      const userId = session.user.id;
      
      // Update profile data in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          firstname: formData.firstname,
          lastname: formData.lastname,
          cellphone_no: formData.cellphone_no
        })
        .eq('id', userId);
      
      if (error) throw error;

      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData || !fontsLoaded) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.profileImageContainer}>
            <View style={[styles.profileImage, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f1f5f9', borderColor: colors.card }]}>
              <Text style={[styles.profileInitials, { color: isDarkMode ? '#aaa' : COLORS.textSecondary }]}>
                {formData.firstname ? formData.firstname.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDarkMode ? '#aaa' : '#666' }]}>First Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#fff', borderColor: colors.border, color: colors.text }]}
              value={formData.firstname}
              onChangeText={(text) => setFormData(prev => ({ ...prev, firstname: text }))}
              placeholder="Enter your first name"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDarkMode ? '#aaa' : '#666' }]}>Last Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#fff', borderColor: colors.border, color: colors.text }]}
              value={formData.lastname}
              onChangeText={(text) => setFormData(prev => ({ ...prev, lastname: text }))}
              placeholder="Enter your last name"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDarkMode ? '#aaa' : '#666' }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#f1f5f9', borderColor: colors.border, color: isDarkMode ? '#aaa' : '#666' }]}
              value={formData.email}
              editable={false}
              placeholder="Your email"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            />
            <Text style={[styles.emailNote, { color: isDarkMode ? '#aaa' : '#666' }]}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDarkMode ? '#aaa' : '#666' }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? '#2a2a2a' : '#fff', borderColor: colors.border, color: colors.text }]}
              value={formData.cellphone_no}
              onChangeText={(text) => setFormData(prev => ({ ...prev, cellphone_no: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Update Profile</Text>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  profileInitials: {
    fontSize: 48,
    color: COLORS.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  emailNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
});

export default EditProfileScreen; 