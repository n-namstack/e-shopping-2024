import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { FONTS } from "../constants/theme";

export default function ServiceProviderCard({ provider, onPress }) {
  const { colors } = useTheme();

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= r ? "star" : "star-outline"}
          size={11}
          color={i <= r ? "#F59E0B" : colors.text + "40"}
        />
      );
    }
    return stars;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {provider.banner_url ? (
        <Image
          source={{ uri: provider.banner_url }}
          style={styles.banner}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.bannerPlaceholder, { backgroundColor: "#312E81" }]}>
          <Ionicons name="business-outline" size={28} color="rgba(255,255,255,0.4)" />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.logoRow}>
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
          <View style={styles.metaCol}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {provider.business_name}
            </Text>
            <Text
              style={[styles.category, { color: "#6366F1" }]}
              numberOfLines={1}
            >
              {provider.category}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.text + "40"}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.stars}>{renderStars(provider.rating)}</View>
          <Text style={[styles.ratingText, { color: colors.text + "80" }]}>
            {provider.rating
              ? `${Number(provider.rating).toFixed(1)} (${provider.total_reviews})`
              : "No reviews yet"}
          </Text>
          {provider.location ? (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.text + "60"}
              />
              <Text
                style={[styles.location, { color: colors.text + "60" }]}
                numberOfLines={1}
              >
                {provider.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  banner: {
    width: "100%",
    height: 80,
  },
  bannerPlaceholder: {
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 12,
    gap: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  logoPlaceholder: {
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: {
    color: "#fff",
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  category: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
  },
  location: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    maxWidth: 120,
  },
});
