// ShopCard.js
import {
  View,
  Text,
  Image,
  Button,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../constants/colors';
import FONT_SIZE from '../../constants/fontSize';
import { fetchShops } from './api';
import { convertText } from './utility';

const ShopCard = ({ navigation, item }) => {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out @${
          item.username
        }'s shop: http://localhost:8000/${convertText(item.shop_name)}-${
          item.shop_uuid
        }`,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        margin: 10,
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 5,
        // shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 0,
      }}
    >
      <Image
        source={{ uri: item.profile_img }}
        style={{ width: '100%', height: 150, borderRadius: 3 }}
      />
      <Text
        style={{
          fontSize: FONT_SIZE.normal,
          fontFamily: 'Poppins_600SemiBold',
        }}
      >
        {item.shop_name}
      </Text>
      <Text
        style={{
          borderBottomWidth: 1,
          borderBottomColor: COLORS.backgroundLight,
          // paddingBottom: 5,
          fontSize: FONT_SIZE.normal,
          fontFamily: 'Poppins_400Regular',
          color: COLORS.grey,
        }}
      >
        @{item.username}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 5,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ShopInfo', { shop_uuid: item.shop_uuid })
          }
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: COLORS.darkBlue,
            borderRadius: 3,
          }}
        >
          <Text
            style={{
              fontFamily: 'Poppins_400Regular',
              fontSize: FONT_SIZE.normal,
              color: COLORS.white,
            }}
          >
            View shop
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            paddingBottom: 3,
            borderRadius: 3,
            backgroundColor: COLORS.grey,
          }}
          onPress={onShare}
        >
          <MaterialCommunityIcons
            name="share"
            style={{
              fontSize: 25,
              color: COLORS.darkBlue,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 2,
              borderRadius: 30,
              paddingHorizontal: 15,
              paddingVertical: 5,
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ShopCard;
