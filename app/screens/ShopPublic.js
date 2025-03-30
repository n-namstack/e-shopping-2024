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
  });

  // Loading states for image pickers
  const [loadingProfileImage, setLoadingProfileImage] = useState(false);
  const [loadingBackgroundImage, setLoadingBackgroundImage] = useState(false);

  // Add state for connection errors
  const [connectionError, setConnectionError] = useState(false);

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
    
    // Check if required fields are filled
    if (!newShop.name) {
      Alert.alert('Error', 'Shop name is required');
      return;
    }
    
    if (!newShop.description) {
      Alert.alert('Error', 'Shop description is required');
      return;
    }
    
    try {
      // Prepare shop data
      const shopData = {
        ...newShop,
        user_id: user?.id || 1,
        user_role: user?.role || 'buyer'
      };
      
      console.log("Creating shop with data:", shopData);
      
      // Clear form data and hide modal before making the request
      setNewShop({
        name: '',
        description: '',
        profile_img: '',
        backgroung_img: '',
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
      
      // Don't show multiple alerts for network errors
      let errorMessage = 'Failed to create shop. Please try again.';
      
      if (error.message === 'Network Error') {
        errorMessage = 'Cannot connect to the server. Please check your internet connection and try again.';
      } else if (error.response) {
        // Server returned an error response
        console.error('Error response from server:', error.response.data);
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error alert
      Alert.alert('Error', errorMessage);
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
      shopDesc={item.description}
      rating={item.rating}
      productsCount={item.products ? item.products.length : 0}
      owner_id={item.owner?.id}
      onFollow={() => handleFollowShop(item.shop_id, item.owner?.id, item.name)}
      onShare={() => handleShareShop(`http://localhost:8000/shops/${item.shop_id}`)}
    />
  );

  const filteredShops = searchQuery 
    ? shops.filter(shop => 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (shop.owner && shop.owner.username.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : shops;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={{ marginTop: 10 }}>Loading shops...</Text>
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="alert-circle-outline" size={60} color="#64748b" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20, color: '#0f172a' }}>
          No Shops Found
        </Text>
        <Text style={{ textAlign: 'center', marginTop: 10, color: '#64748b' }}>
          There are no shops available at the moment. Please check back later.
        </Text>
        <TouchableOpacity 
          style={{
            marginTop: 20,
            backgroundColor: '#0f172a',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8
          }}
          onPress={fetchData}
        >
          <Text style={{ color: '#fff', fontWeight: '500' }}>Refresh</Text>
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
          color="#000"
          style={styles.searchIcon}
        />
      </View>

      {/* Shop List */}
      <FlatList
        data={filteredShops}
        renderItem={renderItem}
        keyExtractor={(item) => item.shop_id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="store-off" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No shops found</Text>
          </View>
        )}
      />

      {/* Create Shop Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Create a New Shop</Text>
          
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
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
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
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
  },
  searchIcon: {
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
  },
  modalView: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 80,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
});

export default ShopPublic;
