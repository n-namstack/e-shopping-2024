import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS } from "../../constants/theme";
import BannerCarousel from "../../components/ui/BannerCarousel";
import DynamicBanners from "../../components/ui/DynamicBanners";
import PersonalizedFeed from "../../components/PersonalizedFeed";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";

const HomeScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [topShops, setTopShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    fetchInitialData();
    if (user) {
      fetchUserProfile();
      fetchNotifications();
    }
  }, [user]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchTopShops(),
      ]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setNotifications(data || []);
      
      // Count unread notifications
      const unread = data?.filter(notification => !notification.read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
        
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTopShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select(
          `
          id, 
          name, 
          logo_url,
          followers:shop_follows(count)
        `
        )
        .limit(10);
        
      if (error) throw error;
      
      // Process the data to get follower counts
      const shopsWithFollowers = data.map((shop) => ({
        ...shop,
        followers_count: shop.followers?.[0]?.count || 0,
      }));
      
      // Sort shops by follower count (highest first)
      shopsWithFollowers.sort((a, b) => b.followers_count - a.followers_count);
      
      // Fetch ratings for each shop
      const shopsWithRatings = await Promise.all(
        shopsWithFollowers.map(async (shop) => {
          try {
            // Fetch shop ratings
            const { data: ratingsData, error: ratingsError } = await supabase
              .from("shop_ratings")
              .select("rating")
              .eq("shop_id", shop.id);

            if (ratingsError) throw ratingsError;

            // Calculate average rating
            if (ratingsData && ratingsData.length > 0) {
              const totalRatings = ratingsData.length;
              const avgRating = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings;
              return {
                ...shop,
                rating: avgRating,
                ratings_count: totalRatings
              };
            }
            
            return shop;
          } catch (error) {
            console.error(`Error fetching ratings for shop ${shop.id}:`, error);
            return shop;
          }
        })
      );
      
      setTopShops(shopsWithRatings);
    } catch (error) {
      console.error("Error fetching top shops:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    if (user) {
      await fetchUserProfile();
      await fetchNotifications();
    }
    setRefreshing(false);
  };

  const navigateToCategory = (category) => {
    navigation.navigate("BrowseProducts", { category: category.name });
  };

  const navigateToShop = (shop) => {
    navigation.navigate("ShopDetails", { shopId: shop.id, shopName: shop.name });
  };

  const navigateToNotifications = () => {
    navigation.navigate("Notifications");
  };

  const navigateToSearch = () => {
    navigation.navigate("BrowseProducts");
  };

  const renderGreeting = () => {
    const hour = new Date().getHours();
    let greeting = "Good morning";
    
    if (hour >= 12 && hour < 18) {
      greeting = "Good afternoon";
    } else if (hour >= 18) {
      greeting = "Good evening";
    }
    
    return (
      <Text style={styles.greeting}>
        {greeting}, {profile?.firstname || user?.email?.split("@")[0] || "Shopper"}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user && renderGreeting()}
          <Text style={styles.headerTitle}>Discover amazing products</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={navigateToSearch}
          >
            <Ionicons name="search" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          
          {user && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={navigateToNotifications}
            >
              <Ionicons name="notifications" size={24} color={COLORS.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Banner Carousel */}
        <BannerCarousel />
        
        {/* Personalized Feed */}
        <PersonalizedFeed navigation={navigation} />
        
        {/* Categories */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => navigation.navigate("BrowseProducts")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => navigateToCategory(category)}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons
                    name={category.icon || "grid-outline"}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Top Shops */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Shops</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Shops")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shopsContainer}
          >
            {topShops.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={styles.shopCard}
                onPress={() => navigateToShop(shop)}
              >
                <Image
                  source={{
                    uri: shop.logo_url || "https://via.placeholder.com/100",
                  }}
                  style={styles.shopLogo}
                />
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <View style={styles.shopStats}>
                  <Ionicons name="people" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.shopStatsText}>
                    {shop.followers_count || 0}
                  </Text>
                </View>
                <View style={styles.shopStats}>
                  <Ionicons name="star" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.shopStatsText}>
                    {shop.rating?.toFixed(1) || "0.0"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Dynamic Banners */}
        <DynamicBanners />
        
        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  categoriesContainer: {
    paddingHorizontal: 12,
  },
  categoryCard: {
    width: 80,
    alignItems: "center",
    marginHorizontal: 4,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  shopsContainer: {
    paddingHorizontal: 12,
  },
  shopCard: {
    width: 100,
    alignItems: "center",
    marginHorizontal: 4,
  },
  shopLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
  },
  shopName: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  shopStats: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  shopStatsText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default HomeScreen;
