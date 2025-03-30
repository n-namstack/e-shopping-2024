import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getShopInfo, createProduct } from '../utility/api';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 300;
const HEADER_MIN_HEIGHT = 90;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const DEFAULT_BANNER = 'https://via.placeholder.com/1200x400?text=Shop+Banner';
const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/300x300?text=Product+Image';

const ShopDetail = ({ route, navigation }) => {
  const { shop_id } = route.params;
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    quantity: '',
    images: [],
  });
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchShopDetails();
  }, [shop_id]);

  const fetchShopDetails = async () => {
    try {
      const shopData = await getShopInfo(shop_id, setShop);
      // Check if user is already following this shop
      if (shopData?.followers?.includes(user?.id)) {
        setIsFollowing(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shop details:', error);
      setLoading(false);
    }
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      setNewProduct({
        ...newProduct,
        images: [...newProduct.images, ...result.assets.map(asset => asset.uri)]
      });
    }
  };

  const handleCreateProduct = async () => {
    try {
      if (!newProduct.name || !newProduct.price || !newProduct.quantity) {
        alert('Please fill in all required fields');
        return;
      }

      const productData = {
        ...newProduct,
        shop_id,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.quantity),
      };

      await createProduct(productData);
      setModalVisible(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        category: '',
        quantity: '',
        images: [],
      });
      fetchShopDetails();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    }
  };

  const handleFollowShop = async () => {
    // Check if user is the shop owner
    if (user?.id === shop?.owner_id) {
      Alert.alert("Cannot follow", "You cannot follow your own shop");
      return;
    }

    try {
      // In a real app, this would call an API to follow/unfollow the shop
      const updatedFollowers = isFollowing
        ? shop.followers.filter(id => id !== user?.id)
        : [...(shop.followers || []), user?.id];
      
      // Update local state
      setShop({
        ...shop,
        followers: updatedFollowers
      });
      
      setIsFollowing(!isFollowing);
      
      // Display success message
      Alert.alert(
        "Success", 
        isFollowing 
          ? `You have unfollowed ${shop.name}`
          : `You are now following ${shop.name}`
      );
    } catch (error) {
      console.error('Error following shop:', error);
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  const isOwner = user?.id === shop?.owner_id;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.Image
          source={{ uri: shop?.banner || DEFAULT_BANNER }}
          style={[styles.headerImage, { opacity: imageOpacity }]}
        />
        <Animated.View style={[styles.headerTitleContainer, { opacity: headerTitleOpacity }]}>
          <Text style={styles.headerTitle}>{shop?.name}</Text>
        </Animated.View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop?.name}</Text>
            <Text style={styles.shopDescription}>{shop?.description}</Text>

            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <FontAwesome5 name="store" size={20} color="#0f172a" />
                <Text style={styles.statLabel}>Products</Text>
                <Text style={styles.statValue}>{shop?.products?.length || 0}</Text>
              </View>
              <View style={styles.stat}>
                <FontAwesome5 name="star" size={20} color="#0f172a" />
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>{shop?.rating || '0.0'}</Text>
              </View>
              <View style={styles.stat}>
                <FontAwesome5 name="users" size={20} color="#0f172a" />
                <Text style={styles.statLabel}>Followers</Text>
                <Text style={styles.statValue}>{shop?.followers?.length || 0}</Text>
              </View>
            </View>

            {isOwner ? (
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => setModalVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                <Text style={styles.addProductButtonText}>Add Product</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton
                ]}
                onPress={handleFollowShop}
              >
                <FontAwesome5 
                  name={isFollowing ? "user-check" : "user-plus"} 
                  size={16} 
                  color="#fff" 
                  style={styles.followIcon}
                />
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Products</Text>
          {shop?.products?.length > 0 ? (
            <FlatList
              data={shop.products}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productCard}>
                  <Image 
                    source={{ uri: item.image || DEFAULT_PRODUCT_IMAGE }} 
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productPrice}>${item.price}</Text>
                    <Text style={styles.productStock}>In Stock: {item.quantity}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
              horizontal={false}
              numColumns={2}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyProducts}>
              <MaterialCommunityIcons name="package-variant" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No products yet</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Product</Text>

            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              value={newProduct.description}
              onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Price"
              keyboardType="decimal-pad"
              value={newProduct.price}
              onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Category"
              value={newProduct.category}
              onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              keyboardType="number-pad"
              value={newProduct.quantity}
              onChangeText={(text) => setNewProduct({ ...newProduct, quantity: text })}
            />

            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <MaterialCommunityIcons name="image-plus" size={24} color="#0f172a" />
              <Text style={styles.imagePickerText}>
                Add Images ({newProduct.images.length})
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateProduct}
              >
                <Text style={styles.createButtonText}>Create Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    zIndex: 1,
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: null,
    height: HEADER_MAX_HEIGHT,
    resizeMode: 'cover',
  },
  headerTitleContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    marginTop: HEADER_MAX_HEIGHT,
    padding: 16,
  },
  shopInfo: {
    marginBottom: 24,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  shopDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  addProductButton: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProductButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  productCard: {
    width: (width - 48) / 2,
    marginHorizontal: 4,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  productStock: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyProducts: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 8,
    marginBottom: 16,
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#0f172a',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#0f172a',
  },
  followIcon: {
    marginRight: 8,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShopDetail; 