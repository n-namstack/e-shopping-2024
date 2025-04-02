import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/ui/EmptyState';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

// Sort options
const SortOptions = {
  NEWEST: { label: 'Newest', value: 'newest' },
  PRICE_LOW: { label: 'Price: Low to High', value: 'price_low' },
  PRICE_HIGH: { label: 'Price: High to Low', value: 'price_high' },
  POPULARITY: { label: 'Popularity', value: 'popularity' },
};

// Filter options
const FilterOptions = {
  ALL: { label: 'All Products', value: 'all' },
  IN_STOCK: { label: 'In Stock', value: 'in_stock' },
  ON_SALE: { label: 'On Sale', value: 'on_sale' },
  ON_ORDER: { label: 'On Order', value: 'on_order' },
};

const BrowseProductsScreen = ({ navigation, route }) => {
  // Get shop filter from route params if available
  const { shopId, shopName } = route.params || {};
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering and sorting states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState(FilterOptions.ALL.value);
  const [selectedSort, setSelectedSort] = useState(SortOptions.NEWEST.value);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  
  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [shopId]); // Refetch when shopId changes
  
  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          shop:shops(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      // Filter by shop if shopId is provided
      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch product categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      if (data) {
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(item => item.category))]
          .filter(Boolean)
          .sort();
          
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };
  
  // Navigate to product details
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetails', { product });
  };
  
  // Navigate to shop details
  const handleShopPress = (shopId) => {
    navigation.navigate('ShopDetails', { shopId });
  };
  
  // Filter products based on selected options
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description?.toLowerCase().includes(query) ||
        product.shop?.name.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Apply filter option
    if (selectedFilter === FilterOptions.IN_STOCK.value) {
      filtered = filtered.filter(product => product.in_stock);
    } else if (selectedFilter === FilterOptions.ON_SALE.value) {
      filtered = filtered.filter(product => product.is_on_sale);
    } else if (selectedFilter === FilterOptions.ON_ORDER.value) {
      filtered = filtered.filter(product => !product.in_stock);
    }
    
    // Apply sorting
    if (selectedSort === SortOptions.PRICE_LOW.value) {
      filtered.sort((a, b) => a.price - b.price);
    } else if (selectedSort === SortOptions.PRICE_HIGH.value) {
      filtered.sort((a, b) => b.price - a.price);
    } else if (selectedSort === SortOptions.POPULARITY.value) {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // Default - newest first (already sorted from the backend)
    }
    
    return filtered;
  };
  
  const filteredProducts = getFilteredProducts();
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        {shopId && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={shopId ? "Search in this shop..." : "Search products, shops..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Filter and Sort options */}
      <View style={styles.filterBar}>
        {/* Categories scrollable row */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === 'all' && styles.selectedCategoryChip
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === 'all' && styles.selectedCategoryText
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.selectedCategoryChip
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Sort and filter buttons */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              setShowSortOptions(!showSortOptions);
              setShowFilterOptions(false);
            }}
          >
            <Ionicons name="options-outline" size={18} color={COLORS.primary} />
            <Text style={styles.optionText}>Sort</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              setShowFilterOptions(!showFilterOptions);
              setShowSortOptions(false);
            }}
          >
            <Ionicons name="filter-outline" size={18} color={COLORS.primary} />
            <Text style={styles.optionText}>Filter</Text>
          </TouchableOpacity>
        </View>
        
        {/* Sort options dropdown */}
        {showSortOptions && (
          <View style={styles.optionsDropdown}>
            {Object.values(SortOptions).map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedSort(option.value);
                  setShowSortOptions(false);
                }}
              >
                {selectedSort === option.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent} style={styles.checkIcon} />
                )}
                <Text
                  style={[
                    styles.dropdownText,
                    selectedSort === option.value && styles.selectedDropdownText
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Filter options dropdown */}
        {showFilterOptions && (
          <View style={styles.optionsDropdown}>
            {Object.values(FilterOptions).map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedFilter(option.value);
                  setShowFilterOptions(false);
                }}
              >
                {selectedFilter === option.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent} style={styles.checkIcon} />
                )}
                <Text
                  style={[
                    styles.dropdownText,
                    selectedFilter === option.value && styles.selectedDropdownText
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      {/* Products grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon="basket-outline"
          title="No Products Found"
          message={searchQuery ? `No results found for "${searchQuery}"` : "No products found with the selected filters."}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('all');
            setSelectedFilter(FilterOptions.ALL.value);
            setSelectedSort(SortOptions.NEWEST.value);
          }}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <ProductCard 
              product={item} 
              onPress={handleProductPress}
              style={styles.productCard}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  filterBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
    ...SHADOWS.small,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  selectedCategoryChip: {
    backgroundColor: 'rgba(65, 105, 225, 0.1)',
    borderColor: COLORS.accent,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  selectedCategoryText: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  optionText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  optionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
    ...SHADOWS.medium,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkIcon: {
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  selectedDropdownText: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  productsList: {
    padding: 8,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCard: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default BrowseProductsScreen; 