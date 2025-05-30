import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS } from "../../constants/theme";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold
} from "@expo-google-fonts/poppins";

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, refreshSession } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold,Poppins_500Medium ,Poppins_600SemiBold});



  useEffect(() => {
    fetchProfileAndShopInfo();
    checkVerificationStatus();
  }, []);

  const fetchProfileAndShopInfo = async () => {
    try {
      setIsLoading(true);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // If user is a seller, fetch shop data
      if (profileData.role === "seller") {
        const { data: shopData, error: shopError } = await supabase
          .from("shops")
          .select("*")
          .eq("owner_id", user.id)
          .single();

        if (!shopError) {
          setShopInfo(shopData);
          
          // Fetch shop stats for product counts
          if (shopData?.id) {
            const { data: shopStats, error: statsError } = await supabase
              .from("seller_stats")
              .select("*")
              .eq("shop_id", shopData.id)
              .single();
              
            if (!statsError && shopStats) {
              // Get product count from seller_stats
              const { data: productCount, error: productError } = await supabase
                .from("products")
                .select("id", { count: 'exact' })
                .eq("shop_id", shopData.id);
                
              setStats({
                total: productCount?.length || 0,
                ...shopStats
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile and shop info:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('seller_verifications')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setVerificationStatus(data?.status || 'unverified');
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Error signing out:", error.message);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchToBuyer = async () => {
    Alert.alert(
      "Switch to Buyer",
      "Are you sure you want to switch to Buyer mode?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Switch",
          onPress: async () => {
            try {
              setIsLoading(true);
              // Update the user's role to buyer in the profiles table
              const { error } = await supabase
                .from("profiles")
                .update({ role: "buyer" })
                .eq("id", user.id);

              if (error) throw error;

              // Update the user metadata as well
              const { error: metadataError } = await supabase.auth.updateUser({
                data: { role: "buyer" },
              });

              if (metadataError) throw metadataError;

              // Refresh session to get updated user data
              await refreshSession();

              // Alert user of success
              Alert.alert("Success", "You are now in Buyer mode", [
                {
                  text: "OK",
                  onPress: () => {
                    // Navigate to the BuyerNavigator
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "Buyer" }],
                    });
                  },
                },
              ]);
            } catch (error) {
              console.error("Error switching to buyer:", error.message);
              Alert.alert("Error", "Failed to switch to Buyer mode");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchToSeller = async () => {
    // Check if the user already has a seller profile
    try {
      const { data: existingShop, error: shopCheckError } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id);

      if (shopCheckError) throw shopCheckError;

      if (existingShop && existingShop.length > 0) {
        // User already has a shop, just switch roles
        switchToSellerRole();
      } else {
        // User needs to create a shop first
        // First switch to seller role
        await switchToSellerRole();
        // Then navigate to CreateShop screen
        navigation.reset({
          index: 0,
          routes: [
            { 
              name: "Seller",
              state: {
                routes: [
                  { name: "ShopsTab" },
                  { 
                    name: "Shops",
                    state: {
                      routes: [{ name: "CreateShop" }]
                    }
                  }
                ]
              }
            }
          ]
        });
      }
    } catch (error) {
      console.error("Error checking shop existence:", error.message);
      Alert.alert("Error", "Failed to check seller status");
    }
  };

  const switchToSellerRole = async () => {
    try {
      setIsLoading(true);
      // Update the user's role to seller in the profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ role: "seller" })
        .eq("id", user.id);

      if (error) throw error;

      // Update the user metadata as well
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role: "seller" },
      });

      if (metadataError) throw metadataError;

      // Refresh session to get updated user data
      await refreshSession();

      // Alert user of success
      Alert.alert("Success", "You are now in Seller mode", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to the SellerNavigator
            navigation.reset({
              index: 0,
              routes: [{ name: "Seller" }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Error switching to seller:", error.message);
      Alert.alert("Error", "Failed to switch to Seller mode");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleMyOrders = () => {
    // For both buyer and seller, navigate to their respective Orders screen
    if (profile?.role === "seller") {
      navigation.navigate("OrdersTab", { screen: "Orders" });
    } else {
      navigation.navigate("OrdersTab", { screen: "Orders" });
    }
  };

  const handleShippingAddress = () => {
    navigation.navigate("ShippingAddress");
  };

  const handlePaymentMethods = () => {
    navigation.navigate("PaymentMethods");
  };

  const renderSettingItem = ({
    icon,
    title,
    value,
    onPress,
    isSwitch = false,
    tintColor,
    badge
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={isSwitch ? null : onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, tintColor && { backgroundColor: `${tintColor}15` }]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={tintColor || COLORS.primary} 
          />
        </View>
        <Text style={styles.settingText}>{title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: "#d1d5db", true: `${COLORS.primary}50` }}
          thumbColor={value ? COLORS.primary : "#f3f4f6"}
          ios_backgroundColor="#d1d5db"
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {profile?.role === "seller" ? "Seller Profile" : "My Profile"}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.userInfoSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageWrapper}>
              <View style={styles.profileImageContainer}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.profileImage, styles.defaultProfileImage]}>
                    <Text style={styles.defaultProfileImageText}>
                      {profile?.full_name?.charAt(0) ||
                        user?.email?.charAt(0) ||
                        (profile?.role === "seller" ? "S" : "U")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.name}>
                {profile?.full_name ||
                  (profile?.firstname && profile?.lastname 
                    ? `${profile.firstname} ${profile.lastname}` 
                    : "User")}
              </Text>
              <Text style={styles.email}>{user?.email}</Text>
              
              {shopInfo && profile?.role === "seller" && (
                <View style={styles.shopBadge}>
                  <Ionicons name="storefront" size={14} color="#fff" />
                  <Text style={styles.shopName}>{shopInfo.name}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
              
              {/* Verification Badge - Repositioned */}
              {profile?.role === "seller" && (
                <View style={styles.verificationBadge}>
                  {verificationStatus === 'verified' ? (
                    <View style={styles.verifiedBadgeContainer}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  ) : verificationStatus === 'pending' ? (
                    <View style={styles.pendingBadgeContainer}>
                      <LinearGradient
                        colors={['#FF9500', '#FF7A00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.pendingBadgeGradient}
                      >
                        <Ionicons name="time-outline" size={14} color="#fff" />
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                        <View style={styles.pendingDot}></View>
                      </LinearGradient>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.verifyButtonModern}
                      onPress={() => navigation.navigate('Verification')}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#fff" />
                      <Text style={styles.verifyButtonTextModern}>Verify</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        {profile?.role === "buyer" && (
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={handleMyOrders}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="bag-handle" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionText}>Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={handleShippingAddress}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="location" size={22} color="#f97316" />
              </View>
              <Text style={styles.quickActionText}>Address</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={handlePaymentMethods}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="card" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.quickActionText}>Payment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => navigation.navigate("ProfileTab", { screen: "Wishlist" })}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="heart" size={22} color="#ef4444" />
              </View>
              <Text style={styles.quickActionText}>Wishlist</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Common Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.cardContainer}>
            {profile?.role === "buyer" && renderSettingItem({
              icon: "person",
              title: "Personal Information",
              onPress: () => navigation.navigate("EditProfile"),
              tintColor: "#0ea5e9"
            })}
            {renderSettingItem({
              icon: "cart",
              title: "My Orders",
              onPress: handleMyOrders,
              tintColor: "#8b5cf6"
            })}
            {renderSettingItem({
              icon: "location",
              title: "Shipping Address",
              onPress: handleShippingAddress,
              tintColor: "#f97316"
            })}
            {renderSettingItem({
              icon: "card",
              title: "Payment Methods",
              onPress: handlePaymentMethods,
              tintColor: "#10b981"
            })}
          </View>
        </View>

        {/* Role Switching Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Type</Text>
          <View style={styles.cardContainer}>
            {profile?.role === "buyer"
              ? renderSettingItem({
                  icon: "storefront",
                  title: "Become a Seller",
                  onPress: handleSwitchToSeller,
                  tintColor: "#f59e0b"
                })
              : renderSettingItem({
                  icon: "person",
                  title: "Switch to Buyer Mode",
                  onPress: handleSwitchToBuyer,
                  tintColor: "#3b82f6"
                })}
          </View>
        </View>

        {/* Seller-Specific Section */}
        {profile?.role === "seller" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Management</Text>
            <View style={styles.cardContainer}>
              {renderSettingItem({
                icon: "storefront",
                title: "Manage Shop",
                onPress: () =>
                  navigation.navigate("ShopsTab", { screen: "ShopDetails" }),
                tintColor: "#0ea5e9"
              })}
              {renderSettingItem({
                icon: "cube",
                title: "Products",
                onPress: () =>
                  navigation.navigate("ProductsTab", { screen: "Products" }),
                tintColor: "#f59e0b",
                badge: stats ? stats.total : null
              })}
              {renderSettingItem({
                icon: "list",
                title: "Orders",
                onPress: () =>
                  navigation.navigate("OrdersTab", { screen: "Orders" }),
                tintColor: "#8b5cf6"
              })}
              {renderSettingItem({
                icon: "analytics",
                title: "Analytics",
                onPress: () =>
                  navigation.navigate("AnalyticsTab", { screen: "Analytics" }),
                tintColor: "#10b981"
              })}
              {renderSettingItem({
                icon: "card",
                title: "Bank Details",
                onPress: () =>
                  navigation.navigate("ProfileTab", { screen: "BankDetails" }),
                tintColor: "#14b8a6"
              })}
            </View>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.cardContainer}>
            {renderSettingItem({
              icon: "notifications",
              title: "Notifications",
              value: notificationsEnabled,
              onPress: () => setNotificationsEnabled(!notificationsEnabled),
              isSwitch: true,
              tintColor: "#f43f5e"
            })}
            {renderSettingItem({
              icon: "moon",
              title: "Dark Mode",
              value: darkMode,
              onPress: () => setDarkMode(!darkMode),
              isSwitch: true,
              tintColor: "#6366f1"
            })}
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.cardContainer}>
            {renderSettingItem({
              icon: "help-circle",
              title: "Help Center",
              onPress: () => navigation.navigate("HelpCenter"),
              tintColor: "#0ea5e9"
            })}
            {renderSettingItem({
              icon: "document-text",
              title: "Terms & Privacy Policy",
              onPress: () => navigation.navigate("TermsPrivacy"),
              tintColor: "#6366f1"
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    color: COLORS.primary,
    fontFamily: FONTS.bold
  },
  content: {
    flex: 1,
  },
  userInfoSection: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImageContainer: {
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f1f5f9",
    borderWidth: 3,
    borderColor: "#fff",
  },
  defaultProfileImage: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  defaultProfileImageText: {
    color: "#fff",
    fontSize: 40,
    textTransform: "uppercase",
    fontFamily: FONTS.bold
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontFamily: FONTS.regular
  },
  shopBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  shopName: {
    color: "#fff",
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginLeft: 5,
  },
  editProfileButton: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  editProfileText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  quickActionItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    marginBottom: 16,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#fff",
    fontFamily: FONTS.medium
  },
  versionContainer: {
    padding: 20,
    alignItems: "center",
  },
  versionText: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 30,
    fontFamily: FONTS.regular
  },
  verificationBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  verifiedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#fff',
    marginLeft: 4,
  },
  pendingBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#FF9500",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  pendingBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#fff',
    marginLeft: 5,
    marginRight: 8,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    opacity: 0.9,
  },
  verifyButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  verifyButtonTextModern: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#fff',
    marginLeft: 4,
  },
});

export default ProfileScreen;
