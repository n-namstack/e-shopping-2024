// ShopCard.js
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../constants/colors';
import FONT_SIZE from '../../constants/fontSize';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;
const DEFAULT_SHOP_IMAGE = 'https://via.placeholder.com/300x300?text=Shop+Image';

const ShopCard = ({ navigation, item }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ShopInfo', { shop_uuid: item.shop_uuid })}
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.profile_img || DEFAULT_SHOP_IMAGE }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.shop_name || item.name}
        </Text>
        
        <Text style={styles.owner} numberOfLines={1}>
          by {item.username}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.heartButton} 
        onPress={() => {}}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="heart-outline" size={24} color="#1E293B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 210,
    margin: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  imageContainer: {
    height: '65%',
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  owner: {
    fontSize: 13,
    color: '#64748B',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ShopCard;
