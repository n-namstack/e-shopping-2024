import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  TextInput,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { getShopInfo } from '../utility/api';
import COLORS from '../../constants/colors';
import FONT_SIZE from '../../constants/fontSize';
import { FontAwesome, Entypo } from '@expo/vector-icons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
} from '@expo-google-fonts/poppins';

const ShopInfo = ({ route, navigation }) => {
  const { shop_uuid } = route.params;
  const [shop, setShop] = useState({});
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
  });

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
          width:'100%'
        }}
      >
        <TouchableOpacity style={{ width: 45 }}>
          <Entypo
            style={{
              fontSize: 25,
              color: COLORS.darkBlue,
              padding: 10,
              fontWeight: 'bold',
              backgroundColor: COLORS.grey,
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
            color: COLORS.grey,
          }}
        >
          {shop.shop_name}
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.normal,
            fontFamily: 'Poppins_400Regular',
            color: COLORS.grey,
          }}
        >
          {shop.shop_desc}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
              // value={newProduct.name}
              // onChangeText={(text) =>
              //   setNewProduct({ ...newProduct, name: text })
              // }
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
                navigation.goBack('Shop');
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
    </View>
  );
};

export default ShopInfo;
