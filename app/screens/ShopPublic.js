import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShopCard from './cards/shopPublicCard';
import * as ImagePicker from 'expo-image-picker';
import NetworkErrorView from '../components/NetworkErrorView';

import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import { getPublicShops, createShop } from '../utility/api';
import { convertText } from '../utility/utility';
import { useAuth } from '../context/AuthContext';
import COLORS from '../../constants/colors';
import FONT_SIZE from '../../constants/fontSize';

const ShopPublic = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  
  // New shop state
  const [newShop, setNewShop] = useState({
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

  // Loading states for image pickers
  const [loadingProfileImage, setLoadingProfileImage] = useState(false);
  const [loadingBackgroundImage, setLoadingBackgroundImage] = useState(false);

  // Add state for connection errors
  const [connectionError, setConnectionError] = useState(false);

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

  const fetchData = () => {
    setLoading(true);
    setConnectionError(false);
    getPublicShops(
      (data) => {
        setShops(data || []);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setConnectionError(true);
      }
    );
  };

  useEffect(() => {
    fetchData();
    
    // Request media library permissions
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'This app needs access to your photos to let you select shop images.');
      }
    })();
  }, []);

  // Functions for shop creation
  const pickProfileImage = async () => {
    try {
      setLoadingProfileImage(true);
      console.log('Opening profile image picker...');
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      console.log('Image picker result:', JSON.stringify(result));
      
      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          console.log('Profile image selected:', result.assets[0].uri);
          setNewShop({ ...newShop, profile_img: result.assets[0].uri });
        } else if (result.uri) {
          // For older versions of expo-image-picker
          console.log('Profile image selected (legacy):', result.uri);
          setNewShop({ ...newShop, profile_img: result.uri });
        }
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
    } finally {
      setLoadingProfileImage(false);
    }
  };

  const pickBackgroundImage = async () => {
    try {
      setLoadingBackgroundImage(true);
      console.log('Opening background image picker...');
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });
      
      console.log('Image picker result:', JSON.stringify(result));
      
      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          console.log('Background image selected:', result.assets[0].uri);
          setNewShop({ ...newShop, backgroung_img: result.assets[0].uri });
        } else if (result.uri) {
          // For older versions of expo-image-picker
          console.log('Background image selected (legacy):', result.uri);
          setNewShop({ ...newShop, backgroung_img: result.uri });
        }
      }
    } catch (error) {
      console.error('Error picking background image:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
    } finally {
      setLoadingBackgroundImage(false);
    }
  };

  const handleCreateShop = async () => {
    console.log("Validating shop data:", {
      name: newShop.name,
      description: newShop.description
    });
    
    // First check if user is logged in
    if (!user || !user.id) {
      Alert.alert('Authentication Required', 'You must be logged in to create a shop.');
      setModalVisible(false);
      return;
    }
    
    // Check if user is a seller
    if (user.role !== 'seller') {
      Alert.alert('Seller Account Required', 'You need a seller account to create a shop. Please upgrade your account.');
      setModalVisible(false);
      return;
    }
    
    // Check if required fields are filled
    if (!newShop.name) {
      Alert.alert('Error', 'Shop name is required');
      return;
    }
    
    if (!newShop.description) {
      Alert.alert('Error', 'Shop description is required');
      return;
    }

    // Check if contact_info exists
    if (!newShop.contact_info || !newShop.contact_info.email) {
      Alert.alert('Error', 'Contact information is required');
      return;
    }
    
    try {
      // Convert category IDs to category names
      const categoryNames = newShop.categories.map(id => {
        const category = availableCategories.find(cat => cat.id === id);
        return category ? category.name : null;
      }).filter(name => name !== null);
      
      // Prepare shop data 
      const shopData = {
        name: newShop.name,
        description: newShop.description,
        owner_id: user?.id || user?.user_id, // Explicitly include owner_id
        logo: newShop.profile_img,
        banner: newShop.backgroung_img,
        address: newShop.address,
        contact_info: newShop.contact_info,
        business_hours: newShop.business_hours,
        categories: categoryNames
      };
      
      console.log("Creating shop with data:", JSON.stringify(shopData));
      console.log("Current user data:", user);
      
      // Clear form data and hide modal before making the request
      setNewShop({
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
      
      // Single alert with clear message
      Alert.alert(
        'Creating Shop',
        'Attempting to create your shop. This may take a moment.'
      );
      
      // Create shop
      const result = await createShop(shopData);
      
      // Only show success if we get here (no errors)
      Alert.alert(
        'Shop Created',
        'Your shop has been created successfully!'
      );
      
      // Try to refresh shop list, but don't worry if it fails
      try {
        fetchData();
      } catch (refreshError) {
        console.error('Error refreshing shops list:', refreshError);
      }
    } catch (error) {
      console.error('Error creating shop:', error);
      
      // Format user-friendly error messages for common errors
      let title = 'Error Creating Shop';
      let message = error.message || 'There was a problem creating your shop. Please try again later.';
      
      // Specific error handling for verification issues
      if (message.includes('verified sellers')) {
        title = 'Verification Required';
        message = 'Your seller account needs to be verified before you can create a shop. Please contact support to complete the verification process.';
      } else if (message.includes('Authorization error')) {
        title = 'Authentication Error';
        message = 'Your session may have expired. Please log out and log back in.';
      }
      
      // Show a user-friendly error message
      Alert.alert(title, message);
    }
  };

  const handleFollowShop = (shopId, shopOwnerId, shopName) => {
    // Check if user is the shop owner
    if (user?.id === shopOwnerId) {
      Alert.alert("Cannot follow", "You cannot follow your own shop");
      return;
    }
    
    // This would call an API to follow the shop
    // For now, just show success message
    Alert.alert('Success', `You are now following ${shopName}`);
    
    // Update the local state with the updated follower count
    // In a real app, this would be handled by the API response
    const updatedShops = shops.map(shop => {
      if (shop.shop_id === shopId) {
        return {
          ...shop,
          followers: shop.followers ? [...shop.followers, user?.id] : [user?.id],
        };
      }
      return shop;
    });
    
    setShops(updatedShops);
  };

  const handleShareShop = (shopLink) => {
    Alert.alert('Shop Link', `Share this link: ${shopLink}`);
  };

  const renderItem = ({ item }) => (
    <ShopCard
      shop_id={item.shop_id}
      shopName={item.name}
      ownerName={item.owner ? item.owner.username : 'Unknown'}
      shopImage={item.logo}
      owner_id={item.owner?.id}
      onFollow={() => handleFollowShop(item.shop_id, item.owner?.id, item.name)}
    />
  );

  const filteredShops = searchQuery 
    ? shops.filter(shop => 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (shop.owner && shop.owner.username.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : shops;

  // Function to toggle category selection
  const toggleCategory = (categoryId) => {
    setNewShop(prev => {
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
    setNewShop(prev => ({
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
    setNewShop(prev => ({
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingText}>Loading shops...</Text>
      </View>
    );
  }

  if (connectionError) {
    return (
      <NetworkErrorView 
        onRetry={fetchData}
        message="Unable to load shops. Please check your connection and try again."
      />
    );
  }

  if (!loading && (!shops || shops.length === 0)) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="store-off" size={60} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No Shops Found</Text>
        <Text style={styles.emptyText}>
          There are no shops available at the moment. Please check back later.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Shopit</Text>
        
        {/* Only show Create Shop button for sellers */}
        {user?.role === 'seller' && (
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.createButtonText}>Create Shop</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search shop" 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Ionicons
          name="search"
          size={20}
          color="#64748B"
          style={styles.searchIcon}
        />
      </View>

      {/* Shop List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      ) : connectionError ? (
        <NetworkErrorView 
          onRetry={fetchData}
          message="Unable to load shops. Please check your connection and try again."
        />
      ) : filteredShops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="store-off" size={60} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Shops Found</Text>
          <Text style={styles.emptyText}>
            There are no shops available at the moment. Please check back later.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          renderItem={renderItem}
          keyExtractor={(item) => item.shop_id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Shop Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Create a New Shop</Text>
          
          <ScrollView style={styles.modalScrollView}>
            <TextInput
              placeholder="Shop name"
              style={styles.input}
              value={newShop.name}
              onChangeText={(text) => setNewShop({...newShop, name: text})}
            />
            
            <TextInput
              placeholder="Shop description"
              style={[styles.input, {height: 80}]}
              multiline
              value={newShop.description}
              onChangeText={(text) => setNewShop({...newShop, description: text})}
            />
            
            <Text style={styles.sectionTitle}>Address Information</Text>
            
            <TextInput
              placeholder="Street"
              style={styles.input}
              value={newShop.address.street}
              onChangeText={(text) => setNewShop({
                ...newShop, 
                address: {...newShop.address, street: text}
              })}
            />
            
            <View style={styles.rowInputs}>
              <TextInput
                placeholder="City"
                style={[styles.input, {flex: 1, marginRight: 5}]}
                value={newShop.address.city}
                onChangeText={(text) => setNewShop({
                  ...newShop, 
                  address: {...newShop.address, city: text}
                })}
              />
              
              <TextInput
                placeholder="State/Province"
                style={[styles.input, {flex: 1, marginLeft: 5}]}
                value={newShop.address.state}
                onChangeText={(text) => setNewShop({
                  ...newShop, 
                  address: {...newShop.address, state: text}
                })}
              />
            </View>
            
            <View style={styles.rowInputs}>
              <TextInput
                placeholder="Zip/Postal Code"
                style={[styles.input, {flex: 1, marginRight: 5}]}
                value={newShop.address.zipCode}
                onChangeText={(text) => setNewShop({
                  ...newShop, 
                  address: {...newShop.address, zipCode: text}
                })}
                keyboardType="numeric"
              />
              
              <TextInput
                placeholder="Country"
                style={[styles.input, {flex: 1, marginLeft: 5}]}
                value={newShop.address.country}
                onChangeText={(text) => setNewShop({
                  ...newShop, 
                  address: {...newShop.address, country: text}
                })}
              />
            </View>
            
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={newShop.contact_info.email}
              onChangeText={(text) => setNewShop({
                ...newShop, 
                contact_info: {...newShop.contact_info, email: text}
              })}
              keyboardType="email-address"
            />
            
            <TextInput
              placeholder="Phone"
              style={styles.input}
              value={newShop.contact_info.phone}
              onChangeText={(text) => setNewShop({
                ...newShop, 
                contact_info: {...newShop.contact_info, phone: text}
              })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              placeholder="Website (optional)"
              style={styles.input}
              value={newShop.contact_info.website}
              onChangeText={(text) => setNewShop({
                ...newShop, 
                contact_info: {...newShop.contact_info, website: text}
              })}
              keyboardType="url"
            />
            
            <Text style={styles.sectionTitle}>Shop Images</Text>
            
            <View style={styles.imageSection}>
              <Text style={styles.imageLabel}>Profile Image <Text style={styles.optionalText}>(Optional)</Text></Text>
              <TouchableOpacity 
                style={styles.imagePicker} 
                onPress={pickProfileImage}
                disabled={loadingProfileImage}
              >
                {loadingProfileImage ? (
                  <ActivityIndicator size="large" color="#0f172a" />
                ) : newShop.profile_img ? (
                  <Image source={{ uri: newShop.profile_img }} style={styles.previewImage} />
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
                disabled={loadingBackgroundImage}
              >
                {loadingBackgroundImage ? (
                  <ActivityIndicator size="large" color="#0f172a" />
                ) : newShop.backgroung_img ? (
                  <Image source={{ uri: newShop.backgroung_img }} style={styles.previewImage} />
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
              {Object.entries(newShop.business_hours).map(([day, hours]) => (
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
                    newShop.categories.includes(category.id) && styles.categoryChipSelected
                  ]}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    newShop.categories.includes(category.id) && styles.categoryChipTextSelected
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
              style={[styles.modalButton, styles.createModalButton]}
              onPress={handleCreateShop}
            >
              <Text style={styles.createModalButtonText}>Create Shop</Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#1E293B',
  },
  searchIcon: {
    marginLeft: 8,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#0f172a',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#64748B',
    fontSize: 16,
    maxWidth: '80%',
    lineHeight: 22,
  },
  refreshButton: {
    marginTop: 24,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  modalView: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: '85%',
  },
  input: {
    width: '100%',
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  imageSection: {
    marginBottom: 15,
  },
  imageLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  imagePicker: {
    width: '100%',
    height: 120,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  createModalButton: {
    backgroundColor: '#0f172a',
  },
  createModalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  optionalText: {
    fontSize: 12,
    color: '#666',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  businessHoursContainer: {
    marginBottom: 15,
  },
  businessHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayToggle: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayToggleIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 5,
  },
  dayToggleActive: {
    backgroundColor: '#0f172a',
  },
  dayToggleInactive: {
    backgroundColor: '#ccc',
  },
  dayText: {
    fontSize: 16,
  },
  hoursInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 50,
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 5,
    paddingHorizontal: 10,
  },
  timeInputDisabled: {
    backgroundColor: '#f2f2f2',
  },
  timeSeperator: {
    marginHorizontal: 5,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    margin: 5,
  },
  categoryChipSelected: {
    backgroundColor: '#0f172a',
  },
  categoryChipText: {
    fontSize: 16,
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ShopPublic;
