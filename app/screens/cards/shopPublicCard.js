import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const DEFAULT_SHOP_IMAGE = 'https://via.placeholder.com/300x300?text=Shop+Image';

const ShopCard = ({
  shop_id,
  shopName,
  ownerName,
  shopImage,
  shopDesc,
  rating = 4.5,
  productsCount = 0,
  onFollow,
  onShare,
  owner_id,
}) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const isOwner = user?.id === owner_id;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ShopDetail', { shop_id })}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: shopImage || DEFAULT_SHOP_IMAGE }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {shopName}
          </Text>
          
          <Text style={styles.owner} numberOfLines={1}>
            by {ownerName}
          </Text>

          <View style={styles.stats}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{rating}</Text>
            </View>
            
            <View style={styles.productsContainer}>
              <MaterialCommunityIcons name="package-variant" size={14} color="#fff" />
              <Text style={styles.products}>{productsCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {isOwner ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.manageButton]}
              onPress={() => navigation.navigate('ShopDetail', { shop_id })}
            >
              <FontAwesome name="gear" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={onFollow}>
              <MaterialCommunityIcons name="heart-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 220,
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  owner: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  productsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  products: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  manageButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
});

export default ShopCard;
