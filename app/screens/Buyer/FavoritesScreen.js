import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
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

const FavoritesScreen = ({ navigation }) => {
  const { colors }        = useTheme();
  const { isDarkMode }    = useAppTheme();
  const { user }          = useAuthStore();
  const { addToCart }     = useCartStore();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const [likedProducts, setLikedProducts] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [unliking, setUnliking]           = useState({});
  const [adding, setAdding]               = useState({});

  const fetchLikedProducts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("product_likes")
        .select(`
          product_id,
          products (
            id, name, price, original_price,
            images, in_stock, is_on_order,
            shop:shops(id, name)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setLikedProducts(data.filter(i => i.products).map(i => i.products));
    } catch (e) {
      console.error("fetchLikedProducts:", e.message);
      Alert.alert("Error", "Failed to load favorites");
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLikedProducts();
      setLoading(false);
    })();
  }, [fetchLikedProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLikedProducts();
    setRefreshing(false);
  };

  const handleUnlike = (product) => {
    Alert.alert(
      "Remove from Favorites",
      `Remove "${product.name}" from your favorites?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setUnliking(u => ({ ...u, [product.id]: true }));
            try {
              await supabase.from("product_likes").delete().eq("user_id", user.id).eq("product_id", product.id);
              setLikedProducts(prev => prev.filter(p => p.id !== product.id));
            } catch (e) {
              Alert.alert("Error", "Failed to remove from favorites");
            } finally {
              setUnliking(u => ({ ...u, [product.id]: false }));
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (product) => {
    setAdding(a => ({ ...a, [product.id]: true }));
    try {
      addToCart(product);
      Alert.alert("Added to Cart", `"${product.name}" has been added to your cart.`);
    } catch (e) {
      Alert.alert("Error", "Failed to add item to cart");
    } finally {
      setAdding(a => ({ ...a, [product.id]: false }));
    }
  };

  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isAvailable = (p) => p.in_stock || p.is_on_order;

  const renderItem = ({ item: product }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: surface }]}
      onPress={() => navigation.navigate("ProductDetails", { product })}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={s.imgWrap}>
        {product.images?.[0] ? (
          <Image source={{ uri: product.images[0] }} style={s.img} resizeMode="cover" />
        ) : (
          <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={s.imgPlaceholder}>
            <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={[s.shopName, { color: muted }]} numberOfLines={1}>
          @{product.shop?.name || "Shop"}
        </Text>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={s.price}>N$ {formatPrice(product.price)}</Text>
        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: isAvailable(product) ? "#10B981" : "#EF4444" }]} />
          <Text style={[s.statusTxt, { color: isAvailable(product) ? "#10B981" : "#EF4444" }]}>
            {product.in_stock ? "Available" : product.is_on_order ? "On Order" : "Out of Stock"}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: border }]}
          onPress={() => handleUnlike(product)}
          disabled={!!unliking[product.id]}
        >
          {unliking[product.id]
            ? <ActivityIndicator size={16} color="#EF4444" />
            : <Ionicons name="heart" size={18} color="#EF4444" />
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, { borderColor: border }, adding[product.id] && s.btnDisabled]}
          onPress={() => handleAddToCart(product)}
          disabled={!!adding[product.id]}
        >
          {adding[product.id]
            ? <ActivityIndicator size={16} color={PRIMARY} />
            : <Ionicons name="cart-outline" size={18} color={PRIMARY} />
          }
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>

      {/* ── Gradient Hero ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
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
          <LinearGradient colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]} style={s.heroIcon}>
            <Ionicons name="heart" size={26} color="#fff" />
          </LinearGradient>
          <Text style={s.heroTitle}>Favorites</Text>
          {!loading && (
            <Text style={s.heroSub}>
              {likedProducts.length === 0
                ? "No liked products yet"
                : `${likedProducts.length} liked product${likedProducts.length !== 1 ? "s" : ""}`}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* ── States ────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />

      ) : !user ? (
        <View style={s.empty}>
          <LinearGradient colors={["#EEF2FF", "#C7D2FE"]} style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={44} color={PRIMARY} />
          </LinearGradient>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Login to See Favorites</Text>
          <Text style={[s.emptyTxt, { color: muted }]}>
            Sign in to save and view your favorite products across all your devices.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate("Auth", { screen: "Login" })}>
            <LinearGradient colors={[PRIMARY, PRIMARY_D]} style={s.emptyBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="log-in-outline" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      ) : likedProducts.length === 0 ? (
        <View style={s.empty}>
          <LinearGradient colors={["#FEF2F2", "#FECACA"]} style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={44} color="#EF4444" />
          </LinearGradient>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Favorites Yet</Text>
          <Text style={[s.emptyTxt, { color: muted }]}>
            Tap the heart on any product to save it here for later.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate("Home")}>
            <LinearGradient colors={[PRIMARY, PRIMARY_D]} style={s.emptyBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="search-outline" size={16} color="#fff" />
              <Text style={s.emptyBtnTxt}>Browse Products</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      ) : (
        <FlatList
          data={likedProducts}
          keyExtractor={p => p.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
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
  heroIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 10 },
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

  imgWrap: { width: 86, height: 86, borderRadius: 14, overflow: "hidden", flexShrink: 0 },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },

  info: { flex: 1 },
  shopName: { fontSize: 12, fontFamily: FONTS.medium, marginBottom: 3 },
  name: { fontSize: 15, fontFamily: FONTS.bold, lineHeight: 20, marginBottom: 6 },
  price: { fontSize: 16, fontFamily: FONTS.bold, color: PRIMARY, marginBottom: 5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 12, fontFamily: FONTS.medium },

  actions: { gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 16 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, textAlign: "center" },
  emptyTxt: { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 20 },
  emptyBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  emptyBtnInner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnTxt: { fontSize: 15, fontFamily: FONTS.bold, color: "#fff" },
});

export default FavoritesScreen;
