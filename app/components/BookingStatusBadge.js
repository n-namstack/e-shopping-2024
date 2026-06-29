import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../constants/theme";

const STATUS_CONFIG = {
  pending: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    label: "Pending",
    icon: "time-outline",
  },
  confirmed: {
    color: "#6366F1",
    bg: "rgba(99,102,241,0.12)",
    label: "Confirmed",
    icon: "checkmark-circle-outline",
  },
  cancelled: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    label: "Cancelled",
    icon: "close-circle-outline",
  },
  completed: {
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    label: "Completed",
    icon: "checkmark-done-outline",
  },
};

export default function BookingStatusBadge({ status, size = "md" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Ionicons
        name={config.icon}
        size={isSmall ? 10 : 12}
        color={config.color}
      />
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  labelSmall: {
    fontSize: 10,
  },
});
