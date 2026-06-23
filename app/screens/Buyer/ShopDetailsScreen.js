import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Share,
  TouchableWithoutFeedback,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import ProductCard from "../../components/ProductCard";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { FONTS } from "../../constants/theme";

const INDIGO  = "#6366F1";
const VIOLET  = "#7C3AED";
const { width } = Dimensions.get("window");
const HERO_HEIGHT = 230;

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

// ── ReadMoreText defined OUTSIDE main component to avoid remounting ──────────
const ReadMoreText = ({ text = "", limit = 100, textColor }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > limit;
  return (
    <View>
      <Text style={[s.heroDesc, textColor && { color: textColor }]}>
        {isLong && !expanded ? text.slice(0, limit) + "…" : text}
      </Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
          <Text style={s.readMoreLink}>{expanded ? "Show less" : "Read more"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const renderStars = (rating, size = 14) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return Array.from({ length: 5 }, (_, i) => {
    const n = i + 1;
    return (
      <Ionicons
        key={n}
        name={n <= full ? "star" : n === full + 1 && half ? "star-half" : "star-outline"}
        size={size}
        color={n <= full || (n === full + 1 && half) ? "#FFD700" : "#CBD5E1"}
      />
    );
  });
};

// ── Main component ─────────────────────────────────────────────────────────
const ShopDetailsScreen = ({ route, navigation }) => {
  const { shopId }         = route.params || {};
  const { user }           = useAuthStore();
  const { addToCart }      = useCartStore();
  const { colors }         = useTheme();
  const { isDarkMode }     = useAppTheme();
  const insets             = useSafeAreaInsets();

  const surface  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg       = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted    = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border   = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const [shop,              setShop]              = useState(null);
  const [products,          setProducts]          = useState([]);
  const [categories,        setCategories]        = useState([]);
  const [selectedCategory,  setSelectedCategory]  = useState("all");
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [isFollowing,       setIsFollowing]       = useState(false);
  const [followLoading,     setFollowLoading]     = useState(false);
  const [likedProducts,     setLikedProducts]     = useState({});
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating,            setRating]            = useState(0);
  const [review,            setReview]            = useState("");
  const [error,             setError]             = useState(null);

  useEffect(() => {
    if (!shopId) { setLoading(false); return; }
    fetchShopDetails();
    if (user) { checkFollowStatus(); fetchLikedProducts(); }
  }, [shopId, user]);

  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      const [{ data: shopData, error: shopErr }, { data: productsData, error: prodErr }, { data: ratingsData }] = await Promise.all([
        supabase.from("shops").select("*").eq("id", shopId).single(),
        supabase.from("products").select("*, shop:shops(id,name)").eq("shop_id", shopId).order("created_at", { ascending: false }),
        supabase.from("shop_ratings").select("rating").eq("shop_id", shopId),
      ]);
      if (shopErr) throw shopErr;
      if (prodErr) throw prodErr;

      // Compute ratings
      if (ratingsData?.length > 0) {
        const avg = ratingsData.reduce((s, r) => s + r.rating, 0) / ratingsData.length;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratingsData.forEach((r) => breakdown[r.rating]++);
        shopData.average_rating    = avg;
        shopData.ratings_count     = ratingsData.length;
        shopData.ratings_breakdown = breakdown;
      } else {
        shopData.average_rating    = 0;
        shopData.ratings_count     = 0;
        shopData.ratings_breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      }

      const processed = (productsData || []).map((p) => ({
        ...p,
        in_stock: p.is_on_order !== undefined ? !p.is_on_order : p.stock_quantity > 0,
      }));

      const { data: followersData } = await supabase.from("shop_follows").select("id").eq("shop_id", shopId);
      shopData.product_count   = processed.length;
      shopData.followers_count = followersData?.length || 0;

      setShop(shopData);
      setProducts(processed);
      setCategories([...new Set(processed.map((p) => p.category).filter(Boolean))].sort());
    } catch (err) {
      console.error("Error fetching shop:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLikedProducts = async () => {
    if (!user) return;
    const { data } = await supabase.from("product_likes").select("product_id").eq("user_id", user.id);
    const map = {};
    data?.forEach((l) => { map[l.product_id] = true; });
    setLikedProducts(map);
  };

  const checkFollowStatus = async () => {
    if (!user || !shopId) return;
    const { data } = await supabase.from("shop_follows").select("id").eq("user_id", user.id).eq("shop_id", shopId).single();
    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user) { Alert.alert("Sign in Required", "Please sign in to follow shops", [{ text: "Cancel" }, { text: "Sign In", onPress: () => navigation.navigate("Auth") }]); return; }
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await supabase.from("shop_follows").delete().match({ user_id: user.id, shop_id: shopId });
        setIsFollowing(false);
        setShop((s) => s ? { ...s, followers_count: Math.max(0, (s.followers_count || 0) - 1) } : s);
      } else {
        await supabase.from("shop_follows").insert({ user_id: user.id, shop_id: shopId });
        setIsFollowing(true);
        setShop((s) => s ? { ...s, followers_count: (s.followers_count || 0) + 1 } : s);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update follow status");
    } finally {
      setFollowLoading(false);
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

  const handleRatingSubmit = async () => {
    if (!user || rating === 0) return;
    try {
      const { data: existing } = await supabase.from("shop_ratings").select("id").eq("user_id", user.id).eq("shop_id", shopId).single();
      if (existing) {
        await supabase.from("shop_ratings").update({ rating, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("shop_ratings").insert({ shop_id: shopId, user_id: user.id, rating });
      }
      setRating(0); setReview(""); setRatingModalVisible(false);
      fetchShopDetails();
      Alert.alert("Thank you!", "Your rating has been submitted.");
    } catch (err) {
      Alert.alert("Error", "Failed to submit rating");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `🛍️ Check out ${shop?.name} on ShopIt!` });
    } catch (_) {}
  };

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={INDIGO} />
      </SafeAreaView>
    );
  }

  if (error || !shop) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <MaterialIcons name="error-outline" size={52} color="#EF4444" />
        <Text style={[s.errorTxt, { color: muted }]}>Failed to load shop</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchShopDetails}>
          <Text style={s.retryTxt}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={[s.flex, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchShopDetails(); if (user) fetchLikedProducts(); }} tintColor={INDIGO} colors={[INDIGO]} />}
      >
        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <View style={s.hero}>
          {shop.banner_url ? (
            <Image source={{ uri: shop.banner_url }} style={s.heroBg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#312E81", "#4F46E5", "#7C3AED"]} style={s.heroBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="storefront-outline" size={64} color="rgba(255,255,255,0.25)" />
            </LinearGradient>
          )}

          {/* Gradient overlays */}
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={[s.heroOverlay, { height: 120 }]} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.82)"]} style={[s.heroOverlay, { bottom: 0, top: "auto", height: HERO_HEIGHT * 0.65 }]} />

          {/* Nav buttons only — all shop info moves into the body card */}
          <View style={[s.heroNav, { top: insets.top + 12 }]}>
            <TouchableOpacity style={s.heroNavBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.heroNavBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content body ───────────────────────────────────────────── */}
        <View style={[s.body, { backgroundColor: bg }]}>

          {/* ── Shop header: logo straddles hero/card boundary ──────── */}
          <View style={s.shopHeader}>
            {/* Logo ring pokes above the card edge */}
            <View style={s.logoRing}>
              {shop.logo_url ? (
                <Image source={{ uri: shop.logo_url }} style={s.logo} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[INDIGO, VIOLET]} style={s.logo}>
                  <Text style={s.logoInitial}>{shop.name?.charAt(0)?.toUpperCase() || "S"}</Text>
                </LinearGradient>
              )}
            </View>

            {/* Follow + Message buttons float to the right */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: isFollowing ? INDIGO : surface, borderColor: isFollowing ? INDIGO : border }]}
                onPress={toggleFollow}
                disabled={followLoading}
                activeOpacity={0.8}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? "#fff" : INDIGO} />
                ) : (
                  <>
                    <Ionicons name={isFollowing ? "checkmark" : "add"} size={15} color={isFollowing ? "#fff" : INDIGO} />
                    <Text style={[s.actionBtnTxt, { color: isFollowing ? "#fff" : INDIGO }]}>{isFollowing ? "Following" : "Follow"}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: surface, borderColor: border }]}
                onPress={() => navigation.navigate("ChatDetail", { recipientId: shop.owner_id, recipientName: shop.name, recipientImage: shop.logo_url })}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={15} color={INDIGO} />
                <Text style={[s.actionBtnTxt, { color: INDIGO }]}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Shop name + description */}
          <View style={s.shopInfo}>
            <Text style={[s.shopName, { color: colors.text }]}>{shop.name}</Text>
            <ReadMoreText text={shop.description || "No description provided"} limit={100} textColor={muted} />

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Ionicons name="people-outline" size={13} color={muted} />
                <Text style={[s.statTxt, { color: muted }]}>{shop.followers_count || 0} Followers</Text>
              </View>
              <View style={[s.statDot, { backgroundColor: border }]} />
              <View style={s.statItem}>
                <Ionicons name="cube-outline" size={13} color={muted} />
                <Text style={[s.statTxt, { color: muted }]}>{shop.product_count || 0} Products</Text>
              </View>
              <View style={[s.statDot, { backgroundColor: border }]} />
              <View style={s.statItem}>
                <Ionicons name="star" size={13} color="#FFD700" />
                <Text style={[s.statTxt, { color: muted }]}>{(shop.average_rating || 0).toFixed(1)}</Text>
              </View>
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: border }]} />

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {[{ label: "All Products", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))].map(({ label, value }) => {
              const active = selectedCategory === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.chip, { backgroundColor: active ? INDIGO : surface, borderColor: active ? INDIGO : border }]}
                  onPress={() => setSelectedCategory(value)}
                  activeOpacity={0.75}
                >
                  <View style={[s.chipIcon, { backgroundColor: active ? "rgba(255,255,255,0.2)" : isDarkMode ? "#2C2C3E" : "#EEF2FF" }]}>
                    <Ionicons name={getCategoryIcon(value)} size={15} color={active ? "#fff" : INDIGO} />
                  </View>
                  <Text style={[s.chipTxt, { color: active ? "#fff" : colors.text }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Ratings card ──────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: surface, borderColor: border }]}>
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="star" size={16} color={INDIGO} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>Shop Ratings</Text>
              {user && (
                <TouchableOpacity
                  style={[s.rateBtn, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}
                  onPress={() => setRatingModalVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={14} color={INDIGO} />
                  <Text style={[s.rateBtnTxt, { color: INDIGO }]}>Rate Shop</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            <View style={s.ratingsBody}>
              {/* Big number */}
              <View style={s.ratingsLeft}>
                <Text style={[s.ratingBig, { color: colors.text }]}>{(shop.average_rating || 0).toFixed(1)}</Text>
                <View style={{ flexDirection: "row", marginVertical: 4 }}>
                  {renderStars(shop.average_rating || 0)}
                </View>
                <Text style={[s.ratingCount, { color: muted }]}>{shop.ratings_count || 0} ratings</Text>
              </View>

              {/* Bar breakdown */}
              <View style={s.ratingsRight}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = shop.ratings_breakdown?.[star] || 0;
                  const pct   = shop.ratings_count > 0 ? (count / shop.ratings_count) * 100 : 0;
                  return (
                    <View key={star} style={s.barRow}>
                      <Text style={[s.barLabel, { color: muted }]}>{star}</Text>
                      <Ionicons name="star" size={10} color="#FFD700" style={{ marginRight: 6 }} />
                      <View style={[s.barTrack, { backgroundColor: isDarkMode ? "#2C2C3E" : "#F0F0F0" }]}>
                        <View style={[s.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={[s.barCount, { color: muted }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Products ──────────────────────────────────────────────── */}
          <View style={s.productsSection}>
            <View style={s.sectionHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="grid-outline" size={16} color={INDIGO} />
              </View>
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                {selectedCategory === "all" ? "All Products" : `${selectedCategory}`}
              </Text>
              <Text style={[s.sectionCount, { color: muted }]}>{filteredProducts.length}</Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={s.emptyBox}>
                <LinearGradient colors={[`${INDIGO}20`, `${VIOLET}10`]} style={s.emptyCircle}>
                  <Ionicons name="cube-outline" size={36} color={INDIGO} />
                </LinearGradient>
                <Text style={[s.emptyTitle, { color: colors.text }]}>No products here</Text>
                <Text style={[s.emptySub, { color: muted }]}>No products in this category yet</Text>
              </View>
            ) : (
              <View style={s.productsGrid}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={(p) => navigation.navigate("ProductDetails", { product: p })}
                    onLikePress={handleLikePress}
                    isLiked={likedProducts[product.id]}
                    onAddToCart={handleAddToCart}
                    style={s.productCard}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Browse all button */}
          <TouchableOpacity
            style={s.browseTouch}
            onPress={() => navigation.navigate("BrowseProducts", { shopId: shop.id, shopName: shop.name })}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[INDIGO, VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.browseBtn}>
              <Ionicons name="grid-outline" size={18} color="#fff" />
              <Text style={s.browseBtnTxt}>Browse All Products</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* ── Rating Modal ──────────────────────────────────────────────── */}
      <Modal visible={ratingModalVisible} transparent animationType="fade" onRequestClose={() => setRatingModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setRatingModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[s.modalBox, { backgroundColor: surface }]}>
              {/* Handle bar */}
              <View style={[s.modalHandle, { backgroundColor: border }]} />

              <View style={[s.modalIconWrap, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name="star" size={26} color={INDIGO} />
              </View>
              <Text style={[s.modalTitle, { color: colors.text }]}>Rate {shop.name}</Text>
              <Text style={[s.modalSub, { color: muted }]}>How was your experience?</Text>

              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                    <Ionicons
                      name={rating >= star ? "star" : "star-outline"}
                      size={40}
                      color={rating >= star ? "#FFD700" : isDarkMode ? "#3C3C4E" : "#E2E8F0"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[s.reviewInput, { backgroundColor: isDarkMode ? "#2C2C3E" : "#F8F9FF", borderColor: border, color: colors.text }]}
                placeholder="Write your review (optional)"
                placeholderTextColor={muted}
                multiline
                numberOfLines={4}
                value={review}
                onChangeText={setReview}
              />

              <View style={s.modalActions}>
                <TouchableOpacity style={[s.cancelBtn, { borderColor: border }]} onPress={() => setRatingModalVisible(false)}>
                  <Text style={[s.cancelTxt, { color: muted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitTouch, rating === 0 && { opacity: 0.4 }]}
                  onPress={handleRatingSubmit}
                  disabled={rating === 0}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[INDIGO, VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
                    <Text style={s.submitTxt}>Submit Rating</Text>
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

  // Hero
  hero:        { height: HERO_HEIGHT, overflow: "hidden" },
  heroBg:      { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  heroOverlay: { position: "absolute", left: 0, right: 0, top: 0 },
  heroNav:     { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  heroNavBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },

  // Body
  body:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingTop: 24 },

  // Shop header: logo + action buttons row; logo has negative top so it pokes into hero
  shopHeader:  { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, marginTop: -44 },
  logoRing:    { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#fff", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 },
  logo:        { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  logoInitial: { fontSize: 32, fontFamily: FONTS.bold, color: "#fff" },

  actionRow:   { flexDirection: "row", gap: 8, paddingBottom: 4 },
  actionBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5 },
  actionBtnTxt:{ fontSize: 13, fontFamily: FONTS.semiBold },

  // Shop info block
  shopInfo:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  shopName:    { fontSize: 24, fontFamily: FONTS.bold, marginBottom: 4 },
  heroDesc:    { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 19, marginBottom: 2 },
  readMoreLink:{ fontSize: 13, fontFamily: FONTS.semiBold, color: INDIGO, marginTop: 2 },

  statsRow:    { flexDirection: "row", alignItems: "center", marginTop: 10 },
  statItem:    { flexDirection: "row", alignItems: "center", gap: 4 },
  statTxt:     { fontSize: 12, fontFamily: FONTS.medium },
  statDot:     { width: 3, height: 3, borderRadius: 2, marginHorizontal: 8 },

  divider:     { height: 1, marginHorizontal: 0, marginBottom: 4 },

  chipsRow:    { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  chipIcon:    { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  chipTxt:     { fontSize: 13, fontFamily: FONTS.medium },

  // Cards
  card:        { borderRadius: 18, borderWidth: 1, marginHorizontal: 16, marginBottom: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIcon:    { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle:   { flex: 1, fontSize: 15, fontFamily: FONTS.bold },
  cardDivider: { height: 1, marginBottom: 14 },

  rateBtn:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  rateBtnTxt:  { fontSize: 12, fontFamily: FONTS.semiBold },

  ratingsBody: { flexDirection: "row", alignItems: "center" },
  ratingsLeft: { alignItems: "center", flex: 1 },
  ratingBig:   { fontSize: 38, fontFamily: FONTS.bold, lineHeight: 44 },
  ratingCount: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 4 },
  ratingsRight:{ flex: 1.8, gap: 5, marginLeft: 16 },
  barRow:      { flexDirection: "row", alignItems: "center" },
  barLabel:    { width: 14, fontSize: 11, fontFamily: FONTS.medium, textAlign: "right", marginRight: 4 },
  barTrack:    { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:     { height: "100%", backgroundColor: "#FFD700", borderRadius: 3 },
  barCount:    { width: 20, fontSize: 10, fontFamily: FONTS.regular, textAlign: "right", marginLeft: 4 },

  // Products
  productsSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionTitle:    { flex: 1, fontSize: 16, fontFamily: FONTS.bold },
  sectionCount:    { fontSize: 13, fontFamily: FONTS.medium },
  productsGrid:    { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  productCard:     { width: (width - 48) / 2, marginBottom: 14 },

  emptyBox:    { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyCircle: { width: 80, height: 80, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 16, fontFamily: FONTS.bold },
  emptySub:    { fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },

  browseTouch: { marginHorizontal: 16, borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  browseBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14 },
  browseBtnTxt:{ fontSize: 15, fontFamily: FONTS.bold, color: "#fff" },

  // Error / loading
  errorTxt:    { fontSize: 15, fontFamily: FONTS.medium, marginTop: 12, marginBottom: 16 },
  retryBtn:    { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: INDIGO, borderRadius: 12 },
  retryTxt:    { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  modalIconWrap:{ width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle:   { fontSize: 20, fontFamily: FONTS.bold, marginBottom: 6, textAlign: "center" },
  modalSub:     { fontSize: 14, fontFamily: FONTS.regular, marginBottom: 24, textAlign: "center" },
  starsRow:     { flexDirection: "row", gap: 12, marginBottom: 24 },
  reviewInput:  { width: "100%", borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 100, textAlignVertical: "top", fontSize: 14, fontFamily: FONTS.regular, marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  cancelTxt:    { fontSize: 15, fontFamily: FONTS.semiBold },
  submitTouch:  { flex: 1.5, borderRadius: 14, overflow: "hidden" },
  submitBtn:    { paddingVertical: 14, alignItems: "center", borderRadius: 14 },
  submitTxt:    { fontSize: 15, fontFamily: FONTS.bold, color: "#fff" },
});

export default ShopDetailsScreen;
