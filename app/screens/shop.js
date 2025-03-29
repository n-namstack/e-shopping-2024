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
    fetchShops(user?.id || 1, setShops, setLoading);
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
  });

  // Handle seller vs buyer permissions
  const isSeller = user?.role === 'seller';

  // Submiting shop form 
  // Note: This function is no longer needed for sellers but kept for testing
  const addShp = async () => {
    if (
      newProduct.name &&
      newProduct.description
    ) {
      try {
        // Create shop with user ID from auth context
        await createShop({
          ...newProduct,
          user_id: user?.id || 1
        });
        
        setNewProduct({
          name: '',
          description: '',
          profile_img: '',
          backgroung_img: '',
        });
        setModalVisible(false);

        // Refresh shops list
        getShops();
      } catch (error) {
        Alert.alert('Error', 'Could not create shop. Please try again.');
        console.error('Shop creation error:', error);
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

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.white,
      }}
    >
      <TouchableOpacity
        style={{
          padding: 10,
          marginHorizontal: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        onPress={() => navigation.navigate('ShopPublic')}
      >
        <Text
          style={{
            color: COLORS.darkBlue,
            fontSize: FONT_SIZE.normal,
            fontFamily: 'Poppins_600SemiBold',
          }}
        >
          {isSeller ? 'My Shops' : 'My Products'}
        </Text>
        
        {/* For sellers: View all public shops */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: COLORS.darkBlue,
            borderRadius: 30,
            padding: 5,
          }}
          onPress={goToPublicShops}
        >
          <MaterialCommunityIcons
            name="magnify"
            style={{
              fontSize: 25,
              color: COLORS.darkBlue,
              backgroundColor: COLORS.white,
              borderRadius: 30,
            }}
          />
          <Text
            style={{
              fontSize: FONT_SIZE.normal,
              color: '#fff',
              fontFamily: 'Poppins_400Regular',
              paddingHorizontal: 6,
            }}
          >
            Browse Shops
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
      
      {shops.length === 0 ? (
        <View
          style={{
            marginHorizontal: 'auto',
            paddingVertical: 50,
            marginTop: 25,
          }}
        >
          <MaterialCommunityIcons
            style={{
              fontSize: 30,
              textAlign: 'center',
              color: COLORS.grey,
            }}
            name={isSeller ? "store" : "tag"}
          />
          <Text
            style={{
              textAlign: 'center',
              fontFamily: 'Poppins_400Regular',
              fontSize: FONT_SIZE.normal,
              color: COLORS.grey,
            }}
          >
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
          keyExtractor={(item) => item.shop_id}
          numColumns={2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#f8f8f8',
  },
  list: {
    paddingBottom: 20,
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
  emptyStateButton: {
    padding: 10,
    backgroundColor: COLORS.darkBlue,
    borderRadius: 3,
    marginVertical: 3,
  },
  emptyStateButtonText: {
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    fontSize: 15,
  },
});
