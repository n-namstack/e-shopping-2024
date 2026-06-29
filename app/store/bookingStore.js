import { create } from "zustand";
import supabase from "../lib/supabase";
import { sendPushNotification } from "../services/PushNotificationService";

const useBookingStore = create((set, get) => ({
  myProvider: null,
  myServices: [],
  myAvailability: [],
  providerBookings: [],
  customerBookings: [],
  providers: [],
  providerServices: [],
  loading: false,
  error: null,

  // ── Provider profile ────────────────────────────────────────────────────────
  fetchMyProvider: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      set({ myProvider: data || null, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  createProvider: async (providerData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .insert(providerData)
        .select()
        .single();
      if (error) throw error;
      set({ myProvider: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateProvider: async (providerId, updates) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", providerId)
        .select()
        .single();
      if (error) throw error;
      set({ myProvider: data, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ── Provider services ───────────────────────────────────────────────────────
  fetchMyServices: async (providerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      set({ myServices: data || [], loading: false });
      return data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  createService: async (serviceData) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("services")
        .insert(serviceData)
        .select()
        .single();
      if (error) throw error;
      const { myServices } = get();
      set({ myServices: [data, ...myServices], loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateService: async (serviceId, updates) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", serviceId)
        .select()
        .single();
      if (error) throw error;
      const { myServices } = get();
      set({
        myServices: myServices.map((s) => (s.id === serviceId ? data : s)),
        loading: false,
      });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  deleteService: async (serviceId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);
      if (error) throw error;
      const { myServices } = get();
      set({
        myServices: myServices.filter((s) => s.id !== serviceId),
        loading: false,
      });
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ── Provider availability ────────────────────────────────────────────────────
  fetchMyAvailability: async (providerId) => {
    try {
      const { data, error } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", providerId)
        .order("day_of_week");
      if (error) throw error;
      set({ myAvailability: data || [] });
      return data || [];
    } catch (e) {
      set({ error: e.message });
      return [];
    }
  },

  saveAvailability: async (providerId, availabilityList) => {
    set({ loading: true, error: null });
    try {
      const records = availabilityList.map((a) => ({
        ...a,
        provider_id: providerId,
      }));
      const { data, error } = await supabase
        .from("provider_availability")
        .upsert(records, { onConflict: "provider_id,day_of_week" })
        .select();
      if (error) throw error;
      set({ myAvailability: data || [], loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ── Provider bookings ────────────────────────────────────────────────────────
  fetchProviderBookings: async (providerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*, services(name, duration_minutes, price),
           profiles!bookings_customer_id_fkey(full_name, avatar_url, phone)`
        )
        .eq("provider_id", providerId)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      set({ providerBookings: data || [], loading: false });
      return data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  updateBookingStatus: async (bookingId, status, customerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .select("*, services(name)")
        .single();
      if (error) throw error;

      const { providerBookings } = get();
      set({
        providerBookings: providerBookings.map((b) =>
          b.id === bookingId ? { ...b, status } : b
        ),
        loading: false,
      });

      const serviceName = data.services?.name || "your service";
      const notifConfig =
        status === "confirmed"
          ? {
              title: "Booking Confirmed! 🎉",
              body: `Your booking for ${serviceName} has been confirmed.`,
            }
          : {
              title: "Booking Update",
              body: `Your booking for ${serviceName} has been ${status}.`,
            };

      try {
        await sendPushNotification(customerId, notifConfig.title, notifConfig.body, {
          bookingId,
          status,
          type: "booking_update",
        });
      } catch (_) {}

      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ── Customer bookings ────────────────────────────────────────────────────────
  fetchCustomerBookings: async (customerId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*, services(name, duration_minutes, price, image_url),
           service_providers(business_name, logo_url, location, user_id)`
        )
        .eq("customer_id", customerId)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      set({ customerBookings: data || [], loading: false });
      return data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  createBooking: async (bookingData, providerUserId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select("*, services(name), service_providers(business_name)")
        .single();
      if (error) throw error;

      const { customerBookings } = get();
      set({ customerBookings: [data, ...customerBookings], loading: false });

      try {
        await sendPushNotification(
          providerUserId,
          "New Booking Request 📅",
          `You have a new booking for ${data.services?.name}.`,
          { bookingId: data.id, type: "new_booking" }
        );
      } catch (_) {}

      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  cancelBooking: async (bookingId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .select()
        .single();
      if (error) throw error;
      const { customerBookings } = get();
      set({
        customerBookings: customerBookings.map((b) =>
          b.id === bookingId ? { ...b, status: "cancelled" } : b
        ),
        loading: false,
      });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // ── Browse providers ─────────────────────────────────────────────────────────
  fetchProviders: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from("service_providers")
        .select("*")
        .order("rating", { ascending: false });
      if (filters.category && filters.category !== "All") {
        query = query.eq("category", filters.category);
      }
      if (filters.search) {
        query = query.ilike("business_name", `%${filters.search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      set({ providers: data || [], loading: false });
      return data || [];
    } catch (e) {
      set({ error: e.message, loading: false });
      return [];
    }
  },

  fetchProviderById: async (providerId) => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .eq("id", providerId)
        .single();
      if (error) throw error;
      return data;
    } catch (_) {
      return null;
    }
  },

  fetchProviderServices: async (providerId) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      set({ providerServices: data || [] });
      return data || [];
    } catch (_) {
      return [];
    }
  },

  fetchProviderAvailability: async (providerId) => {
    try {
      const { data, error } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", providerId)
        .eq("is_available", true)
        .order("day_of_week");
      if (error) throw error;
      return data || [];
    } catch (_) {
      return [];
    }
  },

  getBookedSlots: async (providerId, date) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("provider_id", providerId)
        .eq("booking_date", date)
        .in("status", ["pending", "confirmed"]);
      if (error) throw error;
      return data || [];
    } catch (_) {
      return [];
    }
  },
}));

export default useBookingStore;
