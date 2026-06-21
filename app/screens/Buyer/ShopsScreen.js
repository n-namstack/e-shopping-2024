import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@react-navigation/native";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import { useAppTheme } from "../../constants/themeContext";
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";

const ShopsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredShops, setFilteredShops] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [followedShopIds, setFollowedShopIds] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_700Bold,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  useEffect(() => {
    fetchShops();
    if (user) fetchFollowedShops();
  }, [user]);

  useEffect(() => {
    filterShops();
  }, [shops, searchQuery, activeFilter, verificationFilter, followedShopIds]);

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("shops")
        .select(`*, products:products(count), owner:profiles(username), followers:shop_follows(count)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedShops = data.map((shop) => ({
        ...shop,
        followers_count: shop.followers?.[0]?.count || 0,
      }));

      setShops(processedShops || []);
    } catch (error) {
      console.error("Error fetching shops:", error.message);
      Alert.alert("Error", "Failed to load shops");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFollowedShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_follows")
        .select("shop_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setFollowedShopIds(data.map((item) => item.shop_id));
    } catch (error) {
      console.error("Error fetching followed shops:", error.message);
    }
  };

  const filterShops = () => {
    let result = [...shops];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (shop) =>
          shop.name.toLowerCase().includes(query) ||
          shop.description?.toLowerCase().includes(query) ||
          shop.location?.toLowerCase().includes(query),
      );
    }

    if (verificationFilter === "verified") {
      result = result.filter((shop) => shop.verification_status === "verified");
    } else if (verificationFilter === "unverified") {
      result = result.filter((shop) => shop.verification_status !== "verified");
    }

    if (activeFilter === "following" && user) {
      result = result.filter((shop) => followedShopIds.includes(shop.id));
    }

    setFilteredShops(result);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
    if (user) fetchFollowedShops();
  };

  const toggleFollow = async (shopId) => {
    if (!user) {
      Alert.alert("Sign in Required", "Please sign in to follow shops", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => navigation.navigate("Auth") },
      ]);
      return;
    }

    try {
      if (followedShopIds.includes(shopId)) {
        const { error } = await supabase
          .from("shop_follows")
          .delete()
          .match({ user_id: user.id, shop_id: shopId });

        if (error) throw error;
        setFollowedShopIds(followedShopIds.filter((id) => id !== shopId));
      } else {
        const { error } = await supabase
          .from("shop_follows")
          .insert({ user_id: user.id, shop_id: shopId });

        if (error) throw error;
        setFollowedShopIds([...followedShopIds, shopId]);
      }
    } catch (error) {
      console.error("Error toggling follow:", error.message);
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  if (!fontsLoaded) return null;

  const FILTERS = [
    { key: "all", label: "All Shops", icon: "storefront-outline" },
    { key: "following", label: "Following", icon: "heart-outline" },
    { key: "verified", label: "Verified", icon: "checkmark-circle-outline" },
  ];

  const renderShopItem = ({ item }) => {
    const isFollowing = followedShopIds.includes(item.id);
    const productCount = item.products?.[0]?.count || 0;
    const ownerUsername = item.owner?.username || "Unknown Seller";
    const followerCount = item.followers_count || 0;
    const isVerified = item.verification_status === "verified";

    return (
      <TouchableOpacity
        style={[styles.shopCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate("ShopDetails", { shopId: item.id })}
        activeOpacity={0.95}
      >
        {/* Banner */}
        <View style={styles.bannerWrapper}>
          <ImageBackground
            source={item.banner_url ? { uri: item.banner_url } : require("../../../assets/shop-background-ph1.jpg")}
            style={styles.banner}
          >
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.55)"]}
              style={styles.bannerGradient}
            />
          </ImageBackground>

          {/* Verification badge on banner */}
          <View style={[styles.verificationBadge, { backgroundColor: isVerified ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)" }]}>
            <Ionicons
              name={isVerified ? "checkmark-circle" : "time-outline"}
              size={13}
              color={isVerified ? "#22C55E" : "#F59E0B"}
            />
            <Text style={[styles.verificationText, { color: isVerified ? "#22C55E" : "#F59E0B" }]}>
              {isVerified ? "Verified" : item.verification_status === "pending" ? "Pending" : "Unverified"}
            </Text>
          </View>
        </View>

        {/* Logo */}
        <View style={[styles.logoWrapper, { backgroundColor: colors.card }]}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.logo} />
          ) : (
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.logo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.logoInitial}>
                {item.name.length !== 0 ? item.name.charAt(0).toUpperCase() : "S"}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Content */}
        <View style={styles.shopContent}>
          {/* Name + Follow */}
          <View style={styles.shopNameRow}>
            <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => toggleFollow(item.id)}
            >
              <Ionicons
                name={isFollowing ? "checkmark" : "add"}
                size={14}
                color={isFollowing ? "#22C55E" : "#6366F1"}
              />
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.shopOwner}>by {ownerUsername}</Text>

          {item.description ? (
            <Text style={[styles.shopDescription, { color: colors.text }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={styles.statIconBox}>
                <Ionicons name="cube-outline" size={13} color="#6366F1" />
              </View>
              <Text style={[styles.statText, { color: colors.text }]}>{productCount} Products</Text>
            </View>
            <View style={styles.statChip}>
              <View style={styles.statIconBox}>
                <Ionicons name="people-outline" size={13} color="#6366F1" />
              </View>
              <Text style={[styles.statText, { color: colors.text }]}>{followerCount} Followers</Text>
            </View>
            {item.location ? (
              <View style={styles.statChip}>
                <View style={styles.statIconBox}>
                  <Ionicons name="location-outline" size={13} color="#6366F1" />
                </View>
                <Text style={[styles.statText, { color: colors.text }]} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer */}
        <TouchableOpacity
          style={[styles.viewProductsBtn, { borderTopColor: colors.border }]}
          onPress={() => navigation.navigate("BrowseProducts", { shopId: item.id, shopName: item.name })}
        >
          <Text style={styles.viewProductsText}>View Products</Text>
          <Ionicons name="chevron-forward" size={14} color="#6366F1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="storefront-outline" size={40} color="#6366F1" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Shops Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery.trim() ? `No shops match "${searchQuery}"` : "Try adjusting your filters or search"}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading shops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: isSearchFocused ? "#6366F1" : colors.border, borderWidth: isSearchFocused ? 2 : 1.5 }]}>
          <Ionicons name="search" size={20} color={isSearchFocused ? "#6366F1" : "#9CA3AF"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search shops..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => {
          const active =
            f.key === "verified" ? verificationFilter === "verified" : activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, { backgroundColor: colors.background, borderColor: active ? "#6366F1" : colors.border }, active && styles.filterChipActive]}
              onPress={() => {
                if (f.key === "verified") {
                  setVerificationFilter(verificationFilter === "verified" ? "all" : "verified");
                } else {
                  setActiveFilter(f.key);
                }
              }}
            >
              <Ionicons name={f.icon} size={13} color={active ? "#fff" : "#6366F1"} />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredShops}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={filteredShops.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366F1"]}
            tintColor="#6366F1"
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: FONTS.regular },

  // Search
  searchWrapper: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  // Filters
  filterWrapper: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, borderWidth: 1.5,
  },
  filterChipActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  filterChipText: { fontSize: 13, color: "#6366F1", fontFamily: FONTS.medium },
  filterChipTextActive: { color: "#fff" },

  list: { padding: 16, paddingBottom: 100 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { alignItems: "center", padding: 24, gap: 10 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: FONTS.regular, textAlign: "center" },

  // Shop card
  shopCard: {
    borderRadius: 18, marginBottom: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },

  // Banner
  bannerWrapper: { height: 110, position: "relative" },
  banner: { width: "100%", height: "100%" },
  bannerGradient: { ...StyleSheet.absoluteFillObject },
  verificationBadge: {
    position: "absolute", top: 10, right: 12,
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backdropFilter: "blur(4px)",
  },
  verificationText: { fontSize: 12, fontFamily: FONTS.semiBold },

  // Logo
  logoWrapper: {
    position: "absolute", top: 62, left: 16,
    borderRadius: 50, padding: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  logo: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: "center", alignItems: "center",
  },
  logoInitial: { fontSize: 26, color: "#fff", fontFamily: FONTS.bold },

  // Content
  shopContent: { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12 },
  shopNameRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 3,
  },
  shopName: { flex: 1, fontSize: 17, fontFamily: FONTS.bold, marginRight: 10 },
  followBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
    borderWidth: 1.5, borderColor: "#6366F1",
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  followBtnText: { fontSize: 12, color: "#6366F1", fontFamily: FONTS.semiBold },
  followingBtn: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "#22C55E",
  },
  followingBtnText: { color: "#22C55E" },

  shopOwner: { fontSize: 13, color: "#9CA3AF", fontFamily: FONTS.medium, marginBottom: 8 },
  shopDescription: { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20, marginBottom: 12, opacity: 0.8 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  statIconBox: {
    width: 22, height: 22, borderRadius: 7, backgroundColor: "rgba(99,102,241,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  statText: { fontSize: 12, fontFamily: FONTS.medium },

  // Footer
  viewProductsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 12, borderTopWidth: 1,
  },
  viewProductsText: { fontSize: 14, color: "#6366F1", fontFamily: FONTS.semiBold },
});

export default ShopsScreen;
