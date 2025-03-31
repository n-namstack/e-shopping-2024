import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Button,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import ShopCard from '../utility/shopCard';
import COLORS from '../../constants/colors';
import FONT_SIZE from '../../constants/fontSize';
import { launchImageLibrary } from 'react-native-image-picker';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchShops, createShop } from '../utility/api';
import { useAuth } from '../context/AuthContext';

export default function Shop({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const getShops = async () => {
    fetchShops(user?.id || user?.user_id || 1, setShops, setLoading);
  };

  useEffect(() => {
    getShops();
  }, [user]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    profile_img: '',
    backgroung_img: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contact_info: {
      email: user?.email || '',
      phone: user?.phone || '',
      website: ''
    },
    business_hours: {
      monday: { open: '09:00', close: '17:00', isOpen: true },
      tuesday: { open: '09:00', close: '17:00', isOpen: true },
      wednesday: { open: '09:00', close: '17:00', isOpen: true },
      thursday: { open: '09:00', close: '17:00', isOpen: true },
      friday: { open: '09:00', close: '17:00', isOpen: true },
      saturday: { open: '10:00', close: '14:00', isOpen: false },
      sunday: { open: '10:00', close: '14:00', isOpen: false }
    },
    categories: []
  });

  // Handle seller vs buyer permissions
  const isSeller = user?.role === 'seller';

  // Available shop categories
  const availableCategories = [
    { id: '1', name: 'Electronics' },
    { id: '2', name: 'Fashion' },
    { id: '3', name: 'Home & Garden' },
    { id: '4', name: 'Sports' },
    { id: '5', name: 'Beauty' },
    { id: '6', name: 'Books' },
    { id: '7', name: 'Toys' },
    { id: '8', name: 'Health' },
    { id: '9', name: 'Automotive' },
    { id: '10', name: 'Jewelry' }
  ];

  // Submiting shop form 
  // Note: This function is no longer needed for sellers but kept for testing
  const addShp = async () => {
    if (
      newProduct.name &&
      newProduct.description
    ) {
      try {
        // Convert category IDs to category names
        const categoryNames = newProduct.categories.map(id => {
          const category = availableCategories.find(cat => cat.id === id);
          return category ? category.name : null;
        }).filter(name => name !== null);
        
        // Create shop with user ID from auth context
        const shopData = {
          name: newProduct.name,
          description: newProduct.description,
          profile_img: newProduct.profile_img,
          backgroung_img: newProduct.backgroung_img,
          address: newProduct.address,
          contact_info: newProduct.contact_info,
          business_hours: newProduct.business_hours,
          categories: categoryNames
        };
        
        await createShop(shopData);
        
        setNewProduct({
          name: '',
          description: '',
          profile_img: '',
          backgroung_img: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          },
          contact_info: {
            email: user?.email || '',
            phone: user?.phone || '',
            website: ''
          },
          business_hours: {
            monday: { open: '09:00', close: '17:00', isOpen: true },
            tuesday: { open: '09:00', close: '17:00', isOpen: true },
            wednesday: { open: '09:00', close: '17:00', isOpen: true },
            thursday: { open: '09:00', close: '17:00', isOpen: true },
            friday: { open: '09:00', close: '17:00', isOpen: true },
            saturday: { open: '10:00', close: '14:00', isOpen: false },
            sunday: { open: '10:00', close: '14:00', isOpen: false }
          },
          categories: []
        });
        setModalVisible(false);

        // Show success message
        Alert.alert('Success', 'Shop created successfully!');
        
        // Refresh shops list
        getShops();
      } catch (error) {
        console.error('Shop creation error:', error);
        
        // Format user-friendly error messages for common errors
        let title = 'Error Creating Shop';
        let message = error.message || 'Could not create shop. Please try again.';
        
        // Specific error handling for verification issues
        if (message.includes('verified sellers')) {
          title = 'Verification Required';
          message = 'Your seller account needs to be verified before you can create a shop. Please contact support to complete the verification process.';
        } else if (message.includes('Authorization error')) {
          title = 'Authentication Error';
          message = 'Your session may have expired. Please log out and log back in.';
        }
        
        Alert.alert(title, message);
      }
    } else {
      Alert.alert('Error', 'Shop name and description are required');
    }
  };

  const pickProfileImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "Images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('Profile image result:', JSON.stringify(result));
      
      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          setNewProduct({ ...newProduct, profile_img: result.assets[0].uri });
        } else if (result.uri) {
          setNewProduct({ ...newProduct, profile_img: result.uri });
        }
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert('Error', 'Failed to select an image');
    }
  };

  const pickBackgroundImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "Images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('Background image result:', JSON.stringify(result));
      
      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          setNewProduct({ ...newProduct, backgroung_img: result.assets[0].uri });
        } else if (result.uri) {
          setNewProduct({ ...newProduct, backgroung_img: result.uri });
        }
      }
    } catch (error) {
      console.error('Error picking background image:', error);
      Alert.alert('Error', 'Failed to select an image');
    }
  };

  const goToPublicShops = () => {
    navigation.navigate('ShopPublic');
  };

  // Function to toggle category selection
  const toggleCategory = (categoryId) => {
    setNewProduct(prev => {
      // Check if category is already selected
      if (prev.categories.includes(categoryId)) {
        // Remove category
        return {
          ...prev,
          categories: prev.categories.filter(id => id !== categoryId)
        };
      } else {
        // Add category
        return {
          ...prev,
          categories: [...prev.categories, categoryId]
        };
      }
    });
  };

  // Toggle business hour open/closed
  const toggleBusinessDay = (day) => {
    setNewProduct(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          isOpen: !prev.business_hours[day].isOpen
        }
      }
    }));
  };

  // Update business hour time
  const updateBusinessHour = (day, field, value) => {
    setNewProduct(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isSeller ? 'My Shops' : 'My Products'}
        </Text>
        
        {/* View all public shops button */}
        <TouchableOpacity
          style={styles.browseButton}
          onPress={goToPublicShops}
        >
          <MaterialCommunityIcons
            name="magnify"
            style={styles.browseIcon}
          />
          <Text style={styles.browseText}>
            Browse Shops
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      ) : shops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            style={styles.emptyIcon}
            name={isSeller ? "store" : "tag"}
          />
          <Text style={styles.emptyText}>
            {isSeller ? 'No shops yet' : 'No products yet'}
          </Text>
          
          {isSeller && (
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={goToPublicShops}
            >
              <Text style={styles.emptyStateButtonText}>
                Browse Shops to Follow
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={shops}
          renderItem={({ item }) => (
            <ShopCard navigation={navigation} item={item} />
          )}
          keyExtractor={(item) => item.shop_id?.toString() || item.id?.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add the Create Shop Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a New Shop</Text>
            
            <ScrollView style={styles.modalScrollView}>
              <TextInput
                placeholder="Shop name"
                style={styles.modalInput}
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({...newProduct, name: text})}
              />
              
              <TextInput
                placeholder="Shop description"
                style={[styles.modalInput, {height: 80}]}
                multiline
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({...newProduct, description: text})}
              />
              
              <Text style={styles.sectionTitle}>Address Information</Text>
              
              <TextInput
                placeholder="Street"
                style={styles.modalInput}
                value={newProduct.address.street}
                onChangeText={(text) => setNewProduct({
                  ...newProduct, 
                  address: {...newProduct.address, street: text}
                })}
              />
              
              <View style={styles.rowInputs}>
                <TextInput
                  placeholder="City"
                  style={[styles.modalInput, {flex: 1, marginRight: 5}]}
                  value={newProduct.address.city}
                  onChangeText={(text) => setNewProduct({
                    ...newProduct, 
                    address: {...newProduct.address, city: text}
                  })}
                />
                
                <TextInput
                  placeholder="State/Province"
                  style={[styles.modalInput, {flex: 1, marginLeft: 5}]}
                  value={newProduct.address.state}
                  onChangeText={(text) => setNewProduct({
                    ...newProduct, 
                    address: {...newProduct.address, state: text}
                  })}
                />
              </View>
              
              <View style={styles.rowInputs}>
                <TextInput
                  placeholder="Zip/Postal Code"
                  style={[styles.modalInput, {flex: 1, marginRight: 5}]}
                  value={newProduct.address.zipCode}
                  onChangeText={(text) => setNewProduct({
                    ...newProduct, 
                    address: {...newProduct.address, zipCode: text}
                  })}
                  keyboardType="numeric"
                />
                
                <TextInput
                  placeholder="Country"
                  style={[styles.modalInput, {flex: 1, marginLeft: 5}]}
                  value={newProduct.address.country}
                  onChangeText={(text) => setNewProduct({
                    ...newProduct, 
                    address: {...newProduct.address, country: text}
                  })}
                />
              </View>
              
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <TextInput
                placeholder="Email"
                style={styles.modalInput}
                value={newProduct.contact_info.email}
                onChangeText={(text) => setNewProduct({
                  ...newProduct, 
                  contact_info: {...newProduct.contact_info, email: text}
                })}
                keyboardType="email-address"
              />
              
              <TextInput
                placeholder="Phone"
                style={styles.modalInput}
                value={newProduct.contact_info.phone}
                onChangeText={(text) => setNewProduct({
                  ...newProduct, 
                  contact_info: {...newProduct.contact_info, phone: text}
                })}
                keyboardType="phone-pad"
              />
              
              <TextInput
                placeholder="Website (optional)"
                style={styles.modalInput}
                value={newProduct.contact_info.website}
                onChangeText={(text) => setNewProduct({
                  ...newProduct, 
                  contact_info: {...newProduct.contact_info, website: text}
                })}
                keyboardType="url"
              />
              
              <Text style={styles.sectionTitle}>Shop Images</Text>
              
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Profile Image <Text style={styles.optionalText}>(Optional)</Text></Text>
                <TouchableOpacity 
                  style={styles.imagePicker} 
                  onPress={pickProfileImage}
                >
                  {newProduct.profile_img ? (
                    <Image source={{ uri: newProduct.profile_img }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <MaterialCommunityIcons name="image-plus" size={40} color="#ccc" />
                      <Text style={styles.placeholderText}>Tap to select image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Cover Image <Text style={styles.optionalText}>(Optional)</Text></Text>
                <TouchableOpacity 
                  style={styles.imagePicker} 
                  onPress={pickBackgroundImage}
                >
                  {newProduct.backgroung_img ? (
                    <Image source={{ uri: newProduct.backgroung_img }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <MaterialCommunityIcons name="image-plus" size={40} color="#ccc" />
                      <Text style={styles.placeholderText}>Tap to select image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              <Text style={styles.sectionTitle}>Business Hours</Text>
              
              {/* Business Hours Section */}
              <View style={styles.businessHoursContainer}>
                {Object.entries(newProduct.business_hours).map(([day, hours]) => (
                  <View key={day} style={styles.businessHourRow}>
                    <TouchableOpacity 
                      style={styles.dayToggle}
                      onPress={() => toggleBusinessDay(day)}
                    >
                      <View style={[
                        styles.dayToggleIndicator, 
                        hours.isOpen ? styles.dayToggleActive : styles.dayToggleInactive
                      ]} />
                      <Text style={styles.dayText}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.hoursInputContainer}>
                      <TextInput
                        style={[styles.timeInput, !hours.isOpen && styles.timeInputDisabled]}
                        value={hours.open}
                        onChangeText={(text) => updateBusinessHour(day, 'open', text)}
                        editable={hours.isOpen}
                        placeholder="9:00"
                      />
                      <Text style={styles.timeSeperator}>to</Text>
                      <TextInput
                        style={[styles.timeInput, !hours.isOpen && styles.timeInputDisabled]}
                        value={hours.close}
                        onChangeText={(text) => updateBusinessHour(day, 'close', text)}
                        editable={hours.isOpen}
                        placeholder="17:00"
                      />
                    </View>
                  </View>
                ))}
              </View>
              
              <Text style={styles.sectionTitle}>Categories</Text>
              
              {/* Categories Section */}
              <View style={styles.categoriesContainer}>
                {availableCategories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      newProduct.categories.includes(category.id) && styles.categoryChipSelected
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      newProduct.categories.includes(category.id) && styles.categoryChipTextSelected
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={addShp}
              >
                <Text style={styles.createButtonText}>Create Shop</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  browseButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 16,
  },
  browseIcon: {
    fontSize: 18,
    color: '#0F172A',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 3,
    marginRight: 4,
  },
  browseText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 60,
    textAlign: 'center',
    color: '#94A3B8',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#64748B',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  listContent: {
    padding: 10,
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.9)',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  input: {},
  button: {},
  buttonClose: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
  },
  modalText: {
    fontSize: 20,
    marginBottom: 15,
    color: '#fff',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalScrollView: {
    width: '100%',
  },
  modalInput: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageSection: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  optionalText: {
    fontSize: 14,
    color: 'gray',
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: 'gray',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  businessHoursContainer: {
    marginBottom: 20,
  },
  businessHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  dayToggleIndicator: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    marginRight: 5,
  },
  dayToggleActive: {
    backgroundColor: '#4CAF50',
  },
  dayToggleInactive: {
    backgroundColor: '#ccc',
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  hoursInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 60,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginRight: 5,
  },
  timeInputDisabled: {
    backgroundColor: '#ccc',
  },
  timeSeperator: {
    marginHorizontal: 5,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    padding: 5,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  categoryChipSelected: {
    backgroundColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 16,
  },
  categoryChipTextSelected: {
    fontWeight: 'bold',
  },
});
