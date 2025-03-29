import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { getShopInfo } from '../utility/api';
import COLORS from '../../constants/colors';
import FONT_SIZE from '../../constants/fontSize';
import { FontAwesome, Entypo } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
} from '@expo-google-fonts/poppins';
import { Picker } from '@react-native-picker/picker';


const ShopInfo = ({ route, navigation }) => {
  const { shop_uuid } = route.params;
  const [shop, setShop] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedValue, setSelectedValue] = useState('Product condition');

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    profile_img: '',
    backgroung_img: '',
    condition: '',
  });

  const [searchText, setSearchText] = useState({
    userInput: '',
  });

  // Submiting shop form
  const addProduct = async () => {
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

      // createShop(newProduct);

      // getShops();

      // fetchShops(1, setShops, setLoading);
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
      setNewProduct({
        ...newProduct,
        backgroung_img: result.assets[0].uri,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getShop();
    });

    console.log('Shop id: ', shop_uuid);

    return unsubscribe;
  }, [navigation]);

  const getShop = async () => {
    getShopInfo(1, shop_uuid, setShop);
  };

  return (
    <View
      style={{
        width: '100%',
        // marginLeft: 20,
        // marginRight: 20,
      }}
    >
      <ImageBackground
        source={{ uri: shop.profile_img }}
        style={{
          resizeMode: 'cover',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: 20,
            paddingTop: 40,
            width: '100%',
          }}
        >
          <TouchableOpacity style={{ width: 45 }}>
            <Entypo
              style={{
                fontSize: 25,
                color: COLORS.darkBlue,
                padding: 10,
                fontWeight: 'bold',
                backgroundColor: COLORS.white,
                borderRadius: 5,
                paddingTop: 10,
                paddingLeft: 10,
                marginBottom: 10,
              }}
              name="chevron-left"
              onPress={() => {
                navigation.goBack('Shop');
              }}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'Poppins_600SemiBold',
              fontSize: FONT_SIZE.tile,
              color: COLORS.white,
            }}
          >
            {shop.shop_name}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZE.normal,
              fontFamily: 'Poppins_400Regular',
              color: COLORS.white,
            }}
          >
            {shop.shop_desc}
          </Text>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <View
              style={{
                width: '85%',
                height: 45,
                borderColor: 'gray',
                borderWidth: 1,
                marginBottom: 10,
                backgroundColor: COLORS.white,
                paddingHorizontal: 10,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 10,
                borderRadius: 5,
              }}
            >
              <TextInput
                placeholder="Search product"
                style={{
                  fontFamily: 'Poppins_400Regular',
                  width: '100%',
                  fontSize: FONT_SIZE.normal,
                }}
                value={searchText.userInput}
                onChangeText={(text) =>
                  setSearchText({ ...searchText, userInput: text })
                }
              />
            </View>
            <TouchableOpacity>
              <Entypo
                style={{
                  fontSize: FONT_SIZE.tile,
                  color: COLORS.darkBlue,
                  padding: 10,
                  fontWeight: 'bold',
                  backgroundColor: COLORS.white,
                  borderRadius: 5,
                  paddingTop: 10,
                  paddingLeft: 10,
                  marginTop: 10,
                }}
                name="add-to-list"
                onPress={() => {
                  setModalVisible(true);
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <TextInput
            placeholder="Product name"
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
            placeholder="Product description"
            numberOfLines={10}
            multiline={true}
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

          <TextInput
            placeholder="Product price"
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
          <View style={styles.textField}>
            <Picker
              selectedValue={selectedValue}
              placeholder={"Condition"}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedValue(itemValue)}
            >
              <Picker.Item label="Brand new" value="option1" />
              <Picker.Item label="Used - Excellent Condition" value="option2" />
              <Picker.Item label="Used - Good Condition" value="option3" />
              <Picker.Item label="Used - Fair Condition" value="option3" />
              <Picker.Item label="For Parts or Not Working" value="option3" />
            </Picker>
          </View>
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
              onPress={addProduct}
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
};

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
  textField: {
    width: '80%',
    height: 45,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: '#fff',
    // paddingHorizontal: 10,
    fontFamily: 'Poppins_400Regular',
    borderRadius: 3,
    // flex: 1,
    justifyContent: 'center',
    // padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
  },
  selectedText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShopInfo;
