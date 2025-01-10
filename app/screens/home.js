import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  ImageBackground,
  Platform,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import COLORS from '../../constants/colors';
import { items } from '../components/database/database';
import {
  Entypo,
  MaterialCommunityIcons,
  FontAwesome,
} from '@expo/vector-icons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import { currencyFormat, isMobileDevice } from '../utility/utility';

const Home = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [accessory, setAccessory] = useState([]);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getDataFromDB();
    });

    return unsubscribe;
  }, [navigation]);

  //get data from db
  const getDataFromDB = () => {
    let productList = [];
    let accessoryList = [];

    for (let index = 0; index < items.length; index++) {
      if (items[index].category == 'Products') {
        productList.push(items[index]);
      }
      if (items[index].category == 'Accessory') {
        accessoryList.push(items[index]);
      } else {
      }
    }

    setProducts(productList);
    setAccessory(accessoryList);
  };

  // Create a product re-usable card
  const ProductCard = ({ data }) => {
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('ProductInfo', { productID: data.id })
        }
        style={{
          width: '48%',
          marginVertical: 14,
        }}
      >
        <View
          style={{
            width: '100%',
            height: 100,
            borderRadius: 10,
            backgroundColor: COLORS.backgroundLight,
            position: 'relative',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {data.isOff ? (
            <View
              style={{
                position: 'absolute',
                width: '24%',
                height: '24%',
                backgroundColor: COLORS.gold,
                top: 0,
                left: 0,
                borderTopLeftRadius: 10,
                borderBottomRightRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_500Medium_Italic',
                  fontSize: 15,
                  color: COLORS.white,
                  letterSpacing: 1,
                }}
              >
                {data.offPercentage}%
              </Text>
            </View>
          ) : null}
          <Image
            source={data.productImage}
            style={{
              width: '80%',
              height: '80%',
              resizeMode: 'contain',
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 15,
            fontFamily: 'Poppins_500Medium',
            color: COLORS.black,
            marginBottom: 2,
          }}
        >
          {data.productName}
        </Text>
        {data.category == 'Accessory' ? (
          data.isAvailable ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <FontAwesome
                name="circle"
                style={{
                  fontSize: 15,
                  marginRight: 6,
                  color: COLORS.secondary,
                }}
              />
              <Text
                style={{
                  color: COLORS.secondary,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                Available
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <FontAwesome
                name="circle"
                style={{
                  fontSize: 15,
                  marginRight: 6,
                  color: COLORS.red,
                }}
              />
              <Text
                style={{
                  color: COLORS.red,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                Unavailable
              </Text>
            </View>
          )
        ) : null}
        <Text
          style={{
            fontFamily: 'Poppins_500Medium',
            fontSize: 15,
            color: COLORS.darkBlue,
          }}
        >
          {currencyFormat(data.productPrice)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return null;
  }
  return {
    ...(Platform.OS === 'android' || Platform.OS === 'ios' ? (
      <View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: COLORS.white,
        }}
      >
        {/* <StatusBar backgroundColor={COLORS.darkBlue} barStyle={'dark-content'} /> */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* <ImageBackground
            source={require('../../assets/shop-bg/elect-bg.jpg')}
            imageStyle={{ opacity: 0.2 }}
            style={{
              flex: 1,
              resizeMode: 'cover',
              justifyContent: 'center',
              backgroundColor: 'rgba(44, 62, 80,1)',
              marginBottom: 10,
            }}
          >
            <StatusBar
              backgroundColor={COLORS.darkBlue}
              barStyle={'dark-content'}
              style={{ backgroundColor: 'transparent' }}
            />
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <TouchableOpacity>
                <Entypo
                  name="shopping-bag"
                  style={{
                    fontSize: 18,
                    color: COLORS.backgroundMedium,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: COLORS.backgroundLight,
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
                <MaterialCommunityIcons
                  name="cart"
                  style={{
                    fontSize: 18,
                    color: COLORS.backgroundMedium,
                    padding: 12,
                    borderRadius: 10,
                    borderColor: COLORS.backgroundLight,
                    backgroundColor: COLORS.backgroundLight,
                    borderWidth: 1,
                  }}
                />
              </TouchableOpacity>
            </View>
            <View
              style={{
                marginBottom: 10,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 18,
                  marginBottom: 10,
                  color: COLORS.backgroundLight,
                }}
              >
                HI-FI Shop &amp; Services
              </Text>
              <Text
                style={{
                  fontFamily: 'Poppins_400Regular',
                  fontSize: 16,
                  lineHeight: 25,
                  color: COLORS.backgroundLight,
                  marginBottom: 15,
                }}
              >
                Audio shop on Sam Nujoma Avenu 57 This shop offers both products
                and services
              </Text>
            </View>
          </ImageBackground> */}
          <View>
            <View
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Poppins_700Bold',
                    color: COLORS.black,
                    letterSpacing: 1,
                  }}
                >
                  Products
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'Poppins_500Medium',
                    color: COLORS.black,
                    letterSpacing: 1,
                    opacity: 0.5,
                    marginLeft: 10,
                  }}
                >
                  41
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.black,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                See All
              </Text>
            </View>
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                {products.map((data) => {
                  return <ProductCard data={data} key={data.id} />;
                })}
              </View>
            </View>
          </View>
          {/**Accessories */}
          <View>
            <View
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Poppins_700Bold',
                    color: COLORS.black,
                    letterSpacing: 1,
                  }}
                >
                  Accessories
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'Poppins_400Regular',
                    color: COLORS.black,
                    letterSpacing: 1,
                    opacity: 0.5,
                    marginLeft: 10,
                  }}
                >
                  78
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.black,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                See All
              </Text>
            </View>
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                {accessory.map((data) => {
                  return <ProductCard data={data} key={data.id} />;
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    ) : (
      <View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: COLORS.white,
        }}
      >
        {/* <StatusBar backgroundColor={COLORS.darkBlue} barStyle={'dark-content'} /> */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground
            source={require('../../assets/shop-bg/elect-bg.jpg')}
            imageStyle={{ opacity: 0.2 }}
            style={{
              flex: 1,
              resizeMode: 'cover',
              justifyContent: 'center',
              backgroundColor: 'rgba(44, 62, 80,1)',
              marginBottom: 10,
            }}
          >
            <StatusBar
              backgroundColor={COLORS.darkBlue}
              barStyle={'dark-content'}
              style={{ backgroundColor: 'transparent' }}
            />
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <TouchableOpacity>
                <Entypo
                  name="shopping-bag"
                  style={{
                    fontSize: 18,
                    color: COLORS.backgroundMedium,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: COLORS.backgroundLight,
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
                <MaterialCommunityIcons
                  name="cart"
                  style={{
                    fontSize: 18,
                    color: COLORS.backgroundMedium,
                    padding: 12,
                    borderRadius: 10,
                    borderColor: COLORS.backgroundLight,
                    backgroundColor: COLORS.backgroundLight,
                    borderWidth: 1,
                  }}
                />
              </TouchableOpacity>
            </View>
            <View
              style={{
                marginBottom: 10,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 18,
                  marginBottom: 10,
                  color: COLORS.backgroundLight,
                }}
              >
                HI-FI Shop &amp; Services
              </Text>
              <Text
                style={{
                  fontFamily: 'Poppins_400Regular',
                  fontSize: 16,
                  lineHeight: 25,
                  color: COLORS.backgroundLight,
                  marginBottom: 15,
                }}
              >
                Audio shop on Sam Nujoma Avenu 57 This shop offers both products
                and services
              </Text>
            </View>
          </ImageBackground>
          <View>
            <View
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Poppins_700Bold',
                    color: COLORS.black,
                    letterSpacing: 1,
                  }}
                >
                  Products
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'Poppins_500Medium',
                    color: COLORS.black,
                    letterSpacing: 1,
                    opacity: 0.5,
                    marginLeft: 10,
                  }}
                >
                  41
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.black,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                See All
              </Text>
            </View>
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                {products.map((data) => {
                  return <ProductCard data={data} key={data.id} />;
                })}
              </View>
            </View>
          </View>
          {/**Accessories */}
          <View>
            <View
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Poppins_700Bold',
                    color: COLORS.black,
                    letterSpacing: 1,
                  }}
                >
                  Accessories
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'Poppins_400Regular',
                    color: COLORS.black,
                    letterSpacing: 1,
                    opacity: 0.5,
                    marginLeft: 10,
                  }}
                >
                  78
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.black,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                See All
              </Text>
            </View>
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                {accessory.map((data) => {
                  return <ProductCard data={data} key={data.id} />;
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    )),
  };
};

export default Home;
