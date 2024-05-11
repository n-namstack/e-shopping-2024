import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Animated,
  // ToastAndroid,
  Platform,
  AlertIOS,
  NativeModules,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { items } from '../components/database/database';
import COLORS from '../../constants/colors';
import { Entypo, Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
} from '@expo-google-fonts/poppins';
import { currencyFormat } from '../utility/utility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from 'react-native-toast-notifications';
import Toast from 'react-native-toast-message';

/** Functions */
const ProductInfo = ({ route, navigation }) => {
  const { productID } = route.params;
  const [product, setProduct] = useState({});
  const width = Dimensions.get('window').width;
  const scrollX = new Animated.Value(0);
  let position = Animated.divide(scrollX, width);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
  });
  const toast = useToast();

  const { ToastModule } = NativeModules;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getDataFromDB();
    });

    return unsubscribe;
  }, [navigation]);

  // Get product data by ID
  const getDataFromDB = async () => {
    for (let index = 0; index < items.length; index++) {
      if (items[index].id == productID) {
        await setProduct(items[index]);

        return;
      }
    }
  };

  // Product horizontal scroll product card
  const renderProduct = ({ item, index }) => {
    return (
      <View
        style={{
          width: width,
          height: 240,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={item}
          style={{
            height: '100%',
            width: '100%',
            resizeMode: 'contain',
          }}
        />
      </View>
    );
  };

  // Add to cart function
  const addToCart = async (id) => {
    let itemArray = await AsyncStorage.getItem('cartItems');
    let msg = 'Item added successfully to cart';
    itemArray = JSON.parse(itemArray);

    if (itemArray) {
      let array = itemArray;
      array.push(id);

      try {
        await AsyncStorage.setItem('cartItems', JSON.stringify(array));
        if (Platform.OS === 'android') {
          toast.show(msg, {
            type: 'success',
            placement: 'top',
            duration: 4000,
            offset: 30,
            animationType: 'slide-in',
          });
        } else if (Platform.OS === 'ios') {
          toast.show('Item added successfully to cart', {
            type: 'success',
            placement: 'top',
            duration: 4000,
            offset: 30,
            animationType: 'slide-in',
          });
        } else if (Platform.OS === 'web') {
          toast.show('Item added successfully to cart', {
            type: 'success',
            placement: 'top',
            duration: 4000,
            offset: 30,
            animationType: 'slide-in',
          });

          Toast.show({
            text: msg,
            type: 'success',
            visibilityTime: 2000,
          });
        }

        navigation.navigate('Home');
      } catch (error) {
        return error;
      }
    } else {
      let array = [];
      array.push(id);
      try {
        await AsyncStorage.setItem('cartItems', JSON.stringify(array));
        if (Platform.OS === 'android') {
          ToastAndroid.show(msg, ToastAndroid.SHORT);
        } else if (Platform.OS === 'ios') {
          AlertIOS.alert(mgs);
        } else {
          toast.show('Item added successfully to cart', {
            type: 'success',
            placement: 'top',
            duration: 4000,
            offset: 30,
            animationType: 'slide-in',
          });
        }
        navigation.navigate('Home');
      } catch (error) {
        return error;
      }
    }
  };

  const addToCartWeb = async (id) => {
    let itemArray = await AsyncStorage.getItem('cartItems');
    itemArray = JSON.parse(itemArray);

    if (itemArray) {
      let array = itemArray;
      array.push(id);

      try {
        await AsyncStorage.setItem('cartItems', JSON.stringify(array));
        toast.show('Item added successfully to cart', {
          type: 'success',
          placement: 'top',
          duration: 4000,
          offset: 30,
          animationType: 'slide-in',
        });
        navigation.navigate('Home');
      } catch (error) {
        return error;
      }
    } else {
      let array = [];
      array.push(id);
      try {
        await AsyncStorage.setItem('cartItems', JSON.stringify(array));
        toast.show('Item added successfully to cart', {
          type: 'success',
          placement: 'top',
          duration: 4000,
          offset: 30,
          animationType: 'slide-in',
        });
        navigation.navigate('Home');
      } catch (error) {
        return error;
      }
    }
  };

  return {
    ...(Platform.OS === 'android' || Platform.OS === 'ios' ? (
      <View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: COLORS.white,
          position: 'relative',
        }}
      >
        <StatusBar
          backgroundColor={COLORS.backgroundLight}
          barStyle={'dark-content'}
        />
        <ScrollView showsHorizontalScrollIndicator={false}>
          <View
            style={{
              width: '100%',
              backgroundColor: COLORS.backgroundLight,
              borderBottomRightRadius: 20,
              borderBottomLeftRadius: 20,
              position: 'relative',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: '100%',
                backgroundColor: COLORS.backgroundLight,
                flexDirection: 'row',
                paddingTop: 16,
                paddingLeft: 16,
              }}
            >
              <TouchableOpacity>
                <Entypo
                  onPress={() => {
                    navigation.goBack('Home');
                  }}
                  name="chevron-left"
                  style={{
                    fontSize: 25,
                    color: COLORS.darkBlue,
                    padding: 10,
                    fontWeight: 'bold',
                    backgroundColor: COLORS.white,
                    borderRadius: 10,
                    paddingTop: 10,
                    paddingLeft: 10,
                  }}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={product.productImageList ? product.productImageList : null}
              horizontal
              renderItem={renderProduct}
              showsHorizontalScrollIndicator={false}
              decelerationRate={0.8}
              snapToInterval={width}
              bounces={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
            />
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 15,
                marginTop: 32,
              }}
            >
              {product.productImageList
                ? product.productImageList.map((data, index) => {
                    let opacity = position.interpolate({
                      inputRange: [index - 1, index, index + 1],
                      outputRange: [0.2, 1, 0.2],
                      extrapolate: 'clamp',
                    });

                    return (
                      <Animated.View
                        key={index}
                        style={{
                          width: '16%',
                          height: 2.4,
                          backgroundColor: COLORS.darkBlue,
                          opacity,
                          marginHorizontal: 4,
                          borderRadius: 100,
                        }}
                      ></Animated.View>
                    );
                  })
                : null}
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 16,
              marginTop: 6,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 14,
              }}
            >
              <Entypo
                name="shopping-cart"
                style={{
                  fontSize: 18,
                  color: COLORS.lightBlue,
                  marginLeft: 6,
                }}
              />
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                {' '}
                Shopping
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                marginVertical: 4,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 18,
                  marginVertical: 4,
                  maxWidth: '84%',
                }}
              >
                {product.productName}
              </Text>
              <Ionicons
                name="link-outline"
                style={{
                  fontSize: 24,
                  color: COLORS.blue,
                  backgroundColor: COLORS.blue + 10,
                  borderRadius: 100,
                }}
              />
            </View>

            <Text
              style={{
                fontSize: 15,
                fontFamily: 'Poppins_400Regular',
                opacity: 0.5,
                lineHeight: 20,
                maxWidth: '95%',
                marginBottom: 18,
                // textAlign:'justify'
              }}
            >
              {product.description}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginVertical: 14,
                borderBottomColor: COLORS.backgroundLight,
                borderBottomWidth: 1,
                paddingBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  width: '80%',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    color: COLORS.lightBlue,
                    backgroundColor: COLORS.backgroundLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                    borderRadius: 100,
                    marginRight: 10,
                  }}
                >
                  <Entypo
                    name="location-pin"
                    style={{
                      fontSize: 20,
                      color: COLORS.lightBlue,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: 'Poppins_400Regular',
                    fontSize: 14,
                    opacity: 0.5,
                  }}
                >
                  Town Square, Post Office Mall, Shop no. 3
                </Text>
              </View>
              <Entypo
                name="chevron-right"
                style={{
                  fontSize: 20,
                  color: COLORS.darkBlue,
                }}
              />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'Poppins_500Medium',
                  marginBottom: 4,
                  maxWidth: '85%',
                  color: COLORS.darkBlue,
                }}
              >
                {currencyFormat(parseFloat(product.productPrice))}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Poppins_600SemiBold',
                    marginRight: 5,
                    color: COLORS.darkBlue,
                  }}
                >
                  Tax rate 15%({currencyFormat(product.productPrice / 15)}):
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Poppins_500Medium',
                    color: COLORS.darkBlue,
                  }}
                >
                  {currencyFormat(
                    product.productPrice + product.productPrice / 15
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            height: '8%',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{
              width: '80%',
              height: '70%',
              backgroundColor: COLORS.gold,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              product.isAvailable ? addToCart(product.id) : null;
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 15,
                color: COLORS.white,
                textTransform: 'uppercase',
              }}
            >
              {product.isAvailable ? 'Add to cart' : 'Not available'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: COLORS.white,
          position: 'relative',
        }}
      >
        <StatusBar
          backgroundColor={COLORS.backgroundLight}
          barStyle={'dark-content'}
        />
        <ScrollView showsHorizontalScrollIndicator={false}>
          <View
            style={{
              width: '100%',
              backgroundColor: COLORS.backgroundLight,
              borderBottomRightRadius: 20,
              borderBottomLeftRadius: 20,
              position: 'relative',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: '100%',
                backgroundColor: COLORS.backgroundLight,
                flexDirection: 'row',
                paddingTop: 16,
                paddingLeft: 16,
              }}
            >
              <TouchableOpacity>
                <Entypo
                  onPress={() => {
                    navigation.goBack('Home');
                  }}
                  name="chevron-left"
                  style={{
                    fontSize: 25,
                    color: COLORS.darkBlue,
                    padding: 10,
                    fontWeight: 'bold',
                    backgroundColor: COLORS.white,
                    borderRadius: 10,
                    paddingTop: 10,
                    paddingLeft: 10,
                  }}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={product.productImageList ? product.productImageList : null}
              horizontal
              renderItem={renderProduct}
              showsHorizontalScrollIndicator={false}
              decelerationRate={0.8}
              snapToInterval={width}
              bounces={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
            />
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 15,
                marginTop: 32,
              }}
            >
              {product.productImageList
                ? product.productImageList.map((data, index) => {
                    let opacity = position.interpolate({
                      inputRange: [index - 1, index, index + 1],
                      outputRange: [0.2, 1, 0.2],
                      extrapolate: 'clamp',
                    });

                    return (
                      <Animated.View
                        key={index}
                        style={{
                          width: '16%',
                          height: 2.4,
                          backgroundColor: COLORS.darkBlue,
                          opacity,
                          marginHorizontal: 4,
                          borderRadius: 100,
                        }}
                      ></Animated.View>
                    );
                  })
                : null}
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 16,
              marginTop: 6,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 14,
              }}
            >
              <Entypo
                name="shopping-cart"
                style={{
                  fontSize: 18,
                  color: COLORS.lightBlue,
                  marginLeft: 6,
                }}
              />
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                {' '}
                Shopping
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                marginVertical: 4,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 18,
                  marginVertical: 4,
                  maxWidth: '84%',
                }}
              >
                {product.productName}
              </Text>
              <Ionicons
                name="link-outline"
                style={{
                  fontSize: 24,
                  color: COLORS.blue,
                  backgroundColor: COLORS.blue + 10,
                  borderRadius: 100,
                }}
              />
            </View>

            <Text
              style={{
                fontSize: 15,
                fontFamily: 'Poppins_400Regular',
                opacity: 0.5,
                lineHeight: 20,
                maxWidth: '95%',
                marginBottom: 18,
                // textAlign:'justify'
              }}
            >
              {product.description}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginVertical: 14,
                borderBottomColor: COLORS.backgroundLight,
                borderBottomWidth: 1,
                paddingBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  width: '80%',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    color: COLORS.lightBlue,
                    backgroundColor: COLORS.backgroundLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                    borderRadius: 100,
                    marginRight: 10,
                  }}
                >
                  <Entypo
                    name="location-pin"
                    style={{
                      fontSize: 20,
                      color: COLORS.lightBlue,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: 'Poppins_400Regular',
                    fontSize: 14,
                    opacity: 0.5,
                  }}
                >
                  Town Square, Post Office Mall, Shop no. 3
                </Text>
              </View>
              <Entypo
                name="chevron-right"
                style={{
                  fontSize: 20,
                  color: COLORS.darkBlue,
                }}
              />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'Poppins_500Medium',
                  marginBottom: 4,
                  maxWidth: '85%',
                  color: COLORS.darkBlue,
                }}
              >
                {currencyFormat(parseFloat(product.productPrice))}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Poppins_600SemiBold',
                    marginRight: 5,
                    color: COLORS.darkBlue,
                  }}
                >
                  Tax rate 15%({currencyFormat(product.productPrice / 15)}):
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Poppins_500Medium',
                    color: COLORS.darkBlue,
                  }}
                >
                  {currencyFormat(
                    product.productPrice + product.productPrice / 15
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            height: '8%',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{
              width: '80%',
              height: '70%',
              backgroundColor: COLORS.gold,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              product.isAvailable ? addToCartWeb(product.id) : null;
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins_500Medium',
                fontSize: 15,
                color: COLORS.white,
                textTransform: 'uppercase',
              }}
            >
              {product.isAvailable ? 'Add to cart' : 'Not available'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )),
  };
};

export default ProductInfo;
