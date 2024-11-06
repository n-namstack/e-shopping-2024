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
// import { pickImage } from '../utility/utility';

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

  const getShops = async () => {
    fetchShops(1, setShops, setLoading);
  };

  useEffect(() => {
    getShops();
  }, []);

  const [data, setData] = useState([
    {
      id: '1',
      name: 'Electronic Shop',
      image: 'http://island.lk/wp-content/uploads/2022/08/shop1.png',
      link: 'http://example.com/product1',
    },
    {
      id: '2',
      name: 'Car Auto Shop',
      image:
        'https://img.freepik.com/free-photo/black-friday-elements-assortment_23-2149074075.jpg?t=st=1721665920~exp=1721669520~hmac=77ff157ff01b8183941f53e37ab0f605797fa3a1e6385ce270c574e8fd3ce1cf&w=1060',
      link: 'http://example.com/product2',
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    profile_img: '',
    backgroung_img: '',
  });

  // Submiting shop form
  const addShp = async () => {
    if (
      newProduct.name &&
      newProduct.description &&
      newProduct.profile_img &&
      newProduct.backgroung_img
    ) {
      setData([...data, { ...newProduct, id: (data.length + 1).toString() }]);
      setNewProduct({
        name: '',
        description: '',
        profile_img: '',
        backgroung_img: '',
      });
      setModalVisible(false);

      createShop(newProduct);

      getShops();

      fetchShops(1, setShops, setLoading);
    } else {
      Alert.alert('Error', 'Please fill in all fields');
    }
  };

  const pickProfileImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setNewProduct({ ...newProduct, profile_img: result.assets[0].uri });
    }
  };

  const pickBackgroundImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setNewProduct({ ...newProduct, backgroung_img: result.assets[0].uri });
    }
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: 40,
        backgroundColor: COLORS.white,
      }}
    >
      <TouchableOpacity
        style={{
          // backgroundColor: COLORS.darkBlue,
          padding: 10,
          marginHorizontal: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={{
            color: COLORS.darkBlue,
            fontSize: FONT_SIZE.normal,
            fontFamily: 'Poppins_600SemiBold',
          }}
        >
          My Shops
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: COLORS.darkBlue,
            borderRadius: 30,
            padding: 5,
          }}
        >
          <MaterialCommunityIcons
            name="plus"
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
            create
          </Text>
        </View>
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
            name="book"
          />
          <Text
            style={{
              textAlign: 'center',
              fontFamily: 'Poppins_400Regular',
              fontSize: FONT_SIZE.normal,
              color: COLORS.grey,
            }}
          >
            No shops yet
          </Text>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          {/* <Text
            style={{
              fontSize: 20,
              marginBottom: 15,
              color: COLORS.darkBlue,
              fontFamily: 'Poppins_400Regular',
              textAlign: 'left',
            }}
          >
            Create new product
          </Text> */}
          <TextInput
            placeholder="Shop name"
            style={{
              width: '80%',
              height: 45,
              borderColor: 'gray',
              borderWidth: 1,
              marginBottom: 10,
              backgroundColor: '#fff',
              paddingHorizontal: 10,
              fontFamily: 'Poppins_400Regular',
              borderRadius: 3,
            }}
            value={newProduct.name}
            onChangeText={(text) =>
              setNewProduct({ ...newProduct, name: text })
            }
          />
          <TextInput
            placeholder="Shop description"
            multiline={true}
            numberOfLines={4}
            underlineColorAndroid="transparent"
            style={{
              width: '80%',
              height: 120,
              borderColor: 'gray',
              borderWidth: 1,
              marginBottom: 10,
              backgroundColor: '#fff',
              paddingHorizontal: 10,
              fontFamily: 'Poppins_400Regular',
              borderRadius: 3,
            }}
            value={newProduct.description}
            onChangeText={(text) =>
              setNewProduct({ ...newProduct, description: text })
            }
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '80%',
            }}
          >
            <View
              style={{
                width: '50%',
              }}
            >
              <TouchableOpacity
                style={{
                  // width: '80%',
                  paddingVertical: 8,
                  marginBottom: 10,
                  backgroundColor: COLORS.gold,
                  paddingHorizontal: 10,
                  borderRadius: 3,
                }}
                onPress={pickProfileImage}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Poppins_400Regular',
                      color: COLORS.white,
                      fontSize: FONT_SIZE.normal,
                    }}
                  >
                    Profile image
                  </Text>
                  <MaterialCommunityIcons
                    name="cloud-upload"
                    style={{
                      fontSize: 20,
                      color: COLORS.white,
                      borderRadius: 12,
                    }}
                  />
                </View>
              </TouchableOpacity>
              {newProduct.profile_img ? (
                <Image
                  source={{ uri: newProduct.profile_img }}
                  style={{
                    width: '100%',
                    height: 140,
                    marginBottom: 10,
                  }}
                />
              ) : null}
            </View>
            <View
              style={{
                width: '48%',
              }}
            >
              <TouchableOpacity
                style={{
                  // width: '80%',
                  paddingVertical: 8,
                  marginBottom: 10,
                  paddingHorizontal: 10,
                  backgroundColor: COLORS.gold,
                  borderRadius: 3,
                }}
                onPress={pickBackgroundImage}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Poppins_400Regular',
                      color: COLORS.white,
                      fontSize: FONT_SIZE.normal,
                    }}
                  >
                    Bg image
                  </Text>
                  <MaterialCommunityIcons
                    name="cloud-upload"
                    style={{
                      fontSize: 20,
                      color: COLORS.white,
                      borderRadius: 12,
                    }}
                  />
                </View>
              </TouchableOpacity>
              {newProduct.backgroung_img ? (
                <Image
                  source={{ uri: newProduct.backgroung_img }}
                  style={{
                    width: '100%',
                    height: 140,
                    marginBottom: 10,
                  }}
                />
              ) : null}
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '80%',
            }}
          >
            <TouchableOpacity
              style={{
                padding: 10,
                backgroundColor: COLORS.darkBlue,
                borderRadius: 3,
                marginVertical: 3,
              }}
              onPress={addShp}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_400Regular',
                  color: COLORS.white,
                  fontSize: 15,
                }}
              >
                Add Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
});
