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
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  FontAwesome5,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS, SIZES, SHADOWS } from "../../constants/theme";
import { compressImage } from "../../utils/imageHelpers";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

const ShopDetailsScreen = ({ navigation, route }) => {
  const { shopId } = route.params;
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop] = useState(null);
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  const [stats, setStats] = useState({
    productCount: 0,
    orderCount: 0,
    pendingOrders: 0,
    totalSales: 0,
  });

  useEffect(() => {
    fetchShopDetails();
  }, []);

  const fetchShopDetails = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert("Error", "Shop not found");
        navigation.goBack();
        return;
      }

      setShop(data);

      // Fetch shop statistics
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
      // Fetch product count
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("count")
        .eq("shop_id", id);

      if (productError) throw productError;

      // Fetch order count
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("count")
        .eq("shop_id", id);

      if (orderError) throw orderError;

      // Fetch pending orders count
      const { data: pendingOrderData, error: pendingOrderError } =
        await supabase
          .from("orders")
          .select("count")
          .eq("shop_id", id)
          .in("status", ["pending", "processing"]);

      if (pendingOrderError) throw pendingOrderError;

      // Fetch total sales
      const { data: salesData, error: salesError } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("shop_id", id)
        .eq("status", "delivered");

      if (salesError) throw salesError;

      const totalSales = salesData.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      );

      setStats({
        productCount: productData[0]?.count || 0,
        orderCount: orderData[0]?.count || 0,
        pendingOrders: pendingOrderData[0]?.count || 0,
        totalSales,
      });
    } catch (error) {
      console.error("Error fetching shop statistics:", error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopDetails();
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to upload images."
      );
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
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

      // Compress the image before upload
      const compressedUri = await compressImage(uri);

      const response = await fetch(compressedUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error("Selected image is empty or invalid");
      }

      const fileExt = uri.split(".").pop();
      const fileName = `${shopId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `shops/${fileName}`;

      // Upload to Supabase
      const { error } = await supabase.storage
        .from("shop-images")
        .upload(filePath, arrayBuffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        if (error.message.includes("Payload too large")) {
          throw new Error(
            "Image is too large. Please select a smaller image (max 5MB)"
          );
        }
        throw error;
      }

      // Get public URL
      const { data } = supabase.storage
        .from("shop-images")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get image URL");
      }

      const imageUrl = data.publicUrl;

      // Update shop with the new image URL
      const updateData =
        type === "logo" ? { logo_url: imageUrl } : { banner_url: imageUrl };

      const { error: updateError } = await supabase
        .from("shops")
        .update(updateData)
        .eq("id", shopId);

      if (updateError) {
        throw new Error("Failed to update shop with new image");
      }

      // Update local state
      setShop((prev) => ({ ...prev, ...updateData }));

      Alert.alert("Success", `Shop ${type} updated successfully`);
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Error",
        error.message || `Failed to update shop ${type}. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = () => {
    navigation.navigate("Verification", { shopId });
  };

  const handleEditShop = () => {
    // Navigate to edit shop screen
    // This would be implemented in a future update
    Alert.alert(
      "Coming Soon",
      "Shop editing will be available in the next update"
    );
  };

  const formatCurrency = (amount) => {
    return (
      "N$" +
      parseFloat(amount)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  const renderShopInfo = () => (
    <View
      style={[
        styles.shopInfoSection,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.shopNameRow}>
        <Text style={[styles.shopName, { color: colors.text }]}>
          {shop.name}
        </Text>
        <View
          style={[
            styles.verificationBadge,
            {
              backgroundColor:
                shop.verification_status === "verified"
                  ? "rgba(76, 175, 80, 0.1)"
                  : shop.verification_status === "pending"
                  ? "rgba(255, 152, 0, 0.1)"
                  : "rgba(158, 158, 158, 0.1)",
            },
          ]}
        >
          {shop.verification_status === "verified" ? (
            <>
              <MaterialIcons name="verified" size={16} color="#4CAF50" />
              <Text style={[styles.verificationText, { color: "#4CAF50" }]}>
                Verified
              </Text>
            </>
          ) : shop.verification_status === "pending" ? (
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

      {shop.location && (
        <View style={styles.locationRow}>
          <View>
            <View style={{ flexDirection: "row" }}>
              <Ionicons name="location-outline" size={16} color={colors.text} />
              <Text style={[styles.locationText, { color: colors.text }]}>
                {shop.location}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.actionLocationCard,
                { backgroundColor: colors.card },
              ]}
              onPress={() =>
                navigation.navigate("ShopsTab", {
                  screen: "ShopLocation",
                  params: { shopId: shop.id },
                })
              }
            >
              <LinearGradient
                colors={["#4CAF50", "#2d3436"]}
                style={styles.actionIconContainer}
              >
                <MaterialIcons
                  name="add-location"
                  size={20}
                  color={colors.text}
                />
              </LinearGradient>
              <Text style={[styles.actionText, { color: colors.text }]}>
                Add/Get shop Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={[styles.shopDescription, { color: colors.text }]}>
        {shop.description || "No description provided for this shop."}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading shop details...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Shop Banner */}
      <View style={styles.bannerContainer}>
        {shop.banner_url ? (
          <Image source={{ uri: shop.banner_url }} style={styles.banner} />
        ) : (
          <LinearGradient
            colors={["#4c669f", "#3b5998", "#192f6a"]}
            style={styles.banner}
          >
            <MaterialCommunityIcons
              name="storefront"
              size={50}
              color="rgba(255,255,255,0.8)"
            />
          </LinearGradient>
        )}

        <TouchableOpacity
          style={styles.changeBannerButton}
          onPress={async () => {
            if (await requestMediaLibraryPermission()) {
              handleSelectImage("banner");
            }
          }}
        >
          <MaterialIcons name="photo-camera" size={18} color="#FFF" />
        </TouchableOpacity>

        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent"]}
          style={styles.headerGradient}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={handleEditShop}>
            <MaterialIcons name="edit" size={22} color="#FFF" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.logoContainer}>
          {shop.logo_url ? (
            <Image source={{ uri: shop.logo_url }} style={styles.logo} />
          ) : (
            <LinearGradient colors={["#ff9966", "#ff5e62"]} style={styles.logo}>
              <Text style={styles.logoText}>
                {shop.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <TouchableOpacity
            style={styles.changeLogoButton}
            onPress={async () => {
              if (await requestMediaLibraryPermission()) {
                handleSelectImage("logo");
              }
            }}
          >
            <MaterialIcons name="photo-camera" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderShopInfo()}

        {/* Shop Statistics Section */}
        <View
          style={[styles.sectionContainer, { backgroundColor: colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="analytics" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Shop Performance
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <LinearGradient
              colors={["rgba(33, 150, 243, 0.1)", "rgba(33, 150, 243, 0.05)"]}
              style={[
                styles.statCard,
                { borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(33, 150, 243, 0.2)" },
                ]}
              >
                <MaterialIcons name="inventory" size={22} color="#2196F3" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.productCount}
              </Text>
              <Text style={styles.statLabel}>Products</Text>
            </LinearGradient>

            <LinearGradient
              colors={["rgba(233, 30, 99, 0.1)", "rgba(233, 30, 99, 0.05)"]}
              style={[
                styles.statCard,
                { borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(233, 30, 99, 0.2)" },
                ]}
              >
                <MaterialIcons name="receipt-long" size={22} color="#E91E63" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.orderCount}
              </Text>
              <Text style={styles.statLabel}>Orders</Text>
            </LinearGradient>

            <LinearGradient
              colors={["rgba(76, 175, 80, 0.1)", "rgba(76, 175, 80, 0.05)"]}
              style={[
                styles.statCard,
                { borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(76, 175, 80, 0.2)" },
                ]}
              >
                <MaterialIcons name="attach-money" size={22} color="#4CAF50" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(stats.totalSales)}
              </Text>
              <Text style={styles.statLabel}>Sales</Text>
            </LinearGradient>

            <LinearGradient
              colors={["rgba(255, 152, 0, 0.1)", "rgba(255, 152, 0, 0.05)"]}
              style={[
                styles.statCard,
                { borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: "rgba(255, 152, 0, 0.2)" },
                ]}
              >
                <MaterialIcons
                  name="pending-actions"
                  size={22}
                  color="#FF9800"
                />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.pendingOrders}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View
          style={[styles.sectionContainer, { backgroundColor: colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="bolt" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Quick Actions
            </Text>
          </View>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() =>
                navigation.navigate("ProductsTab", {
                  screen: "AddProduct",
                  params: { shopId: shop.id },
                })
              }
            >
              <LinearGradient
                colors={["#4CAF50", "#388E3C"]}
                style={styles.actionIconContainer}
              >
                <MaterialIcons
                  name="add-shopping-cart"
                  size={20}
                  color={colors.text}
                />
              </LinearGradient>
              <Text style={[styles.actionText, { color: colors.text }]}>
                Add Product
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() =>
                navigation.navigate("ProductsTab", {
                  screen: "Products",
                  params: {
                    shopId: shop.id,
                    fromShop: true,
                  },
                })
              }
            >
              <LinearGradient
                colors={["#2196F3", "#1976D2"]}
                style={styles.actionIconContainer}
              >
                <MaterialIcons name="category" size={20} color={colors.text} />
              </LinearGradient>
              <Text style={[styles.actionText, { color: colors.text }]}>
                View Products
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() =>
                navigation.navigate("OrdersTab", {
                  screen: "Orders",
                  params: {
                    shopId: shop.id,
                    fromShop: true,
                  },
                })
              }
            >
              <LinearGradient
                colors={["#E91E63", "#C2185B"]}
                style={styles.actionIconContainer}
              >
                <MaterialIcons name="receipt" size={20} color={colors.text} />
              </LinearGradient>
              <Text style={[styles.actionText, { color: colors.text }]}>
                View Orders
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() =>
                navigation.navigate("DashboardTab", {
                  screen: "Analytics",
                  params: { shopId: shop.id },
                })
              }
            >
              <LinearGradient
                colors={["#9C27B0", "#7B1FA2"]}
                style={styles.actionIconContainer}
              >
                <MaterialIcons name="insights" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.actionText, { color: colors.text }]}>
                Analytics
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Information */}
        <View
          style={[styles.sectionContainer, { backgroundColor: colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="contact-mail"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Contact Information
            </Text>
          </View>

          <View style={styles.contactInfo}>
            {shop.email && (
              <View style={styles.contactRow}>
                <View style={styles.contactIconContainer}>
                  <MaterialIcons
                    name="email"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {shop.email}
                </Text>
              </View>
            )}

            {shop.phone && (
              <View style={styles.contactRow}>
                <View style={styles.contactIconContainer}>
                  <MaterialIcons
                    name="phone"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {shop.phone}
                </Text>
              </View>
            )}

            {shop.location && (
              <View style={styles.contactRow}>
                <View style={styles.contactIconContainer}>
                  <MaterialIcons
                    name="location-on"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {shop.location}
                </Text>
              </View>
            )}

            <View style={styles.contactRow}>
              <View style={styles.contactIconContainer}>
                <MaterialIcons
                  name="date-range"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.contactText, { color: colors.text }]}>
                Created on{" "}
                {new Date(shop.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Extra space at bottom for better scrolling */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#F8F9FA",
    backgroundColor: COLORS.white,
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
  },
  bannerContainer: {
    position: "relative",
    height: 200,
    width: "100%",
  },
  banner: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    position: "absolute",
    bottom: -40,
    left: 20,
    zIndex: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    ...Platform.select({
      android: {
        elevation: 4,
      },
    }),
  },
  logoText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  changeBannerButton: {
    position: "absolute",
    right: 15,
    bottom: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changeLogoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  shopInfoSection: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shopName: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    marginLeft: 4,
    fontFamily: FONTS.semiBold,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontFamily: FONTS.regular,
  },
  shopDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 15,
    fontFamily: FONTS.regular,
  },
  sectionContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginTop: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 8,
    fontFamily: FONTS.semiBold,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: "flex-start",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  actionLocationCard: {
    // width: "75%",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 6,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  actionText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  contactInfo: {
    marginTop: 5,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  contactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: FONTS.regular,
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 4,
  },
});

export default ShopDetailsScreen;
