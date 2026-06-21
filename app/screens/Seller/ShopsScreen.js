import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  TextInput,
  StatusBar,
  Dimensions,
  Linking,
  Platform,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS } from "../../constants/theme";
import {
  useFonts,
  Jost_400Regular,
  Jost_700Bold,
  Jost_500Medium,
  Jost_600SemiBold,
} from "@expo-google-fonts/jost";

const { width } = Dimensions.get("window");

const staticMapUrl = (lat, lng, w = 360, h = 130, zoom = 14) =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&markers=${lat},${lng},ol-marker`;

const openMaps = (lat, lng, name) => {
  const label = encodeURIComponent(name);
  const url = Platform.OS === "ios"
    ? `maps://?q=${label}&ll=${lat},${lng}`
    : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)
  );
};

const CARD_GRADIENTS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
];

const LocationCard = ({ item, dark, colors, navigation }) => {
  const hasCoords = item.latitude && item.longitude;

  if (hasCoords) {
    const mapUrl = staticMapUrl(item.latitude, item.longitude);
    return (
      <TouchableOpacity
        style={[styles.locationCard, { borderColor: dark ? "#2D2D2D" : "#E2E8F0" }]}
        onPress={() => openMaps(item.latitude, item.longitude, item.name)}
        activeOpacity={0.88}
      >
        {/* Map thumbnail */}
        <View style={styles.mapThumbContainer}>
          <Image
            source={{ uri: mapUrl }}
            style={styles.mapThumb}
            resizeMode="cover"
          />
          {/* Pin overlay */}
          <View style={styles.mapPinOverlay}>
            <View style={styles.mapPin}>
              <MaterialIcons name="location-on" size={20} color="#fff" />
            </View>
          </View>
          {/* "Open in Maps" pill */}
          <View style={styles.openMapsPill}>
            <Ionicons name="navigate" size={11} color="#6366F1" />
            <Text style={styles.openMapsPillText}>Open in Maps</Text>
          </View>
        </View>

        {/* Coordinates row */}
        <View style={[styles.coordsRow, { backgroundColor: dark ? "#1E293B" : "#F8FAFC" }]}>
          <View style={styles.coordChip}>
            <Text style={styles.coordLabel}>LAT</Text>
            <Text style={[styles.coordValue, { color: colors.text }]}>
              {item.latitude.toFixed(5)}
            </Text>
          </View>
          <View style={[styles.coordDot, { backgroundColor: dark ? "#374151" : "#CBD5E1" }]} />
          <View style={styles.coordChip}>
            <Text style={styles.coordLabel}>LNG</Text>
            <Text style={[styles.coordValue, { color: colors.text }]}>
              {item.longitude.toFixed(5)}
            </Text>
          </View>
          {item.location ? (
            <>
              <View style={[styles.coordDot, { backgroundColor: dark ? "#374151" : "#CBD5E1" }]} />
              <Ionicons name="location-outline" size={13} color="#94A3B8" />
              <Text style={styles.coordCity} numberOfLines={1}>{item.location}</Text>
            </>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  // No coordinates — prompt to set location
  return (
    <TouchableOpacity
      style={[styles.noLocationCard, { borderColor: dark ? "#2D2D2D" : "#E2E8F0", backgroundColor: dark ? "#1E293B" : "#F8FAFC" }]}
      onPress={() => navigation.navigate("ShopLocation", { shopId: item.id })}
      activeOpacity={0.85}
    >
      <LinearGradient colors={["#EEF2FF", "#E0E7FF"]} style={styles.noLocationIcon}>
        <MaterialCommunityIcons name="map-marker-plus-outline" size={22} color="#6366F1" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[styles.noLocationTitle, { color: colors.text }]}>Pin your shop location</Text>
        <Text style={styles.noLocationSub}>Help customers find you on the map</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
};

const ShopsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { colors, dark } = useTheme();
  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_700Bold,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  useEffect(() => { fetchShops(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredShops(shops); return; }
    const q = searchQuery.toLowerCase();
    setFilteredShops(shops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q)
    ));
  }, [shops, searchQuery]);

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("shops")
        .select("*, products:products(count), orders:orders(count)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setShops(data || []);
      setFilteredShops(data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load shops");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "verified":   return { label: "Verified",   color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: "verified" };
      case "pending":    return { label: "Pending",    color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: "schedule" };
      default:           return { label: "Unverified", color: "#94A3B8", bg: "rgba(148,163,184,0.12)", icon: "error-outline" };
    }
  };

  if (!fontsLoaded) return null;

  const renderShopCard = ({ item, index }) => {
    const productCount = item.products?.[0]?.count || 0;
    const orderCount   = item.orders?.[0]?.count   || 0;
    const status = getStatusConfig(item.verification_status);
    const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate("ShopDetails", { shopId: item.id })}
        activeOpacity={0.92}
      >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          {item.banner_url ? (
            <Image source={{ uri: item.banner_url }} style={styles.banner} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradient} style={styles.banner} />
          )}

          {/* Overlay gradient at bottom for readability */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={styles.bannerOverlay}
          />

          {/* Status badge on banner */}
          <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.color + "40" }]}>
            <MaterialIcons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Logo floating over banner */}
        <View style={styles.logoWrapper}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.logo} />
          ) : (
            <LinearGradient colors={gradient} style={styles.logo}>
              <Text style={styles.logoInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Card body */}
        <View style={styles.cardBody}>
          <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          {item.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#94A3B8" />
              <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}

          {item.location && item.description ? (
            <View style={[styles.divider, { backgroundColor: dark ? "#2D2D2D" : "#F1F5F9" }]} />
          ) : null}

          {item.description ? (
            <Text style={[styles.description, { color: dark ? "#9CA3AF" : "#6B7280" }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Stats row */}
          <View style={[styles.statsRow, { borderTopColor: dark ? "#2D2D2D" : "#F1F5F9" }]}>
            <View style={styles.stat}>
              <View style={[styles.statIconBox, { backgroundColor: "rgba(99,102,241,0.1)" }]}>
                <MaterialIcons name="inventory-2" size={15} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.text }]}>{productCount}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
            </View>

            <View style={[styles.statDivider, { backgroundColor: dark ? "#2D2D2D" : "#E2E8F0" }]} />

            <View style={styles.stat}>
              <View style={[styles.statIconBox, { backgroundColor: "rgba(236,72,153,0.1)" }]}>
                <MaterialIcons name="receipt-long" size={15} color="#EC4899" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.text }]}>{orderCount}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
            </View>

            <View style={[styles.statDivider, { backgroundColor: dark ? "#2D2D2D" : "#E2E8F0" }]} />

            <View style={styles.stat}>
              <View style={[styles.statIconBox, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
                <MaterialCommunityIcons name="store-check" size={15} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {item.verification_status === "verified" ? "Active" : "—"}
                </Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <LocationCard
            item={item}
            dark={dark}
            colors={colors}
            navigation={navigation}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.manageBtn, { backgroundColor: dark ? "#1E293B" : "#EEF2FF" }]}
              onPress={() => navigation.navigate("ShopDetails", { shopId: item.id })}
            >
              <MaterialIcons name="store" size={16} color="#6366F1" />
              <Text style={[styles.manageBtnText, { color: "#6366F1" }]}>Manage</Text>
            </TouchableOpacity>

            {item.verification_status !== "verified" && (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => navigation.navigate("Verification")}
              >
                <LinearGradient colors={["#F59E0B", "#EF4444"]} style={styles.verifyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <MaterialIcons name="verified-user" size={16} color="#fff" />
                  <Text style={styles.verifyBtnText}>Verify Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={["#EEF2FF", "#E0E7FF"]} style={styles.emptyIconBox}>
        <MaterialCommunityIcons name="store-plus-outline" size={52} color="#6366F1" />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery.trim() ? "No results found" : "No shops yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim()
          ? `No shops match "${searchQuery}"`
          : "Create your first shop and start selling today"}
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity onPress={() => navigation.navigate("CreateShop")} activeOpacity={0.85}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.createBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <MaterialIcons name="add-business" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create Shop</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: dark ? "#9CA3AF" : "#6B7280" }]}>Loading shops…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: dark ? "#1E293B" : "#F1F5F9" }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Shops</Text>
          <Text style={styles.headerSub}>{shops.length} shop{shops.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("CreateShop")}
        >
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.addBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search shops…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderShopCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchShops(); }}
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnInner: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  searchWrapper: { paddingHorizontal: 20, paddingVertical: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  // Card
  card: {
    borderRadius: 20,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerContainer: { height: 120, position: "relative" },
  banner: { width: "100%", height: "100%" },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  statusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold },

  logoWrapper: {
    position: "absolute",
    top: 80,
    left: 20,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: { width: 64, height: 64, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  logoInitial: { fontSize: 26, fontFamily: FONTS.bold, color: "#fff" },

  cardBody: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 16 },
  shopName: { fontSize: 18, fontFamily: FONTS.bold, letterSpacing: -0.3, marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  divider: { height: 1, marginBottom: 10 },
  locationText: { fontSize: 13, color: "#94A3B8", fontFamily: FONTS.regular, flex: 1 },
  description: { fontSize: 14, lineHeight: 20, fontFamily: FONTS.regular, marginBottom: 14 },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 14,
  },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  statIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 14, fontFamily: FONTS.semiBold },
  statLabel: { fontSize: 11, color: "#94A3B8", fontFamily: FONTS.regular },
  statDivider: { width: 1, height: 32, marginHorizontal: 8 },

  actions: { flexDirection: "row", gap: 10 },
  manageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  manageBtnText: { fontSize: 14, fontFamily: FONTS.semiBold },

  verifyBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  verifyBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  verifyBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: "#fff" },

  // Empty
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#94A3B8", fontFamily: FONTS.regular, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  createBtnText: { fontSize: 15, fontFamily: FONTS.semiBold, color: "#fff" },

  // Loading
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15, fontFamily: FONTS.regular },

  // Location card — has coordinates
  locationCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  mapThumbContainer: { height: 130, position: "relative" },
  mapThumb: { width: "100%", height: "100%" },
  mapPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  openMapsPill: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  openMapsPillText: { fontSize: 11, fontFamily: FONTS.semiBold, color: "#6366F1" },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  coordChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  coordLabel: { fontSize: 9, fontFamily: FONTS.bold, color: "#94A3B8", letterSpacing: 0.5 },
  coordValue: { fontSize: 12, fontFamily: FONTS.semiBold },
  coordDot: { width: 4, height: 4, borderRadius: 2 },
  coordCity: { fontSize: 12, fontFamily: FONTS.regular, color: "#94A3B8", flex: 1 },

  // Location card — no coordinates
  noLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  noLocationTitle: { fontSize: 13, fontFamily: FONTS.semiBold, marginBottom: 2 },
  noLocationSub: { fontSize: 12, color: "#94A3B8", fontFamily: FONTS.regular },
});

export default ShopsScreen;
