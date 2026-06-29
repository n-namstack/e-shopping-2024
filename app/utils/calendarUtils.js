import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";

export async function requestCalendarPermission() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

async function getDefaultCalendarId() {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT
  );

  if (Platform.OS === "ios") {
    const cal =
      calendars.find((c) => c.allowsModifications && c.type === "local") ||
      calendars.find((c) => c.allowsModifications);
    return cal?.id;
  }

  const cal =
    calendars.find((c) => c.isPrimary && c.allowsModifications) ||
    calendars.find((c) => c.allowsModifications);
  return cal?.id;
}

export async function addBookingToCalendar({
  serviceName,
  providerName,
  location,
  bookingDate,
  startTime,
  endTime,
  notes,
}) {
  try {
    const granted = await requestCalendarPermission();
    if (!granted) {
      Alert.alert(
        "Calendar Access Required",
        "Please enable calendar access in your device Settings to add this appointment.",
        [{ text: "OK" }]
      );
      return null;
    }

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert(
        "No Calendar Found",
        "Could not find a writable calendar on your device."
      );
      return null;
    }

    const [year, month, day] = bookingDate.split("-").map(Number);
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startDate = new Date(year, month - 1, day, startH, startM, 0);
    const endDate = new Date(year, month - 1, day, endH, endM, 0);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `${serviceName} at ${providerName}`,
      location: location || "",
      notes: notes ? `Notes: ${notes}` : "",
      startDate,
      endDate,
      alarms: [{ relativeOffset: -60 }],
      timeZone: "local",
    });

    return eventId;
  } catch (error) {
    console.error("Calendar error:", error);
    Alert.alert(
      "Calendar Error",
      "Could not add the appointment to your calendar. Please try again."
    );
    return null;
  }
}
