import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import TimeSlotPicker, { generateTimeSlots } from "../../components/TimeSlotPicker";
import useBookingStore from "../../store/bookingStore";
import useAuthStore from "../../store/authStore";
import { addBookingToCalendar } from "../../utils/calendarUtils";
import { FONTS } from "../../constants/theme";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function buildNext14Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateKey(date) {
  return date.toISOString().split("T")[0];
}

export default function BookServiceScreen({ route, navigation }) {
  const { service, provider } = route.params;
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { createBooking, fetchProviderAvailability, getBookedSlots } = useBookingStore();

  const days = useMemo(() => buildNext14Days(), []);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [availability, setAvailability] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProviderAvailability(provider.id).then(setAvailability);
  }, [provider.id]);

  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    const dateKey = formatDateKey(selectedDate);
    getBookedSlots(provider.id, dateKey).then((slots) => {
      setBookedSlots(slots);
      setLoadingSlots(false);
    });
  }, [selectedDate]);

  const isDayAvailable = (date) => {
    const dow = date.getDay();
    return availability.some((a) => a.day_of_week === dow && a.is_available);
  };

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dow = selectedDate.getDay();
    const avail = availability.find((a) => a.day_of_week === dow && a.is_available);
    if (!avail) return [];
    return generateTimeSlots(
      avail.start_time.slice(0, 5),
      avail.end_time.slice(0, 5),
      service.duration_minutes,
      bookedSlots
    );
  }, [selectedDate, availability, bookedSlots]);

  const formatPrice = (p) =>
    `N$${Number(p).toLocaleString("en-NA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert("Incomplete", "Please select a date and time slot.");
      return;
    }
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to book a service.");
      return;
    }

    setSubmitting(true);
    try {
      const dateKey = formatDateKey(selectedDate);
      const booking = await createBooking(
        {
          service_id: service.id,
          provider_id: provider.id,
          customer_id: user.id,
          booking_date: dateKey,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          status: "pending",
          notes: notes.trim() || null,
        },
        provider.user_id
      );

      Alert.alert(
        "Booking Submitted! 🎉",
        "Your request has been sent to the provider. You will be notified once confirmed.",
        [
          {
            text: "Add to Calendar",
            onPress: async () => {
              await addBookingToCalendar({
                serviceName: service.name,
                providerName: provider.business_name,
                location: provider.location,
                bookingDate: dateKey,
                startTime: selectedSlot.start,
                endTime: selectedSlot.end,
                notes: notes.trim(),
              });
              navigation.navigate("MyBookings");
            },
          },
          {
            text: "Done",
            onPress: () => navigation.navigate("MyBookings"),
          },
        ]
      );
    } catch (e) {
      Alert.alert("Error", e.message || "Could not submit booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Book Service</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Service summary card */}
        <View style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {service.image_url ? (
            <Image source={{ uri: service.image_url }} style={styles.serviceImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.serviceImage}>
              <Ionicons name="cut-outline" size={32} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
            <Text style={[styles.providerName, { color: colors.text + "70" }]}>
              @ {provider.business_name}
            </Text>
            <View style={styles.serviceMetaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={13} color="#6366F1" />
                <Text style={styles.metaChipText}>{formatDuration(service.duration_minutes)}</Text>
              </View>
              <Text style={styles.price}>{formatPrice(service.price)}</Text>
            </View>
          </View>
        </View>

        {/* Date picker */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesRow}>
          {days.map((date) => {
            const available = isDayAvailable(date);
            const isSelected =
              selectedDate && formatDateKey(date) === formatDateKey(selectedDate);
            const isToday = formatDateKey(date) === formatDateKey(new Date());

            return (
              <TouchableOpacity
                key={formatDateKey(date)}
                disabled={!available}
                onPress={() => setSelectedDate(date)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isSelected
                      ? "#6366F1"
                      : colors.card,
                    borderColor: isSelected ? "#6366F1" : colors.border,
                    opacity: available ? 1 : 0.35,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : colors.text + "70" },
                  ]}
                >
                  {isToday ? "Today" : DAY_NAMES[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dateDayNum,
                    { color: isSelected ? "#fff" : colors.text },
                  ]}
                >
                  {date.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    { color: isSelected ? "rgba(255,255,255,0.7)" : colors.text + "60" },
                  ]}
                >
                  {date.toLocaleString("default", { month: "short" })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time slot picker */}
        {selectedDate && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Time
              <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: colors.text + "60" }}>
                {"  "}({FULL_DAY_NAMES[selectedDate.getDay()]})
              </Text>
            </Text>
            {loadingSlots ? (
              <ActivityIndicator color="#6366F1" style={{ marginVertical: 20 }} />
            ) : (
              <TimeSlotPicker
                slots={timeSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            )}
          </>
        )}

        {/* Notes */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notes (optional)
        </Text>
        <TextInput
          style={[
            styles.notesInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Any special requests or info for the provider..."
          placeholderTextColor={colors.text + "50"}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Summary */}
        {selectedDate && selectedSlot && (
          <View style={[styles.summaryCard, { backgroundColor: "rgba(99,102,241,0.08)", borderColor: "#6366F1" }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text + "70" }]}>Service</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{service.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text + "70" }]}>Date</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {selectedDate.toLocaleDateString("en-NA", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text + "70" }]}>Time</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {selectedSlot.start} – {selectedSlot.end}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text + "70" }]}>Price</Text>
              <Text style={[styles.summaryValue, { color: "#6366F1" }]}>
                {formatPrice(service.price)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={submitting || !selectedDate || !selectedSlot}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              !selectedDate || !selectedSlot
                ? ["#9CA3AF", "#9CA3AF"]
                : ["#4F46E5", "#7C3AED"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={20} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 18, fontFamily: FONTS.bold },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  serviceCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  serviceImage: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: { flex: 1, padding: 12, gap: 4 },
  serviceName: { fontSize: 16, fontFamily: FONTS.bold },
  providerName: { fontSize: 12, fontFamily: FONTS.regular },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(99,102,241,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: { fontSize: 12, fontFamily: FONTS.medium, color: "#6366F1" },
  price: { fontSize: 16, fontFamily: FONTS.bold, color: "#6366F1" },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 12,
    marginTop: 4,
  },
  datesRow: { marginBottom: 24 },
  dateChip: {
    width: 62,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    gap: 2,
  },
  dateDayName: { fontSize: 11, fontFamily: FONTS.regular },
  dateDayNum: { fontSize: 20, fontFamily: FONTS.bold },
  dateMonth: { fontSize: 11, fontFamily: FONTS.regular },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: FONTS.regular,
    minHeight: 100,
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 4 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13, fontFamily: FONTS.regular },
  summaryValue: { fontSize: 13, fontFamily: FONTS.semiBold },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});
