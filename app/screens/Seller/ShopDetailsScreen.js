import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import { FONTS, SHADOWS } from "../../constants/theme";
import { compressImage } from "../../utils/imageHelpers";
import { useAppTheme } from "../../constants/themeContext";

const PRIMARY = "#6366F1";

const STATS = (stats, formatCurrency) => [
  { label: "Products", value: stats.productCount, icon: "cube",          color: "#6366F1", bg: "rgba(99,102,241,0.12)" },
  { label: "Orders",   value: stats.orderCount,   icon: "receipt",       color: "#E91E63", bg: "rgba(233,30,99,0.12)"  },
  { label: "Revenue",  value: formatCurrency(stats.totalSales), icon: "cash", color: "#22C55E", bg: "rgba(34,197,94,0.12)"  },
  { label: "Pending",  value: stats.pendingOrders, icon: "time",         color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
];

const ACTIONS = (shop, navigation) => [
  { label: "Add Product",    icon: "add-circle",    colors: ["#22C55E","#16A34A"], onPress: () => navigation.navigate("ProductsTab", { screen: "AddProduct",    params: { shopId: shop.id } }) },
  { label: "View Products",  icon: "grid",          colors: ["#6366F1","#8B5CF6"], onPress: () => navigation.navigate("ProductsTab", { screen: "Products",       params: { shopId: shop.id, fromShop: true } }) },
  { label: "View Orders",    icon: "receipt",       colors: ["#E91E63","#C2185B"], onPress: () => navigation.navigate("OrdersTab",   { screen: "Orders",         params: { shopId: shop.id, fromShop: true } }) },
  { label: "Analytics",      icon: "bar-chart",     colors: ["#8B5CF6","#7C3AED"], onPress: () => navigation.navigate("DashboardTab",{ screen: "Analytics",      params: { shopId: shop.id } }) },
  { label: "Shop Location",  icon: "location",      colors: ["#0EA5E9","#0284C7"], onPress: () => navigation.navigate("ShopsTab",    { screen: "ShopLocation",   params: { shopId: shop.id } }) },
  { label: "Get Verified",   icon: "shield-checkmark", colors: ["#F59E0B","#D97706"], onPress: () => navigation.navigate("Verification") },
];

const ShopDetailsScreen = ({ navigation, route }) => {
  const { shopId } = route.params;
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [isLoading, setIsLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop]             = useState(null);
  const [stats, setStats]           = useState({ productCount: 0, orderCount: 0, pendingOrders: 0, totalSales: 0 });

  useEffect(() => { fetchShopDetails(); }, []);

  const fetchShopDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("shops").select("*").eq("id", shopId).single();
      if (error) throw error;
      if (!data) { Alert.alert("Error", "Shop not found"); navigation.goBack(); return; }
      setShop(data);
      await fetchShopStatistics(shopId);
    } catch (error) {
      console.error("Error fetching shop details:", error.message);
      Alert.alert("Error", "Failed to load shop details");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchShopStatistics = async (id) => {
    try {
      const [{ data: products }, { data: orders }, { data: pending }, { data: sales }] = await Promise.all([
        supabase.from("products").select("count").eq("shop_id", id),
        supabase.from("orders").select("count").eq("shop_id", id),
        supabase.from("orders").select("count").eq("shop_id", id).in("status", ["pending", "processing"]),
        supabase.from("orders").select("total_amount").eq("shop_id", id).eq("status", "delivered"),
      ]);
      const totalSales = (sales || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      setStats({
        productCount:  products?.[0]?.count || 0,
        orderCount:    orders?.[0]?.count   || 0,
        pendingOrders: pending?.[0]?.count  || 0,
        totalSales,
      });
    } catch (error) {
      console.error("Error fetching shop statistics:", error.message);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchShopDetails(); };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload images.");
      return false;
    }
    return true;
  };

  const handleSelectImage = async (type) => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: type === "logo" ? [1, 1] : [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        await uploadImage(result.assets[0].uri, type);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const uploadImage = async (uri, type) => {
    try {
      setIsLoading(true);
      const compressedUri = await compressImage(uri);
      const response = await fetch(compressedUri);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error("Selected image is empty or invalid");
      const fileExt  = uri.split(".").pop();
      const filePath = `shops/${shopId}_${type}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("shop-images").upload(filePath, arrayBuffer, {
        contentType: "image/jpeg", cacheControl: "3600", upsert: true,
      });
      if (error) {
        if (error.message.includes("Payload too large")) throw new Error("Image is too large. Please select a smaller image (max 5MB)");
        throw error;
      }
      const { data } = supabase.storage.from("shop-images").getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error("Failed to get image URL");
      const updateData = type === "logo" ? { logo_url: data.publicUrl } : { banner_url: data.publicUrl };
      const { error: updateError } = await supabase.from("shops").update(updateData).eq("id", shopId);
      if (updateError) throw new Error("Failed to update shop with new image");
      setShop((prev) => ({ ...prev, ...updateData }));
      Alert.alert("Success", `Shop ${type} updated successfully`);
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", error.message || `Failed to update shop ${type}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    "N$" + parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");

  const verificationStatus = shop?.verification_status;
  const isVerified = verificationStatus === "verified";
  const verBadge = isVerified
    ? { label: "Verified", color: "#22C55E", bg: "rgba(34,197,94,0.12)", icon: "shield-checkmark" }
    : verificationStatus === "pending"
    ? { label: "Pending",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: "time" }
    : { label: "Unverified", color: "#9CA3AF", bg: "rgba(156,163,175,0.12)", icon: "shield-outline" };

  const surface  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const muted    = isDarkMode ? "#9CA3AF" : "#6B7280";
  const divider  = isDarkMode ? "rgba(255,255,255,0.07)" : "#F3F4F6";

  if (isLoading && !shop) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={[s.loadingTxt, { color: muted }]}>Loading shop…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <View style={s.bannerWrap}>
        {shop?.banner_url ? (
          <Image source={{ uri: shop.banner_url }} style={s.banner} resizeMode="cover" />
        ) : (
          <LinearGradient colors={["#312E81", "#4F46E5", "#7C3AED"]} style={s.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <MaterialCommunityIcons name="storefront-outline" size={52} color="rgba(255,255,255,0.35)" />
          </LinearGradient>
        )}

        {/* Gradient overlay for nav buttons */}
        <LinearGradient colors={["rgba(0,0,0,0.55)", "transparent"]} style={s.bannerOverlay} />

        {/* Nav buttons */}
        <TouchableOpacity style={s.navBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.navBtn, s.navBtnRight]} onPress={() => navigation.navigate("EditShop", { shopId: shop.id })}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Change banner */}
        <TouchableOpacity style={s.changeBannerBtn} onPress={() => handleSelectImage("banner")} activeOpacity={0.8}>
          <Ionicons name="camera" size={16} color="#fff" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={s.logoWrap}>
          {shop?.logo_url ? (
            <Image source={{ uri: shop.logo_url }} style={s.logo} />
          ) : (
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={s.logo}>
              <Text style={s.logoInitial}>{shop?.name?.charAt(0)?.toUpperCase() || "S"}</Text>
            </LinearGradient>
          )}
          <TouchableOpacity style={s.changeLogoBtn} onPress={() => handleSelectImage("logo")} activeOpacity={0.8}>
            <Ionicons name="camera" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* ── Shop identity ──────────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surface }]}>
          <View style={s.shopNameRow}>
            <Text style={[s.shopName, { color: colors.text }]} numberOfLines={2}>{shop?.name}</Text>
            <View style={[s.verBadge, { backgroundColor: verBadge.bg }]}>
              <Ionicons name={verBadge.icon} size={13} color={verBadge.color} />
              <Text style={[s.verBadgeTxt, { color: verBadge.color }]}>{verBadge.label}</Text>
            </View>
          </View>

          {shop?.location && (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={15} color={muted} />
              <Text style={[s.locationTxt, { color: muted }]}>{shop.location}</Text>
            </View>
          )}

          {shop?.description ? (
            <Text style={[s.description, { color: muted }]}>{shop.description}</Text>
          ) : (
            <Text style={[s.description, { color: isDarkMode ? "#4B5563" : "#D1D5DB" }]}>No description added yet.</Text>
          )}
        </View>

        {/* ── Verification CTA ───────────────────────────────────────────────── */}
        {!isVerified && (
          <LinearGradient
            colors={verificationStatus === "pending" ? ["#92400E","#D97706"] : ["#312E81","#6366F1"]}
            style={s.verCta}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={s.verCtaIcon}>
              <Ionicons name={verificationStatus === "pending" ? "time" : "shield-checkmark-outline"} size={26} color="#fff" />
            </View>
            <View style={s.verCtaText}>
              <Text style={s.verCtaTitle}>
                {verificationStatus === "pending" ? "Verification Under Review" : "Get Your Shop Verified"}
              </Text>
              <Text style={s.verCtaSub}>
                {verificationStatus === "pending"
                  ? "We're reviewing your documents. You'll be notified soon."
                  : "Earn a verified badge and increase buyer trust."}
              </Text>
            </View>
            {verificationStatus !== "pending" && (
              <TouchableOpacity style={s.verCtaBtn} onPress={() => navigation.navigate("Verification")}>
                <Text style={s.verCtaBtnTxt}>Verify →</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        )}

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surface }]}>
          <Text style={[s.sectionLabel, { color: colors.text }]}>Performance</Text>
          <View style={s.statsGrid}>
            {STATS(stats, formatCurrency).map(({ label, value, icon, color, bg }) => (
              <View key={label} style={[s.statCard, { backgroundColor: bg }]}>
                <View style={[s.statIcon, { backgroundColor: `${color}22` }]}>
                  <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={[s.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
                <Text style={[s.statLabel, { color: muted }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: surface }]}>
          <Text style={[s.sectionLabel, { color: colors.text }]}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            {ACTIONS(shop || {}, navigation).map(({ label, icon, colors: gc, onPress }) => (
              <TouchableOpacity key={label} style={[s.actionCard, { backgroundColor: divider }]} onPress={onPress} activeOpacity={0.75}>
                <LinearGradient colors={gc} style={s.actionIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={icon} size={20} color="#fff" />
                </LinearGradient>
                <Text style={[s.actionLabel, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Contact ───────────────────────────────────────────────────────── */}
        {(shop?.email || shop?.phone || shop?.location || shop?.created_at) && (
          <View style={[s.card, { backgroundColor: surface }]}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>Details</Text>
            {[
              shop?.email    && { icon: "mail-outline",     label: shop.email },
              shop?.phone    && { icon: "call-outline",     label: shop.phone },
              shop?.location && { icon: "location-outline", label: shop.location },
              shop?.created_at && { icon: "calendar-outline", label: `Member since ${new Date(shop.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` },
            ].filter(Boolean).map(({ icon, label }, i, arr) => (
              <View key={icon} style={[s.contactRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider }]}>
                <View style={[s.contactIcon, { backgroundColor: "rgba(99,102,241,0.1)" }]}>
                  <Ionicons name={icon} size={17} color={PRIMARY} />
                </View>
                <Text style={[s.contactTxt, { color: colors.text }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  loadingTxt: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },

  // Banner
  bannerWrap: {
    height: 220,
    width: "100%",
    position: "relative",
  },
  banner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 90,
  },
  navBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? 40 : 14,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnRight: {
    left: undefined,
    right: 16,
  },
  changeBannerBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    position: "absolute",
    bottom: -36,
    left: 20,
    zIndex: 10,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ android: { elevation: 6 } }),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  logoInitial: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: "#fff",
  },
  changeLogoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Scroll / Cards
  scroll: {
    paddingTop: 52,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginBottom: 14,
  },

  // Shop identity
  shopNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  shopName: {
    fontSize: 21,
    fontFamily: FONTS.bold,
    flex: 1,
    lineHeight: 28,
  },
  verBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    marginTop: 2,
  },
  verBadgeTxt: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  locationTxt: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  description: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },

  // Verification CTA
  verCta: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  verCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  verCtaText: { flex: 1 },
  verCtaTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#fff",
    marginBottom: 3,
  },
  verCtaSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 17,
  },
  verCtaBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verCtaBtnTxt: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#fff",
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },

  // Actions
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "30.5%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textAlign: "center",
    lineHeight: 14,
  },

  // Contact
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTxt: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    flex: 1,
  },
});

export default ShopDetailsScreen;
