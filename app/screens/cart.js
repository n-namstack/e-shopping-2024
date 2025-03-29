import {
  View,
  Text,
  // ToastAndroid,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { items } from '../components/database/database';
import COLORS from '../../constants/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import { currencyFormat } from '../utility/utility';
import { useToast } from 'react-native-toast-notifications';

const Cart = ({ navigation }) => {
  const [product, setProduct] = useState();
  const [total, setTotal] = useState();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getDataFromDB();
    });

    return unsubscribe;
  }, [navigation]);

  /** Get data from local DB by id */
  const getDataFromDB = async () => {
    let item = await AsyncStorage.getItem('cartItems');
    item = JSON.parse(item);

    let productData = [];
    if (item) {
      items.forEach((data) => {
        if (item.includes(data.id)) {
          productData.push(data);
          return;
        }
      });
      setProduct(productData);
      getTotal(productData);
    } else {
      setProduct(productData);
      getTotal(productData);
    }
  };

  /** Get total prices of all items in in the cart */
  const getTotal = (productData) => {
    let total = 0;

    for (let index = 0; index < productData.length; index++) {
      let productPrice = productData[index].productPrice;
      total = total + productPrice;
    }

    setTotal(total);
  };

  /** remove data from cart */
  const removeItemFromCart = async (id) => {
    let itemArray = await AsyncStorage.getItem('cartItems');
    itemArray = JSON.parse(itemArray);

    if (itemArray) {
      let array = itemArray;
      for (let index = 0; index < array.length; index++) {
        if (array[index] == id) {
          array.splice(index, 1);
        }
      }

      await AsyncStorage.setItem('cartItems', JSON.stringify(array));
      getDataFromDB();
    }
  };

  /** Checkout from cart function */
  // const checkout = async () => {
  //   try {
  //     await AsyncStorage.removeItem('cartItems');
  //   } catch (error) {
  //     return error;
  //   }

  //   ToastAndroid.show('Item will be delivered soon');

  //   navigation.navigate('Home');
  // };

  /** Checkout from cart function */
  const checkoutWeb = async () => {
    try {
      await AsyncStorage.removeItem('cartItems');
    } catch (error) {
      return error;
    }

    toast.show('Item will be delivered soon', {
      type: 'success',
      placement: 'top',
      duration: 4000,
      offset: 30,
      animationType: 'slide-in',
    });

    navigation.navigate('Home');
  };

  /** Render Items from cart */
  const renderProducts = (data, index) => {
    return (
      <View>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
          }}
        >
          <TouchableOpacity
            key={data.key}
            onPress={() =>
              navigation.navigate('ProductInfo', { productID: data.id })
            }
            style={{
              width: '30%',
              heigh: 100,
              marginVertical: 6,
              marginRight: 10,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: '100%',
                height: 110,
                padding: 14,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: COLORS.backgroundMedium,
                borderRadius: 10,
                marginRight: 22,
              }}
            >
              <Image
                style={{
                  width: '100%',
                  width: '100%',
                  resizeMode: 'contain',
                }}
                source={data.productImage}
              />
            </View>
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              height: '100%',
              justifyContent: 'space-around',
            }}
          >
            <View>
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    maxWidth: '100%',
                    color: COLORS.black,
                    letterSpacing: 1,
                    fontFamily: 'Poppins_400Regular',
                  }}
                >
                  {data.productName}
                </Text>
                <View
                  style={{
                    marginTop: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: 0.6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'Poppins_400Regular',
                      color: COLORS.black,
                      maxWidth: '85%',
                    }}
                  >
                    {currencyFormat(data.productPrice)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'Poppins_400Regular',
                      color: COLORS.black,
                      marginLeft: 5,
                    }}
                  >
                    (~
                    {currencyFormat(data.productPrice + data.productPrice / 20)}
                    )
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      borderRadius: 100,
                      marginRight: 20,
                      padding: 4,
                      borderWidth: 1,
                      borderColor: COLORS.backgroundMedium,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      style={{
                        fontSize: 16,
                        color: COLORS.backgroundDark,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'Poppins_400Regular',
                    }}
                  >
                    1
                  </Text>
                  <View
                    style={{
                      borderRadius: 100,
                      marginLeft: 20,
                      padding: 4,
                      borderWidth: 1,
                      borderColor: COLORS.backgroundMedium,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      style={{
                        fontSize: 16,
                        color: COLORS.backgroundDark,
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeItemFromCart(data.id)}>
                  <MaterialCommunityIcons
                    name="delete-outline"
                    style={{
                      fontSize: 18,
                      color: COLORS.red,
                      padding: 8,
                      borderRadius: 100,
                      borderColor: COLORS.backgroundMedium,
                      borderWidth: 1,
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return {
    ...(Platform.OS === 'android' || Platform.OS == 'ios' ? (
      <View
        style={{
          width: '100%',
          heigh: '100%',
        }}
      >
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            paddingTop: 16,
            paddingHorizontal: 16,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="chevron-left"
              style={{
                fontSize: 18,
                color: COLORS.backgroundDark,
                padding: 12,
                backgroundColor: COLORS.backgroundMedium,
                borderRadius: 12,
              }}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'Poppins_500Medium',
            }}
          >
            Order Details
          </Text>
          <View></View>
        </View>
        <ScrollView>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 16,
                letterSpacing: 1,
                paddingTop: 20,
                paddingLeft: 16,
                marginBottom: 10,
              }}
            >
              My Cart
            </Text>
            <Text
              style={{
                fontSize: 16,
                marginRight: 16,
                fontFamily: 'Poppins_600SemiBold',
                color: COLORS.gold,
              }}
            >
              {currencyFormat(parseFloat(total))}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            {product ? (
              product.map(renderProducts)
            ) : (
              <Text>No items in the cart</Text>
            )}
          </View>
        </ScrollView>
      </View>
    ) : (
      <View
        style={{
          width: '100%',
          heigh: '100%',
        }}
      >
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            paddingTop: 16,
            paddingHorizontal: 16,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="chevron-left"
              style={{
                fontSize: 18,
                color: COLORS.backgroundDark,
                padding: 12,
                backgroundColor: COLORS.backgroundMedium,
                borderRadius: 12,
              }}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'Poppins_500Medium',
            }}
          >
            Order Details
          </Text>
          <View></View>
        </View>
        <ScrollView>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 16,
                letterSpacing: 1,
                paddingTop: 20,
                paddingLeft: 16,
                marginBottom: 10,
              }}
            >
              My Cart
            </Text>
            <Text
              style={{
                fontSize: 16,
                marginRight: 16,
                fontFamily: 'Poppins_600SemiBold',
                color: COLORS.gold,
              }}
            >
              {currencyFormat(parseFloat(total))}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            {product ? (
              product.map(renderProducts)
            ) : (
              <Text>No items in the cart</Text>
            )}
          </View>
        </ScrollView>
      </View>
    )),
  };
};

export default Cart;
