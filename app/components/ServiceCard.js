import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { FONTS } from "../constants/theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export default function ServiceCard({ service, onPress, providerName, style }) {
  const { colors } = useTheme();

  const formatPrice = (price) =>
    `N$${Number(price).toLocaleString("en-NA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.imageContainer}>
        {service.image_url ? (
          <Image
            source={{ uri: service.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: colors.border },
            ]}
          >
            <Ionicons name="cut-outline" size={32} color={colors.text + "40"} />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={10} color="#fff" />
          <Text style={styles.durationText}>
            {formatDuration(service.duration_minutes)}
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.text }]}
          numberOfLines={2}
        >
          {service.name}
        </Text>

        {providerName ? (
          <Text
            style={[styles.provider, { color: colors.text + "70" }]}
            numberOfLines={1}
          >
            @ {providerName}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(service.price)}</Text>
          <View style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>Book</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  info: {
    padding: 10,
    gap: 3,
  },
  name: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    lineHeight: 18,
  },
  provider: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#6366F1",
  },
  bookBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },
});
