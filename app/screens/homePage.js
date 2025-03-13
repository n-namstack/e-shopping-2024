import {
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  TextInput,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
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
import {
  currencyFormat,
  isMobileDevice,
  convertText,
} from '../utility/utility';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBannerCarousel from '../components/banner/banner';

const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [accessory, setAccessory] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollViewRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth / 2;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (scrollViewRef.current) {
        const nextPosition =
          scrollPosition + cardWidth >= products.length * cardWidth
            ? 0
            : scrollPosition + cardWidth;

        scrollViewRef.current.scrollTo({ x: nextPosition, animated: true });
        setScrollPosition(nextPosition);
      }
    }, 3000); // Change scroll every 3 seconds

    return () => clearInterval(intervalId); // Clear interval on unmount
  }, [scrollPosition, products.length, cardWidth]);

  /*** Dynamic Categories */
  const categories = [
    'Electronics',
    'Clothing',
    'Home Appliances',
    'Books',
    'Sports',
    'Beauty',
    'Toys',
    'Groceries',
    'Furniture',
    'Accessories',
  ];

  const banners = [
    {
      imageUrl:
        'https://img.freepik.com/premium-vector/furniture-facebook-cover-profile-page-web-banner-template_594295-301.jpg',
    },
    {
      imageUrl:
        'https://img.lovepik.com/free-template/20211026/lovepik-colorful-geometric-modern-furniture-banners-image_6265452_list.jpg!/fw/431/clip/0x300a0a0',
    },
    {
      imageUrl:
        'https://img.lovepik.com/free-template/20211026/lovepik-colorful-modern-furniture-banners-image_3414308_list.jpg!/fw/431/clip/0x300a0a0',
    },
    {
      imageUrl:
        'https://img.freepik.com/free-vector/gradient-furniture-sale-landing-page-template_23-2148930033.jpg?t=st=1737066995~exp=1737070595~hmac=453a8d4114c537d1edbfb235f271b18e53e8635b795ff47395b37234b5dd82aa',
    },
  ];

  /*** Dynamic placeholders for the search bar(Starts)*/
  const placeholders = [
    'Search products',
    'Search categories',
    'Search brands',
    'Search deals',
  ];

  const [currentPlaceholder, setCurrentPlaceholder] = useState(placeholders[0]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: -25,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        setCurrentPlaceholder((prev) => {
          const currentIndex = placeholders.indexOf(prev);
          const nextIndex = (currentIndex + 1) % placeholders.length;
          return placeholders[nextIndex];
        });

        fadeAnim.setValue(20);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  /*** Dynamic placeholders for the search bar(Ends)*/

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
      if (
        items[index].category == 'Products' ||
        items[index].category == 'Accessory'
      ) {
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
          width: '95%',
          marginVertical: 14,
        }}
      >
        <View
          style={{
            width: '100%',
            height: 140,
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
                width: '35%',
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
                  fontSize: 14,
                  color: COLORS.white,
                  // letterSpacing: 1,
                }}
              >
                {data.offPercentage}% off
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
        <Text
          style={{
            fontSize: 12,
            fontFamily: 'Poppins_400Regular',
            color: COLORS.grey,
          }}
        >
          @{convertText(data.shopOwner)}'s shop
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
        <View
          style={{
            height: 1,
            backgroundColor: COLORS.backgroundLight,
            marginVertical: 10,
          }}
        ></View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            // justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontFamily: 'Poppins_700Bold',
              fontSize: 15,
              color: COLORS.darkBlue,
            }}
          >
            {currencyFormat(
              data.productPrice - (data.offPercentage / 100) * data.productPrice
            )}{' '}
          </Text>
          {data.isOff ? (
            <Text
              style={{
                fontFamily: 'Poppins_400Regular',
                fontSize: 14,
                color: COLORS.grey,
                textDecorationLine: 'line-through',
              }}
            >
              {currencyFormat(data.productPrice)}
            </Text>
          ) : null}
        </View>
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
        <View style={{ backgroundColor: COLORS.white }}>
          <View style={styles.searchContainer}>
            <Animated.View
              style={{
                flex: 1,
                height: 45,
                transform: [{ translateY: fadeAnim }],
              }}
            >
              <TextInput
                style={styles.searchInput}
                placeholder={currentPlaceholder}
                placeholderTextColor={COLORS.backgroundMedium}
              />
            </Animated.View>

            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.backgroundMedium,
                  color: COLORS.white,
                  paddingHorizontal: 5,
                  paddingVertical: 5,
                  borderRadius: 5,
                }}
                onPress={() => {
                  Alert.alert('Search', 'Search products');
                }}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={COLORS.white}
                  style={styles.searchIcon}
                />
              </TouchableOpacity>
              <View
                style={{
                  width: 2,
                  backgroundColor: COLORS.backgroundLight,
                  marginHorizontal: 3,
                }}
              ></View>
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.backgroundMedium,
                  color: COLORS.white,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 5,
                }}
              >
                <MaterialCommunityIcons
                  name="image-search"
                  size={20}
                  color={COLORS.white}
                  style={styles.searchIcon}
                  onPress={() => {
                    Alert.alert('Image', 'Search products with images!!');
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category, index) => (
              <TouchableOpacity key={index} style={styles.category}>
                <Text style={styles.categoryText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* <StatusBar backgroundColor={COLORS.darkBlue} barStyle={'dark-content'} /> */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Search Bar */}

          <View>
            <View
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
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
                  Featured Products
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
                  [{products.length}]
                </Text>
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <ScrollView
                ref={scrollViewRef}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                style={{ paddingVertical: 10 }}
                contentContainerStyle={{ width: products.length * cardWidth }}
              >
                {products.map((data, index) => (
                  <View key={index} style={{ width: cardWidth }}>
                    <ProductCard data={data} />
                  </View>
                ))}
              </ScrollView>
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
                  Featured Shops
                </Text>
                {/* <Text
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
                </Text> */}
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
              <AnimatedBannerCarousel banners={banners} />
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

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 35,
    marginHorizontal: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    // elevation: 3,
    // shadowColor: '#000',
    // shadowOpacity: 0.1,
    // shadowOffset: { width: 0, height: 2 },
    // shadowRadius: 4,
    borderColor: COLORS.backgroundLight,
    borderWidth: 2,
    marginBottom: 15,
  },
  mainSearchContainer: {
    position: 'absolute', // Keeps it fixed at the top
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
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
  categoriesContainer: {
    flexDirection: 'row',
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  category: {
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins_500Medium',
  },
  contentContainer: {
    marginTop: 100,
    padding: 20,
  },
});

export default HomeScreen;
