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
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

const ShopsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredShops, setFilteredShops] = useState([]);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [shops, searchQuery]);

  const filterShops = () => {
    let filtered = [...shops];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (shop) =>
          shop.name.toLowerCase().includes(query) ||
          shop.description?.toLowerCase().includes(query) ||
          shop.location?.toLowerCase().includes(query)
      );
    }

    setFilteredShops(filtered);
  };

  const fetchShops = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("shops")
        .select(
          `
          *,
          products:products(count),
          orders:orders(count)
        `
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setShops(data || []);
      setFilteredShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error.message);
      Alert.alert("Error", "Failed to load shops");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  const handleVerification = async (shopId) => {
    try {
      // Navigate to verification screen
      navigation.navigate("Verification", { shopId });
    } catch (error) {
      console.error("Error navigating to verification:", error.message);
      Alert.alert("Error", "Failed to proceed with verification");
    }
  };

  const handleCreateShop = () => {
    navigation.navigate("CreateShop");
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  if (!fontsLoaded) {
    return null;
  }

  const renderShopItem = ({ item }) => {
    const productCount = item.products?.[0]?.count || 0;
    const orderCount = item.orders?.[0]?.count || 0;

    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => navigation.navigate("ShopDetails", { shopId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.shopHeader}>
          <View style={styles.shopInfo}>
            <View style={styles.logoContainer}>
              {item.logo_url ? (
                <Image source={{ uri: item.logo_url }} style={styles.logo} />
              ) : (
                <LinearGradient
                  colors={["#ff9966", "#ff5e62"]}
                  style={styles.logo}
                >
                  <Text style={styles.logoPlaceholderText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.shopDetails}>
              <Text style={styles.shopName}>{item.name}</Text>
              {item.location && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
              )}
            </View>
          </View>
          <View
            style={[
              styles.verificationBadge,
              {
                backgroundColor:
                  item.verification_status === "verified"
                    ? "rgba(76, 175, 80, 0.1)"
                    : item.verification_status === "pending"
                    ? "rgba(255, 152, 0, 0.1)"
                    : "rgba(158, 158, 158, 0.1)",
              },
            ]}
          >
            {item.verification_status === "verified" ? (
              <>
                <MaterialIcons name="verified" size={16} color="#4CAF50" />
                <Text style={[styles.verificationText, { color: "#4CAF50" }]}>
                  Verified
                </Text>
              </>
            ) : item.verification_status === "pending" ? (
              <>
                <MaterialIcons name="pending" size={16} color="#FF9800" />
                <Text style={[styles.verificationText, { color: "#FF9800" }]}>
                  Pending
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="error-outline" size={16} color="#9E9E9E" />
                <Text style={[styles.verificationText, { color: "#9E9E9E" }]}>
                  Unverified
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.shopContent}>
          <Text style={styles.shopDescription} numberOfLines={2}>
            {item.description || "No description provided"}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <LinearGradient
                colors={["rgba(33, 150, 243, 0.1)", "rgba(33, 150, 243, 0.05)"]}
                style={styles.statIconBg}
              >
                <MaterialIcons name="inventory" size={16} color="#2196F3" />
              </LinearGradient>
              <Text style={styles.statText}>{productCount} Products</Text>
            </View>

            <View style={styles.statItem}>
              <LinearGradient
                colors={["rgba(233, 30, 99, 0.1)", "rgba(233, 30, 99, 0.05)"]}
                style={styles.statIconBg}
              >
                <MaterialIcons name="receipt-long" size={16} color="#E91E63" />
              </LinearGradient>
              <Text style={styles.statText}>{orderCount} Orders</Text>
            </View>
          </View>
        </View>

        <View style={styles.shopActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("ShopDetails", { shopId: item.id })
            }
          >
            <MaterialIcons name="store" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Manage Shop</Text>
          </TouchableOpacity>

          {item.verification_status !== "verified" && (
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() => navigation.navigate("Verification")}
            >
              <MaterialIcons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningButtonText}>Verify Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyShops = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={["rgba(100, 120, 200, 0.2)", "rgba(100, 120, 200, 0.1)"]}
        style={styles.emptyIconContainer}
      >
        <MaterialCommunityIcons name="store-off" size={60} color="#6478C8" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Shops Yet</Text>
      <Text style={styles.emptyText}>
        {searchQuery.trim()
          ? `No shops match "${searchQuery}"`
          : "Start your business by creating your first shop"}
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity
          style={styles.createShopButton}
          onPress={handleCreateShop}
        >
          <MaterialIcons
            name="add-business"
            size={20}
            color="#fff"
            style={styles.createButtonIcon}
          />
          <Text style={styles.createShopButtonText}>Create Shop</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Shops</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateShop}>
          <MaterialIcons name="add-circle" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your shops..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderShopItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyShops}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 10,
    fontFamily: FONTS.regular
  },
  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 4,
    fontFamily: FONTS.semiBold
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginLeft: 4,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verificationText: {
    fontSize: 12,
    marginLeft: 4,
    fontFamily: FONTS.semiBold
  },
  shopContent: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  shopDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
    fontFamily: FONTS.regular
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium
  },
  shopActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
    fontFamily: FONTS.semiBold
  },
  warningButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningButtonText: {
    fontSize: 14,
    color: "#FF9800",
    marginLeft: 8,
    fontFamily: FONTS.semiBold
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(100, 120, 200, 0.1)",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 8,
    fontFamily: FONTS.bold
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: FONTS.regular
  },
  createShopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonIcon: {
    marginRight: 8,
  },
  createShopButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FONTS.semiBold
  },
  listContainer: {
    padding: 16,
  },
});

export default ShopsScreen;
