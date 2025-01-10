import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../../constants/colors';
import FONT_SIZE from '../../../constants/fontSize';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';

const ShopCard = ({ shopName, ownerName, shopImage, shopLink, shopDesc }) => {
  const [showSideshow, setShowSideshow] = useState(false);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this awesome shop: ${shopLink}`,
        title: `${shopName} - Owned by ${ownerName}`,
      });
    } catch (error) {
      console.error('Error sharing shop:', error);
    }
  };

  const handleViewShop = () => {
    Linking.openURL(shopLink);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setShowSideshow(!showSideshow)}
        style={styles.imageContainer}
      >
        <Image
          source={{ uri: shopImage }}
          style={styles.image}
          resizeMode="cover"
        />
        {showSideshow && (
          <View style={styles.sideshow}>
            <Text style={styles.sideshowText}>{shopDesc}</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.detailsContainer}>
        <Text style={styles.shopName}>{shopName}</Text>
        <Text style={styles.ownerName}>@{ownerName}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.viewButton} onPress={handleViewShop}>
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            borderColor: COLORS.darkBlue,
            borderWidth: 2,
            marginTop: 10,
            width: '30%',
            alignItems: 'center',
            marginLeft: 5,
            borderRadius: 5,
          }}
          onPress={handleShare}
        >
          {/* <Text style={styles.shareButtonText}>Share</Text> */}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    marginLeft: 5,
    marginRight: 5,
    elevation: 0,
    flex: 1,
  },
  imageContainer: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  image: {
    width: '100%',
    height: 200,
  },
  sideshow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    height: '100%',
    textAlign: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sideshowText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: FONT_SIZE.normal,
  },
  detailsContainer: {
    marginTop: 10,
  },
  shopName: {
    // fontWeight: 'bold',
    fontSize: FONT_SIZE.tile,
    fontFamily: 'Poppins_600SemiBold',
  },
  ownerName: {
    color: '#888',
    fontFamily: 'Poppins_400Regular',
    fontSize: FONT_SIZE.normal,
  },
  shareButton: {
    backgroundColor: COLORS.darkBlue,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    width: '50%',
    marginLeft: 5,
  },
  shareButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: FONT_SIZE.normal,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  viewButton: {
    backgroundColor: COLORS.darkBlue,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    width: '65%',
  },
  viewButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: FONT_SIZE.normal,
  },
});

export default ShopCard;
