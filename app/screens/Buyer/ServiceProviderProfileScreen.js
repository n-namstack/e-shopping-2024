import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import ServiceCard from "../../components/ServiceCard";
import useBookingStore from "../../store/bookingStore";
import { FONTS } from "../../constants/theme";
import supabase from "../../lib/supabase";

const { width } = Dimensions.get("window");

export default function ServiceProviderProfileScreen({ route, navigation }) {
  const { providerId } = route.params;
  const { colors } = useTheme();
  const { fetchProviderById, fetchProviderServices, providerServices } =
    useBookingStore();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [providerId]);

  async function load() {
    setLoading(true);
    const [prov] = await Promise.all([
      fetchProviderById(providerId),
      fetchProviderServices(providerId),
    ]);
    setProvider(prov);

    const { data } = await supabase
      .from("service_reviews")
      .select("*, profiles!service_reviews_customer_id_fkey(full_name, avatar_url)")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(10);
    setReviews(data || []);
    setLoading(false);
  }

  const renderStars = (rating) =>
    [1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.round(rating) ? "star" : "star-outline"}
        size={14}
        color={i <= Math.round(rating) ? "#F59E0B" : colors.text + "40"}
      />
    ));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Provider not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {provider.banner_url ? (
            <Image
              source={{ uri: provider.banner_url }}
              style={styles.banner}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#312E81", "#4F46E5", "#7C3AED"]}
              style={styles.banner}
            >
              <Ionicons
                name="business-outline"
                size={48}
                color="rgba(255,255,255,0.3)"
              />
            </LinearGradient>
          )}
          {/* Back button */}
          <SafeAreaView style={styles.navBar} edges={["top"]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Body card */}
        <View
          style={[styles.bodyCard, { backgroundColor: colors.background }]}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            {provider.logo_url ? (
              <Image
                source={{ uri: provider.logo_url }}
                style={styles.logo}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={styles.logoInitial}>
                  {provider.business_name?.[0]?.toUpperCase() || "S"}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.businessName, { color: colors.text }]}>
            {provider.business_name}
          </Text>
          <Text style={[styles.category, { color: "#6366F1" }]}>
            {provider.category}
          </Text>

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {renderStars(provider.rating || 0)}
            </View>
            <Text style={[styles.ratingText, { color: colors.text + "80" }]}>
              {provider.rating
                ? `${Number(provider.rating).toFixed(1)} · ${provider.total_reviews} reviews`
                : "No reviews yet"}
            </Text>
          </View>

          {provider.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.text + "60"} />
              <Text style={[styles.locationText, { color: colors.text + "70" }]}>
                {provider.location}
              </Text>
            </View>
          ) : null}

          {provider.description ? (
            <Text style={[styles.description, { color: colors.text + "80" }]}>
              {provider.description}
            </Text>
          ) : null}

          {/* Services */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Services
          </Text>
          {providerServices.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.text + "60" }]}>
              No services listed yet.
            </Text>
          ) : (
            <View style={styles.servicesGrid}>
              {providerServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onPress={() =>
                    navigation.navigate("BookService", {
                      service,
                      provider,
                    })
                  }
                />
              ))}
            </View>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Reviews
              </Text>
              {reviews.map((review) => (
                <View
                  key={review.id}
                  style={[
                    styles.reviewCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewerName, { color: colors.text }]}>
                      {review.profiles?.full_name || "Customer"}
                    </Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name={i <= review.rating ? "star" : "star-outline"}
                          size={12}
                          color={i <= review.rating ? "#F59E0B" : colors.text + "40"}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment ? (
                    <Text style={[styles.reviewComment, { color: colors.text + "80" }]}>
                      {review.comment}
                    </Text>
                  ) : null}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { height: 220, position: "relative" },
  banner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  navBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyCard: {
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    minHeight: 400,
  },
  logoWrap: {
    marginTop: -58,
    marginBottom: 12,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#6366F1",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: { width: "100%", height: "100%" },
  logoPlaceholder: {
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: {
    color: "#fff",
    fontSize: 28,
    fontFamily: FONTS.bold,
  },
  businessName: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  stars: { flexDirection: "row", gap: 3 },
  ratingText: { fontSize: 13, fontFamily: FONTS.regular },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationText: { fontSize: 13, fontFamily: FONTS.regular },
  description: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginBottom: 14,
    marginTop: 8,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  emptyText: { fontSize: 14, fontFamily: FONTS.regular, marginBottom: 20 },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: { fontSize: 14, fontFamily: FONTS.semiBold },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 20 },
});
