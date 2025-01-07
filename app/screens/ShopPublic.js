import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShopCard from './cards/shopPublicCard';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import { getPublicShops } from '../utility/api';
import { convertText } from '../utility/utility';

const ShopPublic = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const getShops = async () => {
    getPublicShops(setShops, setLoading);
  };

  useEffect(() => {
    getShops();
  }, []);

  const data = [
    {
      id: '1',
      title: 'Aurora Emporium',
      shopOwner: 'James Khange',
      shopLink: 'www.shopit.com/shops/shop-name=aurora',
      image:
        'https://cdn.pixabay.com/photo/2018/02/21/10/46/stock-3170020_1280.jpg',
    },
    {
      id: '2',
      title: 'Aurora Emporium',
      shopOwner: 'James Khange',
      shopLink: 'www.shopit.com/shops/shop-name=aurora',
      image:
        'https://images.pexels.com/photos/135620/pexels-photo-135620.jpeg?cs=srgb&dl=pexels-shattha-pilabut-38930-135620.jpg&fm=jpg',
    },
    {
      id: '3',
      title: 'Aurora Emporium',
      shopOwner: 'James Khange',
      shopLink: 'www.shopit.com/shops/shop-name=aurora',
      image:
        'https://plus.unsplash.com/premium_photo-1663039978847-63f7484bf701?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z3JvY2VyeSUyMHN0b3JlfGVufDB8fDB8fHww',
    },
    {
      id: '4',
      title: 'Aurora Emporium',
      shopOwner: 'James Khange',
      shopLink: 'www.shopit.com/shops/shop-name=aurora',
      image:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXSsWMyXpT3jg64Om7Q3SkTOg5QYzRJXH_pg&s',
    },
  ];

  const renderItem = ({ item }) => (
    <ShopCard
      shopName={item.shop_name}
      ownerName={item.username}
      shopImage={item.profile_img}
      shopLink={`http://localhost:8000/${convertText(item.shop_name)}-${
        item.shop_uuid
      }`}
      shopDesc={item.shop_desc}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Shopit</Text>
        <Ionicons name="menu" size={24} color="#000" />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="Search shop" />
        <Ionicons
          name="search"
          size={20}
          color="#000"
          style={styles.searchIcon}
        />
      </View>

      {/* Shop List */}
      <FlatList
        data={shops}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <Ionicons name="home" size={24} color="#000" />
        <Ionicons name="search" size={24} color="#000" />
        <Ionicons name="cart" size={24} color="#000" />
        <Ionicons name="person" size={24} color="#000" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
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
  list: {
    paddingHorizontal: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    margin: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#ffb300',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
});

export default ShopPublic;
