import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import ProductCard from "../../components/ProductCard";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import Slider from "@react-native-community/slider";
import { FONTS } from "../../constants/theme";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const SORT_OPTIONS = [
  { label: "Newest",            value: "newest",      icon: "time-outline" },
  { label: "Price: Low → High", value: "price_low",   icon: "trending-up-outline" },
  { label: "Price: High → Low", value: "price_high",  icon: "trending-down-outline" },
  { label: "Most Popular",      value: "popularity",  icon: "flame-outline" },
];

const CATEGORY_ICONS = {
  electronics: "hardware-chip-outline",
  clothing:    "shirt-outline",
  food:        "restaurant-outline",
  books:       "book-outline",
  home:        "home-outline",
  beauty:      "sparkles-outline",
  sports:      "fitness-outline",
  toys:        "game-controller-outline",
  beverage:    "cafe-outline",
  blanket:     "bed-outline",
  meat:        "fast-food-outline",
};
const getCategoryIcon = (cat) => CATEGORY_ICONS[cat?.toLowerCase()] || "grid-outline";

const formatPrice = (price) => {
  if (!price) return "0.00";
  return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
};

const AllProductsScreen = ({ navigation }) => {
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();
  const { user }       = useAuthStore();
  const { addToCart }  = useCartStore();
  const insets         = useSafeAreaInsets();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";
  const inputBg = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  const [products,           setProducts]           = useState([]);
  const [categories,         setCategories]         = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [searchQuery,        setSearchQuery]        = useState("");
  const [isSearchFocused,    setIsSearchFocused]    = useState(false);
  const [likedProducts,      setLikedProducts]      = useState({});
  const [displayLimit,       setDisplayLimit]       = useState(12);
  const [showFilterModal,    setShowFilterModal]    = useState(false);

  // Filter & sort state
  const [selectedSort,       setSelectedSort]       = useState("newest");
  const [priceRange,         setPriceRange]         = useState([0, 100000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [inStockOnly,        setInStockOnly]        = useState(false);
  const [onSaleOnly,         setOnSaleOnly]         = useState(false);

  // Active filter count badge
  const activeFilterCount =
    (selectedSort !== "newest" ? 1 : 0) +
    (priceRange[1] !== 100000 ? 1 : 0) +
    selectedCategories.length +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (user) fetchLikedProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*, shop:shops(id,name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProducts((data || []).map((p) => ({
        ...p,
        in_stock: p.is_on_order !== undefined ? !p.is_on_order : p.stock_quantity > 0,
      })));
    } catch (err) {
      console.error("fetchProducts:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from("products").select("category").not("category", "is", null);
      const unique = [...new Set((data || []).map((d) => d.category).filter(Boolean))].sort();
      setCategories(unique);
    } catch (err) {
      console.error("fetchCategories:", err.message);
    }
  };

  const fetchLikedProducts = async () => {
    try {
      const { data } = await supabase.from("product_likes").select("product_id").eq("user_id", user.id);
      const map = {};
      (data || []).forEach((l) => { map[l.product_id] = true; });
      setLikedProducts(map);
    } catch (err) {
      console.error("fetchLikedProducts:", err.message);
    }
  };

  const handleLikePress = async (productId) => {
    if (!user) { Alert.alert("Login Required", "Sign in to like products"); return; }
    const isLiked = likedProducts[productId];
    if (isLiked) {
      await supabase.from("product_likes").delete().eq("user_id", user.id).eq("product_id", productId);
      setLikedProducts((prev) => { const u = { ...prev }; delete u[productId]; return u; });
    } else {
      await supabase.from("product_likes").insert([{ user_id: user.id, product_id: productId }]);
      setLikedProducts((prev) => ({ ...prev, [productId]: true }));
    }
  };

  const handleAddToCart = (product) => {
    if (!user) { Alert.alert("Login Required", "Sign in to add to cart"); return; }
    addToCart(product);
    Alert.alert("Added", "Item added to your cart!");
  };

  const getFilteredProducts = useCallback(() => {
    let filtered = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.shop?.name?.toLowerCase().includes(q)
      );
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p) => selectedCategories.includes(p.category));
    }
    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (inStockOnly) filtered = filtered.filter((p) => p.in_stock);
    if (onSaleOnly)  filtered = filtered.filter((p) => p.is_on_sale);
    switch (selectedSort) {
      case "price_low":  filtered.sort((a, b) => a.price - b.price); break;
      case "price_high": filtered.sort((a, b) => b.price - a.price); break;
      case "popularity": filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0)); break;
      default:           filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return filtered;
  }, [products, searchQuery, selectedCategories, priceRange, inStockOnly, onSaleOnly, selectedSort]);

  const filteredProducts = getFilteredProducts();
  const displayedProducts = filteredProducts.slice(0, displayLimit);

  const resetFilters = () => {
    setSelectedSort("newest");
    setPriceRange([0, 100000]);
    setSelectedCategories([]);
    setInStockOnly(false);
    setOnSaleOnly(false);
  };

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // ── List header ─────────────────────────────────────────────────────────
  const ListHeader = (
    <View>
      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
      >
        {[{ label: "All", value: null }, ...categories.map((c) => ({ label: c, value: c }))].map(({ label, value }) => {
          const active = value === null ? selectedCategories.length === 0 : selectedCategories.includes(value);
          return (
            <TouchableOpacity
              key={label}
              style={[s.chip, { backgroundColor: active ? INDIGO : surface, borderColor: active ? INDIGO : border }]}
              onPress={() => value === null ? setSelectedCategories([]) : toggleCategory(value)}
              activeOpacity={0.75}
            >
              <View style={[s.chipIcon, { backgroundColor: active ? "rgba(255,255,255,0.2)" : isDarkMode ? "#2C2C3E" : "#EEF2FF" }]}>
                <Ionicons name={getCategoryIcon(value)} size={14} color={active ? "#fff" : INDIGO} />
              </View>
              <Text style={[s.chipTxt, { color: active ? "#fff" : colors.text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results count */}
      <View style={s.resultsRow}>
        <View style={[s.resultsPill, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
          <Ionicons name="grid-outline" size={13} color={INDIGO} />
          <Text style={[s.resultsTxt, { color: INDIGO }]}>{filteredProducts.length} products</Text>
        </View>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={resetFilters} style={[s.clearBtn, { borderColor: border }]}>
            <Ionicons name="close-circle-outline" size={14} color={muted} />
            <Text style={[s.clearTxt, { color: muted }]}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ── List footer ──────────────────────────────────────────────────────────
  const ListFooter = filteredProducts.length > displayLimit ? (
    <TouchableOpacity
      style={s.loadMoreTouch}
      onPress={() => setDisplayLimit((l) => l + 12)}
      activeOpacity={0.85}
    >
      <LinearGradient colors={[INDIGO, VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.loadMoreBtn}>
        <Ionicons name="chevron-down" size={18} color="#fff" />
        <Text style={s.loadMoreTxt}>Load More Products</Text>
      </LinearGradient>
    </TouchableOpacity>
  ) : (
    <View style={{ height: 32 }} />
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  const EmptyList = (
    <View style={s.emptyBox}>
      <LinearGradient colors={[`${INDIGO}22`, `${VIOLET}11`]} style={s.emptyCircle}>
        <Ionicons name="search-outline" size={38} color={INDIGO} />
      </LinearGradient>
      <Text style={[s.emptyTitle, { color: colors.text }]}>No products found</Text>
      <Text style={[s.emptySub, { color: muted }]}>Try adjusting your search or filters</Text>
    </View>
  );

  return (
    <View style={[s.flex, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Gradient header ─────────────────────────────────────────── */}
      <LinearGradient colors={["#312E81", "#4F46E5", "#7C3AED"]} style={[s.header, { paddingTop: insets.top + 12 }]}>
        {/* Decorative bubbles */}
        <View style={[s.bubble, { width: 130, height: 130, top: -40, right: -30, opacity: 0.12 }]} />
        <View style={[s.bubble, { width: 80, height: 80, top: 20, right: 60, opacity: 0.08 }]} />

        <View style={s.headerRow}>
          <TouchableOpacity style={s.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>All Products</Text>
          </View>

          <TouchableOpacity
            style={[s.navBtn, activeFilterCount > 0 && { backgroundColor: "rgba(255,255,255,0.3)" }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="options-outline" size={20} color="#fff" />
            {activeFilterCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={[s.searchBox, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)", borderColor: isSearchFocused ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }]}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.8)" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search products, shops, categories…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Products list ────────────────────────────────────────────── */}
      {loading && !refreshing ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={INDIGO} />
          <Text style={[s.loadingTxt, { color: muted }]}>Loading products…</Text>
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.gridRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={EmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchProducts(); if (user) fetchLikedProducts(); }}
              tintColor={INDIGO}
              colors={[INDIGO]}
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate("ProductDetails", { product: item })}
              onLikePress={handleLikePress}
              isLiked={likedProducts[item.id]}
              onAddToCart={handleAddToCart}
              style={s.card}
            />
          )}
        />
      )}

      {/* ── Filter Modal ─────────────────────────────────────────────── */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <TouchableWithoutFeedback>
            <View style={[s.modalSheet, { backgroundColor: surface }]}>
              <View style={[s.modalHandle, { backgroundColor: border }]} />

              <View style={s.modalHeaderRow}>
                <Text style={[s.modalTitle, { color: colors.text }]}>Filter & Sort</Text>
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={[s.modalReset, { color: muted }]}>Reset all</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={s.modalBody}>

                {/* Sort */}
                <Text style={[s.sectionLabel, { color: colors.text }]}>Sort By</Text>
                <View style={s.sortGrid}>
                  {SORT_OPTIONS.map((opt) => {
                    const active = selectedSort === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.sortChip, { backgroundColor: active ? INDIGO : isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: active ? INDIGO : border }]}
                        onPress={() => setSelectedSort(opt.value)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={opt.icon} size={14} color={active ? "#fff" : muted} />
                        <Text style={[s.sortChipTxt, { color: active ? "#fff" : colors.text }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Price range */}
                <Text style={[s.sectionLabel, { color: colors.text }]}>Max Price</Text>
                <View style={[s.priceBox, { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: border }]}>
                  <View style={s.priceRow}>
                    <Text style={[s.priceLabel, { color: muted }]}>N$ 0</Text>
                    <Text style={[s.priceValue, { color: INDIGO }]}>N$ {formatPrice(priceRange[1])}</Text>
                  </View>
                  <Slider
                    style={{ width: "100%", height: 36 }}
                    minimumValue={0}
                    maximumValue={100000}
                    step={500}
                    value={priceRange[1]}
                    onValueChange={(v) => setPriceRange([0, v])}
                    minimumTrackTintColor={INDIGO}
                    maximumTrackTintColor={isDarkMode ? "#3C3C4E" : "#E5E7EB"}
                    thumbTintColor={INDIGO}
                  />
                </View>

                {/* Categories */}
                <Text style={[s.sectionLabel, { color: colors.text }]}>Categories</Text>
                <View style={s.catGrid}>
                  {categories.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[s.catChip, { backgroundColor: active ? INDIGO : isDarkMode ? "#2C2C3E" : "#F3F4F6", borderColor: active ? INDIGO : border }]}
                        onPress={() => toggleCategory(cat)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={getCategoryIcon(cat)} size={14} color={active ? "#fff" : muted} />
                        <Text style={[s.catChipTxt, { color: active ? "#fff" : colors.text }]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Toggles */}
                <Text style={[s.sectionLabel, { color: colors.text }]}>Availability</Text>
                {[
                  { label: "In Stock Only", value: inStockOnly, setter: setInStockOnly },
                  { label: "On Sale Only",  value: onSaleOnly,  setter: setOnSaleOnly },
                ].map(({ label, value, setter }) => (
                  <TouchableOpacity key={label} style={s.toggleRow} onPress={() => setter(!value)} activeOpacity={0.7}>
                    <Text style={[s.toggleLabel, { color: colors.text }]}>{label}</Text>
                    <View style={[s.toggleTrack, { backgroundColor: value ? INDIGO : isDarkMode ? "#3C3C4E" : "#E5E7EB" }]}>
                      <View style={[s.toggleKnob, { transform: [{ translateX: value ? 20 : 2 }] }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Apply */}
              <View style={[s.modalFooter, { borderTopColor: border }]}>
                <TouchableOpacity
                  style={[s.cancelBtn, { borderColor: border }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[s.cancelTxt, { color: muted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.applyTouch}
                  onPress={() => setShowFilterModal(false)}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[INDIGO, VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.applyBtn}>
                    <Text style={s.applyTxt}>Apply Filters</Text>
                    {activeFilterCount > 0 && (
                      <View style={s.applyBadge}>
                        <Text style={s.applyBadgeTxt}>{activeFilterCount}</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header:      { paddingHorizontal: 20, paddingBottom: 20, overflow: "hidden" },
  bubble:      { position: "absolute", borderRadius: 100, backgroundColor: "#fff" },
  headerRow:   { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerCenter:{ flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold, color: "#fff", letterSpacing: -0.3 },
  navBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  filterBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  filterBadgeTxt: { fontSize: 9, fontFamily: FONTS.bold, color: "#fff" },

  searchBox:   { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: "#fff" },

  // List
  grid:        { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  gridRow:     { justifyContent: "space-between", marginBottom: 12 },
  card:        { width: CARD_WIDTH },

  // Category chips
  chipsRow:    { paddingHorizontal: 0, paddingTop: 16, paddingBottom: 8, gap: 8 },
  chip:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  chipIcon:    { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  chipTxt:     { fontSize: 13, fontFamily: FONTS.medium },

  // Results row
  resultsRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  resultsPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  resultsTxt:  { fontSize: 13, fontFamily: FONTS.semiBold },
  clearBtn:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  clearTxt:    { fontSize: 12, fontFamily: FONTS.medium },

  // Load more
  loadMoreTouch: { marginHorizontal: 0, borderRadius: 14, overflow: "hidden", marginTop: 4, marginBottom: 16 },
  loadMoreBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  loadMoreTxt:   { fontSize: 14, fontFamily: FONTS.bold, color: "#fff" },

  // Empty
  emptyBox:    { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyCircle: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 17, fontFamily: FONTS.bold },
  emptySub:    { fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },

  // Loading
  loadingBox:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt:  { fontSize: 14, fontFamily: FONTS.regular },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  modalTitle:   { fontSize: 20, fontFamily: FONTS.bold },
  modalReset:   { fontSize: 14, fontFamily: FONTS.medium },
  modalBody:    { paddingHorizontal: 20, paddingBottom: 20 },

  sectionLabel: { fontSize: 15, fontFamily: FONTS.bold, marginTop: 16, marginBottom: 10 },

  sortGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortChip:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  sortChipTxt: { fontSize: 13, fontFamily: FONTS.medium },

  priceBox:    { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, marginBottom: 4 },
  priceRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  priceLabel:  { fontSize: 13, fontFamily: FONTS.regular },
  priceValue:  { fontSize: 15, fontFamily: FONTS.bold },

  catGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  catChip:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  catChipTxt:  { fontSize: 13, fontFamily: FONTS.medium },

  toggleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  toggleLabel: { fontSize: 15, fontFamily: FONTS.medium },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleKnob:  { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },

  modalFooter: { flexDirection: "row", gap: 10, padding: 20, borderTopWidth: 1 },
  cancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  cancelTxt:   { fontSize: 15, fontFamily: FONTS.semiBold },
  applyTouch:  { flex: 2, borderRadius: 14, overflow: "hidden" },
  applyBtn:    { flexDirection: "row", paddingVertical: 14, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14 },
  applyTxt:    { fontSize: 15, fontFamily: FONTS.bold, color: "#fff" },
  applyBadge:  { backgroundColor: "rgba(255,255,255,0.3)", minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  applyBadgeTxt: { fontSize: 11, fontFamily: FONTS.bold, color: "#fff" },
});

export default AllProductsScreen;
