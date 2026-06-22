import React, { useState, useEffect, useCallback } from "react";
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
  ScrollView,
} from "react-native";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";

const FILTERS = [
  { key: "all",          label: "All",          icon: "inventory" },
  { key: "in-stock",     label: "In Stock",     icon: "check-circle" },
  { key: "out-of-stock", label: "Out of Stock", icon: "highlight-off" },
  { key: "on-order",     label: "On Order",     icon: "schedule" },
];

const getStockConfig = (product) => {
  if (product.is_on_order)         return { color: "#F97316", bg: "rgba(249,115,22,0.12)",  icon: "schedule",      label: "On Order" };
  if (product.stock_quantity <= 0) return { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "highlight-off", label: "Out of Stock" };
  if (product.stock_quantity < 5)  return { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "warning",       label: `Low Stock (${product.stock_quantity})` };
  return                                  { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   icon: "check-circle",  label: `In Stock (${product.stock_quantity})` };
};

const ProductsScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const shopId   = route.params?.shopId;
  const fromShop = route.params?.fromShop;

  const [products, setProducts]               = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery]         = useState("");
  const [searchFocused, setSearchFocused]     = useState(false);
  const [isLoading, setIsLoading]             = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [filter, setFilter]                   = useState("all");
  const [currentShopId, setCurrentShopId]     = useState(shopId || null);
  const { colors }    = useTheme();
  const { isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_700Bold, Jost_500Medium, Jost_600SemiBold });
  const [stats, setStats] = useState({ total: 0, inStock: 0, outOfStock: 0, onOrder: 0 });

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (fromShop) navigation.setParams({ shopId: null, fromShop: false });
    });
    return unsubscribe;
  }, [navigation, fromShop]);

  useEffect(() => { loadProducts(); }, [shopId]);

  useFocusEffect(useCallback(() => { loadProducts(); }, [shopId]));

  useEffect(() => {
    filterProducts();
    calculateStats();
  }, [searchQuery, products, filter]);

  const calculateStats = () => {
    setStats({
      total:      products.length,
      inStock:    products.filter((p) => p.stock_quantity > 0 && !p.is_on_order).length,
      outOfStock: products.filter((p) => p.stock_quantity <= 0 && !p.is_on_order).length,
      onOrder:    products.filter((p) => p.is_on_order).length,
    });
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      let shopIds = [];

      if (shopId) {
        shopIds = [shopId];
        setCurrentShopId(shopId);
      } else {
        const { data: shops, error: shopsError } = await supabase
          .from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
        if (shopsError) throw shopsError;

        if (!shops || shops.length === 0) {
          setProducts([]);
          setCurrentShopId(null);
          Alert.alert("No Shops Found", "Please create a shop first before adding products.");
          return;
        }
        shopIds = shops.map((s) => s.id);
        setCurrentShopId(shops[0].id);
      }

      if (shopIds.length === 0) { setProducts([]); return; }

      const { data, error } = await supabase
        .from("products")
        .select(`*, shop:shop_id(id, name)`)
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error.message);
      Alert.alert("Error", `Failed to load products: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let results = [...products];
    if (searchQuery) {
      results = results.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filter === "in-stock")     results = results.filter((p) => p.stock_quantity > 0 && !p.is_on_order);
    if (filter === "out-of-stock") results = results.filter((p) => p.stock_quantity <= 0 && !p.is_on_order);
    if (filter === "on-order")     results = results.filter((p) => p.is_on_order);
    setFilteredProducts(results);
  };

  const onRefresh = () => { setRefreshing(true); loadProducts(); };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert("Delete Product", `Are you sure you want to delete "${productName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("products").delete().eq("id", productId);
            if (error) throw error;
            setProducts(products.filter((p) => p.id !== productId));
            Alert.alert("Success", "Product deleted successfully");
          } catch (error) {
            console.error("Error deleting product:", error.message);
            Alert.alert("Error", "Failed to delete product");
          }
        },
      },
    ], { cancelable: true });
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "N$0.00";
    return "N$" + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  const handleAddProduct = () => {
    if (currentShopId) {
      if (fromShop) {
        navigation.navigate("AddProduct", { shopId: currentShopId });
      } else if (products.length > 0 && new Set(products.map((p) => p.shop_id)).size > 1) {
        const uniqueShops = [
          ...new Map(products.map((p) => [p.shop_id, { id: p.shop_id, name: p.shop?.name || "Unknown Shop" }])).values(),
        ];
        Alert.alert("Select Shop", "Which shop would you like to add a product to?",
          uniqueShops.map((s) => ({ text: s.name, onPress: () => navigation.navigate("AddProduct", { shopId: s.id }) }))
          .concat([{ text: "Cancel", style: "cancel" }])
        );
      } else {
        navigation.navigate("AddProduct", { shopId: currentShopId });
      }
    } else {
      Alert.alert("No Shop Selected", "Please create a shop first to add products.");
    }
  };

  const filterCount = (key) => {
    if (key === "all")          return stats.total;
    if (key === "in-stock")     return stats.inStock;
    if (key === "out-of-stock") return stats.outOfStock;
    if (key === "on-order")     return stats.onOrder;
    return 0;
  };

  if (!fontsLoaded) return null;

  const renderProductItem = ({ item }) => {
    const stock = getStockConfig(item);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderLeftColor: stock.color }]}>
        <View style={styles.cardBody}>
          <View style={[styles.imageBox, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="image-off-outline" size={28} color="#9CA3AF" />
            )}
          </View>

          <View style={styles.cardInfo}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <View style={styles.metaRow}>
              <MaterialIcons name="store"    size={13} color="#9CA3AF" />
              <Text style={styles.metaText} numberOfLines={1}>{item.shop?.name || "Unknown Shop"}</Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialIcons name="category" size={13} color="#9CA3AF" />
              <Text style={styles.metaText}>{item.category || "Uncategorized"}</Text>
            </View>
            <View style={[styles.stockBadge, { backgroundColor: stock.bg }]}>
              <MaterialIcons name={stock.icon} size={12} color={stock.color} />
              <Text style={[styles.stockText, { color: stock.color }]}>{stock.label}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderRightColor: colors.border, borderRightWidth: 1 }]}
            onPress={() => navigation.navigate("EditProduct", { productId: item.id })}
          >
            <Ionicons name="create-outline" size={16} color="#6366F1" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDeleteProduct(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={["#312E81", "#4338CA", "#6366F1"]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={styles.header}
      >
        <View style={[styles.blob, styles.blobTR]} />
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          {fromShop ? (
            <TouchableOpacity style={styles.backBtnCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <Text style={styles.headerTitle}>{fromShop ? "Shop Products" : "Products"}</Text>
          <TouchableOpacity style={styles.addBtnCircle} onPress={handleAddProduct}>
            <Ionicons name="add" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── SEARCH + FILTERS ── */}
      <View style={[styles.controls, { backgroundColor: colors.background }]}>
        <View style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderColor: searchFocused ? "#6366F1" : colors.border,
            borderWidth: searchFocused ? 2 : 1.5,
          },
        ]}>
          <View style={[styles.searchIconBox, searchFocused && styles.searchIconActive]}>
            <Ionicons name="search" size={16} color={searchFocused ? "#6366F1" : "#9CA3AF"} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active ? styles.chipActive : { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setFilter(f.key)}
              >
                <MaterialIcons name={f.icon} size={13} color={active ? "#fff" : "#9CA3AF"} />
                <Text style={[styles.chipText, { color: active ? "#fff" : colors.text }]}>{f.label}</Text>
                <View style={[styles.chipBadge, {
                  backgroundColor: active
                    ? "rgba(255,255,255,0.25)"
                    : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                }]}>
                  <Text style={[styles.chipBadgeText, { color: active ? "#fff" : colors.text }]}>{filterCount(f.key)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT ── */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="package-variant" size={48} color="#6366F1" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Products Found</Text>
          <Text style={styles.emptySub}>
            {searchQuery || filter !== "all"
              ? "No products match your search or filter"
              : "No products added yet"}
          </Text>
          <TouchableOpacity onPress={handleAddProduct} activeOpacity={0.88} style={styles.emptyBtnShadow}>
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtn}>
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnText}>Add Your First Product</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} tintColor="#6366F1" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingBottom: 18 },
  blob:   { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  blobTR: { width: 180, height: 180, top: -60, right: -50 },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 6,
  },
  backBtnCircle: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },
  addBtnCircle: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
  },

  // Controls
  controls:    { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 13, paddingHorizontal: 12, height: 48, marginBottom: 12,
  },
  searchIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.08)",
    justifyContent: "center", alignItems: "center", marginRight: 8,
  },
  searchIconActive: { backgroundColor: "rgba(99,102,241,0.15)" },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  // Filter chips
  chipsRow: { paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  chipActive:     { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  chipText:       { fontSize: 13, fontFamily: FONTS.medium },
  chipBadge:      { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
  chipBadgeText:  { fontSize: 11, fontFamily: FONTS.semiBold },

  // Loading
  loadingBox:  { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, fontFamily: FONTS.regular, color: "#9CA3AF" },

  // Empty
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  emptyTitle:    { fontSize: 20, fontFamily: FONTS.bold,    marginBottom: 8, textAlign: "center" },
  emptySub:      { fontSize: 14, fontFamily: FONTS.regular, color: "#9CA3AF", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  emptyBtnShadow: {
    borderRadius: 14,
    shadowColor: "#6366F1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  emptyBtn:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: FONTS.semiBold },

  // List
  list: { padding: 16, paddingBottom: 32 },

  // Product card
  card: {
    borderRadius: 16, marginBottom: 14, borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    overflow: "hidden",
  },
  cardBody:     { flexDirection: "row", padding: 14, alignItems: "flex-start" },
  imageBox: {
    width: 76, height: 76, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    marginRight: 14, overflow: "hidden", flexShrink: 0,
  },
  productImage: { width: "100%", height: "100%" },
  cardInfo:     { flex: 1 },
  productName:  { fontSize: 15, fontFamily: FONTS.bold,    marginBottom: 3 },
  productPrice: { fontSize: 15, fontFamily: FONTS.bold,    color: "#6366F1", marginBottom: 6 },
  metaRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  metaText:     { fontSize: 12, fontFamily: FONTS.regular,  color: "#9CA3AF", flex: 1 },
  stockBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4,
  },
  stockText: { fontSize: 11, fontFamily: FONTS.semiBold },

  // Card actions
  cardActions: { flexDirection: "row", borderTopWidth: 1 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 6,
  },
  editText:   { fontSize: 14, fontFamily: FONTS.semiBold, color: "#6366F1" },
  deleteText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#EF4444" },
});

export default ProductsScreen;
