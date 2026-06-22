import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { FONTS } from "../../constants/theme";
import { useAppTheme } from "../../constants/themeContext";

const PRIMARY   = "#6366F1";
const PRIMARY_D = "#4F46E5";

const WishlistScreen = ({ navigation }) => {
  const { user }          = useAuthStore();
  const { addToCart }     = useCartStore();
  const { isDarkMode }    = useAppTheme();
  const { colors }        = useTheme();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving]   = useState({});
  const [adding, setAdding]       = useState({});

  const fetchWishlist = useCallback(async () => {
    try {
      console.log("[Wishlist] user.id:", user.id);

      // Step 1: get wishlist rows
      const { data: wishlistRows, error: wErr } = await supabase
        .from("wishlist")
        .select("id, created_at, product_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("[Wishlist] rows:", JSON.stringify(wishlistRows), "err:", wErr?.message);

      if (wErr) throw wErr;
      if (!wishlistRows?.length) { setItems([]); return; }

      // Step 2: fetch products separately (no FK constraint on wishlist table)
      const productIds = wishlistRows.map(r => r.product_id);
      console.log("[Wishlist] productIds:", productIds);

      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, name, price, original_price, images, is_on_order, stock_quantity, shop_id, shop:shops(id, name)")
        .in("id", productIds);

      console.log("[Wishlist] products:", products?.length, "err:", pErr?.message);

      if (pErr) throw pErr;

      const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
      const merged = wishlistRows
        .map(r => ({ id: r.id, created_at: r.created_at, product: productMap[r.product_id] }))
        .filter(r => r.product);

      console.log("[Wishlist] final items:", merged.length);
      setItems(merged);
    } catch (e) {
      console.error("fetchWishlist:", e.message);
    }
  }, [user.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchWishlist();
      setLoading(false);
    })();
  }, [fetchWishlist]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  };

  const handleRemove = (wishlistId, productName) => {
    Alert.alert(
      "Remove from Wishlist",
      `Remove "${productName}" from your wishlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemoving(r => ({ ...r, [wishlistId]: true }));
            try {
              await supabase.from("wishlist").delete().eq("id", wishlistId);
              setItems(prev => prev.filter(i => i.id !== wishlistId));
            } catch (e) {
              Alert.alert("Error", "Failed to remove item");
            } finally {
              setRemoving(r => ({ ...r, [wishlistId]: false }));
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (item) => {
    const p = item.product;
    setAdding(a => ({ ...a, [item.id]: true }));
    try {
      await addToCart({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0] ?? null,
        shop_id: p.shop_id,
        shop_name: p.shop?.name,
        is_on_order: p.is_on_order,
      });
      Alert.alert("Added to Cart", `"${p.name}" has been added to your cart.`);
    } catch (e) {
      Alert.alert("Error", "Could not add to cart. Please try again.");
    } finally {
      setAdding(a => ({ ...a, [item.id]: false }));
    }
  };

  const getImage = (product) => product?.images?.[0] ?? null;

  const formatPrice = (n) => {
    if (n == null) return "0.00";
    return Number(n).toLocaleString("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const hasDiscount = (p) => p.original_price && p.original_price > p.price;
  const discountPct = (p) => Math.round((1 - p.price / p.original_price) * 100);

  const renderItem = ({ item }) => {
    const p       = item.product;
    const img     = getImage(p);
    const inStock = p.is_on_order || (p.stock_quantity || 0) > 0;

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: surface }]}
        onPress={() => navigation.navigate("ProductDetails", { product: p })}
        activeOpacity={0.8}
      >
        {/* Image */}
        <View style={s.imgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={s.img} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#4F46E5","#7C3AED"]} style={s.img}>
              <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          )}
          {hasDiscount(p) && (
            <View style={s.discountBadge}>
              <Text style={s.discountTxt}>-{discountPct(p)}%</Text>
            </View>
          )}
          {p.is_on_order && (
            <View style={s.onOrderBadge}>
              <Text style={s.onOrderTxt}>On Order</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={[s.shopName, { color: muted }]} numberOfLines={1}>
            {p.shop?.name || "Unknown Shop"}
          </Text>
          <Text style={[s.name, { color: colors.text }]} numberOfLines={2}>
            {p.name}
          </Text>
          <View style={s.priceRow}>
            <Text style={s.price}>N$ {formatPrice(p.price)}</Text>
            {hasDiscount(p) && (
              <Text style={[s.originalPrice, { color: muted }]}>
                N$ {formatPrice(p.original_price)}
              </Text>
            )}
          </View>
          <View style={s.statusRow}>
            <View style={[s.stockDot, { backgroundColor: inStock ? "#10B981" : "#EF4444" }]} />
            <Text style={[s.stockTxt, { color: inStock ? "#10B981" : "#EF4444" }]}>
              {inStock ? "In Stock" : "Out of Stock"}
            </Text>
          </View>
        </View>

        {/* Action buttons — stacked vertically on the right */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: border }, adding[item.id] && s.btnDisabled]}
            onPress={() => handleAddToCart(item)}
            disabled={!!adding[item.id]}
          >
            {adding[item.id]
              ? <ActivityIndicator size={15} color={PRIMARY} />
              : <Ionicons name="cart-outline" size={18} color={PRIMARY} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { borderColor: border }, removing[item.id] && s.btnDisabled]}
            onPress={() => handleRemove(item.id, p.name)}
            disabled={!!removing[item.id]}
          >
            {removing[item.id]
              ? <ActivityIndicator size={15} color="#EF4444" />
              : <Ionicons name="heart-dislike-outline" size={18} color="#EF4444" />
            }
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>

      {/* ── Gradient Hero ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81","#4F46E5","#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[s.heroBubble, { width: 160, height: 160, top: -50, right: -30 }]} />
        <View style={[s.heroBubble, { width: 80, height: 80, bottom: -20, left: 40 }]} />

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.heroCenter}>
          <View style={s.heroIcon}>
            <Ionicons name="heart" size={26} color="#fff" />
          </View>
          <Text style={s.heroTitle}>My Wishlist</Text>
          {!loading && (
            <Text style={s.heroSub}>
              {items.length === 0
                ? "No saved items yet"
                : `${items.length} saved item${items.length !== 1 ? "s" : ""}`}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <LinearGradient colors={["#EEF2FF","#C7D2FE"]} style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color={PRIMARY} />
          </LinearGradient>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Your wishlist is empty</Text>
          <Text style={[s.emptyTxt, { color: muted }]}>
            Browse products and tap the heart icon to save items you love.
          </Text>
          <TouchableOpacity
            style={s.browseBtn}
            onPress={() => navigation.navigate("Home")}
          >
            <LinearGradient colors={[PRIMARY, PRIMARY_D]} style={s.browseBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="search-outline" size={16} color="#fff" />
              <Text style={s.browseBtnTxt}>Browse Products</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero: { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroCenter: { alignItems: "center" },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  heroTitle: { fontSize: 24, fontFamily: FONTS.bold, color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 14, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.75)" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 12,
    gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },

  imgWrap: { width: 90, height: 90, borderRadius: 14, overflow: "hidden", position: "relative", flexShrink: 0 },
  img:     { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },

  discountBadge: { position: "absolute", top: 5, left: 5, backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  discountTxt:   { color: "#fff", fontSize: 10, fontFamily: FONTS.bold },
  onOrderBadge:  { position: "absolute", bottom: 5, left: 5, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  onOrderTxt:    { color: "#FCD34D", fontSize: 9, fontFamily: FONTS.bold },

  info: { flex: 1 },
  shopName: { fontSize: 11, fontFamily: FONTS.medium, marginBottom: 3 },
  name:     { fontSize: 14, fontFamily: FONTS.bold, lineHeight: 19, marginBottom: 6 },

  priceRow:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  price:        { fontSize: 16, fontFamily: FONTS.bold, color: PRIMARY },
  originalPrice:{ fontSize: 11, fontFamily: FONTS.regular, textDecorationLine: "line-through" },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  stockDot:  { width: 6, height: 6, borderRadius: 3 },
  stockTxt:  { fontSize: 11, fontFamily: FONTS.medium },

  actions:   { gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 16 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, textAlign: "center" },
  emptyTxt:   { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 20 },
  browseBtn:  { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  browseBtnInner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  browseBtnTxt: { fontSize: 15, fontFamily: FONTS.bold, color: "#fff" },
});

export default WishlistScreen;
