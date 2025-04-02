import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

const ProductsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, in-stock, out-of-stock, on-order
  const [currentShopId, setCurrentShopId] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products, filter]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      
      console.log('Loading products for user:', user.id);
      
      // Fetch all user shops
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (shopsError) {
        console.error('Error fetching shops:', shopsError.message);
        throw shopsError;
      }
      
      console.log('Shops found:', shops ? shops.length : 0);
      
      if (!shops || shops.length === 0) {
        console.log('No shops found for user');
        setProducts([]);
        setCurrentShopId(null);
        Alert.alert('No Shops Found', 'Please create a shop first before adding products.');
        return;
      }
      
      // Get all shop IDs
      const shopIds = shops.map(shop => shop.id);
      
      // Store first shop ID for add product functionality (or implement shop selection)
      setCurrentShopId(shops[0].id);
      
      console.log('Fetching products for all shop IDs:', shopIds);
      
      // Get products from all shops with shop information
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          shop:shop_id(id, name)
        `)
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching products:', error.message);
        throw error;
      }
      
      console.log('Products found:', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('First product sample:', JSON.stringify(data[0]));
      }
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error.message);
      Alert.alert('Error', `Failed to load products: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let results = [...products];
    
    // Apply search filter
    if (searchQuery) {
      results = results.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category/stock filter
    if (filter !== 'all') {
      if (filter === 'in-stock') {
        results = results.filter(product => product.stock_quantity > 0 && !product.is_on_order);
      } else if (filter === 'out-of-stock') {
        results = results.filter(product => product.stock_quantity <= 0 && !product.is_on_order);
      } else if (filter === 'on-order') {
        results = results.filter(product => product.is_on_order);
      }
    }
    
    setFilteredProducts(results);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);
              
              if (error) throw error;
              
              // Update the products list
              setProducts(products.filter(product => product.id !== productId));
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error.message);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const formatCurrency = (amount) => {
    return `N$${amount.toFixed(2)}`;
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={30} color="#ccc" />
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
          
          <View style={styles.productDetailRow}>
            <Text style={styles.productDetailLabel}>Shop:</Text>
            <Text style={styles.productDetailValue}>{item.shop?.name || 'Unknown Shop'}</Text>
          </View>
          
          <View style={styles.productDetailRow}>
            <Text style={styles.productDetailLabel}>Category:</Text>
            <Text style={styles.productDetailValue}>{item.category}</Text>
          </View>
          
          <View style={styles.productDetailRow}>
            <Text style={styles.productDetailLabel}>Stock:</Text>
            <Text style={[
              styles.productDetailValue,
              item.is_on_order ? styles.onOrder : 
              (item.stock_quantity <= 0 ? styles.outOfStock : null)
            ]}>
              {item.is_on_order ? 'On Order' : 
               (item.stock_quantity <= 0 ? 'Out of Stock' : item.stock_quantity)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditProduct', { productId: item.id })}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteProduct(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            if (currentShopId) {
              // Show shop selection dialog if multiple shops
              if (products.length > 0 && new Set(products.map(p => p.shop_id)).size > 1) {
                Alert.alert(
                  'Select Shop',
                  'Which shop would you like to add a product to?',
                  [...new Set(products.map(p => ({ 
                    id: p.shop_id, 
                    name: p.shop?.name || 'Unknown Shop' 
                  })))].map(shop => ({
                    text: shop.name,
                    onPress: () => navigation.navigate('AddProduct', { shopId: shop.id })
                  })).concat([{ text: 'Cancel', style: 'cancel' }])
                );
              } else {
                navigation.navigate('AddProduct', { shopId: currentShopId });
              }
            } else {
              Alert.alert('No Shop Selected', 'Please create a shop first to add products.');
            }
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterButtonText, filter === 'all' && styles.activeFilterButtonText]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'in-stock' && styles.activeFilterButton]}
              onPress={() => setFilter('in-stock')}
            >
              <Text style={[styles.filterButtonText, filter === 'in-stock' && styles.activeFilterButtonText]}>
                In Stock
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'out-of-stock' && styles.activeFilterButton]}
              onPress={() => setFilter('out-of-stock')}
            >
              <Text style={[styles.filterButtonText, filter === 'out-of-stock' && styles.activeFilterButtonText]}>
                Out of Stock
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'on-order' && styles.activeFilterButton]}
              onPress={() => setFilter('on-order')}
            >
              <Text style={[styles.filterButtonText, filter === 'on-order' && styles.activeFilterButtonText]}>
                On Order
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery || filter !== 'all' 
              ? 'No products match your search or filter' 
              : 'No products added yet'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              if (currentShopId) {
                navigation.navigate('AddProduct', { shopId: currentShopId });
              } else {
                Alert.alert('No Shop Selected', 'Please select a shop first to add products.');
              }
            }}
          >
            <Text style={styles.emptyButtonText}>Add Your First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productsList: {
    padding: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    padding: 15,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 15,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  productDetailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  productDetailLabel: {
    fontSize: 14,
    color: '#666',
    width: 70,
  },
  productDetailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  onOrder: {
    color: '#FF9800',
  },
  outOfStock: {
    color: '#FF3B30',
  },
  productActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
});

export default ProductsScreen; 