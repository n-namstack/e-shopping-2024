import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import useBookingStore from "../../store/bookingStore";
import { FONTS } from "../../constants/theme";

const DAYS = [
  { label: "Sunday",    short: "Sun", dow: 0 },
  { label: "Monday",   short: "Mon", dow: 1 },
  { label: "Tuesday",  short: "Tue", dow: 2 },
  { label: "Wednesday",short: "Wed", dow: 3 },
  { label: "Thursday", short: "Thu", dow: 4 },
  { label: "Friday",   short: "Fri", dow: 5 },
  { label: "Saturday", short: "Sat", dow: 6 },
];

const DEFAULT_START = "08:00";
const DEFAULT_END = "17:00";

function buildHours() {
  const hours = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hStr = h.toString().padStart(2, "0");
      const mStr = m.toString().padStart(2, "0");
      hours.push(`${hStr}:${mStr}`);
    }
  }
  return hours;
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
}

const HOURS = buildHours();

function TimePicker({ value, onChange, colors }) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={[
          styles.timeTrigger,
          { backgroundColor: colors.card, borderColor: open ? "#6366F1" : colors.border },
        ]}
      >
        <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(value)}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.text + "60"} />
      </TouchableOpacity>
      {open && (
        <View
          style={[
            styles.dropdownList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => {
                  onChange(h);
                  setOpen(false);
                }}
                style={[
                  styles.dropdownItem,
                  value === h && { backgroundColor: "rgba(99,102,241,0.1)" },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: value === h ? "#6366F1" : colors.text },
                    value === h && { fontFamily: FONTS.semiBold },
                  ]}
                >
                  {formatTime(h)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function ManageAvailabilityScreen({ navigation }) {
  const { colors } = useTheme();
  const { myProvider, myAvailability, fetchMyAvailability, saveAvailability } =
    useBookingStore();
  const [schedule, setSchedule] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadAvailability();
    }, [myProvider?.id])
  );

  async function loadAvailability() {
    if (!myProvider) { setLoading(false); return; }
    const data = await fetchMyAvailability(myProvider.id);
    const map = {};
    DAYS.forEach((d) => {
      const existing = data.find((a) => a.day_of_week === d.dow);
      map[d.dow] = {
        is_available: existing?.is_available ?? false,
        start_time: existing?.start_time?.slice(0, 5) ?? DEFAULT_START,
        end_time: existing?.end_time?.slice(0, 5) ?? DEFAULT_END,
      };
    });
    setSchedule(map);
    setLoading(false);
  }

  const updateDay = (dow, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dow]: { ...prev[dow], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!myProvider) return;

    // Validate all active days have start < end
    for (const day of DAYS) {
      const s = schedule[day.dow];
      if (s?.is_available && s.start_time >= s.end_time) {
        Alert.alert(
          "Invalid Time",
          `On ${day.label}, end time must be after start time.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const list = DAYS.map((d) => ({
        day_of_week: d.dow,
        is_available: schedule[d.dow]?.is_available ?? false,
        start_time: schedule[d.dow]?.start_time ?? DEFAULT_START,
        end_time: schedule[d.dow]?.end_time ?? DEFAULT_END,
      }));
      await saveAvailability(myProvider.id, list);
      Alert.alert("Saved", "Your availability has been updated.");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save availability.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.hint, { color: colors.text + "70" }]}>
          Set the days and hours you are available to accept bookings.
        </Text>

        {DAYS.map((day) => {
          const dayData = schedule[day.dow] || {
            is_available: false,
            start_time: DEFAULT_START,
            end_time: DEFAULT_END,
          };

          return (
            <View
              key={day.dow}
              style={[
                styles.dayCard,
                {
                  backgroundColor: colors.card,
                  borderColor: dayData.is_available ? "#6366F1" : colors.border,
                  borderWidth: dayData.is_available ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.dayHeader}>
                <View style={styles.dayLabel}>
                  <View
                    style={[
                      styles.dayBadge,
                      {
                        backgroundColor: dayData.is_available
                          ? "#6366F1"
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayShort,
                        { color: dayData.is_available ? "#fff" : colors.text + "60" },
                      ]}
                    >
                      {day.short}
                    </Text>
                  </View>
                  <Text style={[styles.dayName, { color: colors.text }]}>
                    {day.label}
                  </Text>
                </View>
                <Switch
                  value={dayData.is_available}
                  onValueChange={(v) => updateDay(day.dow, "is_available", v)}
                  trackColor={{ true: "#6366F1", false: colors.border }}
                  thumbColor="#fff"
                />
              </View>

              {dayData.is_available && (
                <View style={styles.timeRow}>
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeLabel, { color: colors.text + "70" }]}>
                      Opens
                    </Text>
                    <TimePicker
                      value={dayData.start_time}
                      onChange={(v) => updateDay(day.dow, "start_time", v)}
                      colors={colors}
                    />
                  </View>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.text + "50"}
                    style={{ marginTop: 28 }}
                  />
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeLabel, { color: colors.text + "70" }]}>
                      Closes
                    </Text>
                    <TimePicker
                      value={dayData.end_time}
                      onChange={(v) => updateDay(day.dow, "end_time", v)}
                      colors={colors}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <LinearGradient
            colors={["#4F46E5", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Availability</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: FONTS.bold },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  hint: { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 16, lineHeight: 20 },
  dayCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayShort: { fontSize: 12, fontFamily: FONTS.bold },
  dayName: { fontSize: 15, fontFamily: FONTS.semiBold },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
  },
  timeCol: { flex: 1 },
  timeLabel: { fontSize: 12, fontFamily: FONTS.medium, marginBottom: 6 },
  timeTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeValue: { fontSize: 14, fontFamily: FONTS.medium },
  dropdownList: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemText: { fontSize: 14, fontFamily: FONTS.regular },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: FONTS.bold },
});
