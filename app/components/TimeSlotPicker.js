import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { FONTS } from "../constants/theme";

export function generateTimeSlots(startTime, endTime, durationMinutes, bookedSlots = []) {
  const slots = [];
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toTimeStr = (mins) => {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  let cursor = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (cursor + durationMinutes <= end) {
    const slotStart = toTimeStr(cursor);
    const slotEnd = toTimeStr(cursor + durationMinutes);

    const isBooked = bookedSlots.some((b) => {
      const bStart = toMinutes(b.start_time.slice(0, 5));
      const bEnd = toMinutes(b.end_time.slice(0, 5));
      return !(
        toMinutes(slotEnd) <= bStart || toMinutes(slotStart) >= bEnd
      );
    });

    slots.push({ start: slotStart, end: slotEnd, isBooked });
    cursor += durationMinutes;
  }

  return slots;
}

export default function TimeSlotPicker({ slots, selectedSlot, onSelectSlot }) {
  const { colors } = useTheme();

  if (!slots || slots.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.text + "80" }]}>
        No available slots for this day.
      </Text>
    );
  }

  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <FlatList
      data={slots}
      keyExtractor={(item) => item.start}
      numColumns={3}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const isSelected = selectedSlot?.start === item.start;
        const isDisabled = item.isBooked;

        return (
          <TouchableOpacity
            onPress={() => !isDisabled && onSelectSlot(item)}
            disabled={isDisabled}
            style={[
              styles.slot,
              {
                backgroundColor: isSelected
                  ? "#6366F1"
                  : isDisabled
                  ? colors.border
                  : colors.card,
                borderColor: isSelected ? "#6366F1" : colors.border,
                opacity: isDisabled ? 0.45 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.slotText,
                {
                  color: isSelected ? "#fff" : isDisabled ? colors.text + "60" : colors.text,
                },
              ]}
            >
              {formatTime(item.start)}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    margin: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  slotText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  empty: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
    paddingVertical: 20,
  },
});
