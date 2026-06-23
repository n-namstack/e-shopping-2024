import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";

const INDIGO = "#6366F1";
const VIOLET = "#7C3AED";

const NOTIF_CONFIG = {
  order_confirmed:     { icon: "checkmark-circle-outline",    color: "#22C55E", bg: "rgba(34,197,94,0.15)"   },
  order_update:        { icon: "refresh-circle-outline",      color: INDIGO,    bg: "rgba(99,102,241,0.15)"  },
  order_status_update: { icon: "refresh-circle-outline",      color: INDIGO,    bg: "rgba(99,102,241,0.15)"  },
  new_order:           { icon: "bag-add-outline",             color: "#22C55E", bg: "rgba(34,197,94,0.15)"   },
  stale_order:         { icon: "hourglass-outline",           color: "#F59E0B", bg: "rgba(245,158,11,0.15)"  },
  low_stock:           { icon: "alert-circle-outline",        color: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
  payment_approved:    { icon: "checkmark-circle-outline",    color: "#22C55E", bg: "rgba(34,197,94,0.15)"   },
  payment_received:    { icon: "cash-outline",                color: "#22C55E", bg: "rgba(34,197,94,0.15)"   },
  payment_rejected:    { icon: "close-circle-outline",        color: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
  payment_required:    { icon: "card-outline",                color: "#F59E0B", bg: "rgba(245,158,11,0.15)"  },
  new_product:         { icon: "pricetag-outline",            color: INDIGO,    bg: "rgba(99,102,241,0.15)"  },
  shop_update:         { icon: "storefront-outline",          color: INDIGO,    bg: "rgba(99,102,241,0.15)"  },
  like:                { icon: "heart-outline",               color: "#E91E63", bg: "rgba(233,30,99,0.15)"   },
  comment:             { icon: "chatbubble-ellipses-outline", color: "#0EA5E9", bg: "rgba(14,165,233,0.15)"  },
  message:             { icon: "chatbox-outline",             color: "#0EA5E9", bg: "rgba(14,165,233,0.15)"  },
};
const DEFAULT_CFG = { icon: "notifications-outline", color: INDIGO, bg: "rgba(99,102,241,0.15)" };

const getTimeAgo = (timestamp) => {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60)                       return "just now";
  if (seconds < 3600)                     return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)                    return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800)                   return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000)                  return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000)                 return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
};

const BUYER_TYPES  = ["order_confirmed","order_status_update","order_update","payment_approved","payment_rejected","payment_required","new_product","like","comment","message","shop_update"];
const SELLER_TYPES = ["new_order","stale_order","low_stock","payment_received","payment_required","message","shop_update"];

const NotificationsScreen = () => {
  const navigation     = useNavigation();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();
  const { user }       = useAuthStore();

  const surface  = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg       = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted    = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border   = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const fadeAnims = useRef([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const isSeller = user?.role === "seller";
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .in("type", isSeller ? SELLER_TYPES : BUYER_TYPES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      fadeAnims.current = list.map(() => new Animated.Value(0));
      setNotifications(list);
      Animated.stagger(40, fadeAnims.current.map((a, i) =>
        Animated.timing(a, { toValue: 1, duration: 280, delay: i * 30, useNativeDriver: true })
      )).start();
    } catch (error) {
      console.error("Error fetching notifications:", error);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handlePress = async (notification) => {
    if (!notification.read) await markAsRead(notification.id);
    try {
      const isSeller = user?.role === "seller";
      const root     = isSeller ? "Seller" : "Buyer";
      switch (notification.type) {
        case "order_update": case "order_status_update": case "new_order":
        case "order_confirmed": case "payment_approved": case "payment_rejected":
        case "payment_required": case "payment_received": case "stale_order": case "low_stock":
          navigation.navigate(root, {
            screen: isSeller ? "Orders" : "OrdersTab",
            params: { screen: "OrderDetails", params: { orderId: notification.order_id } },
          });
          break;
        case "new_product": case "like": case "comment":
          navigation.navigate(root, {
            screen: "Home",
            params: { screen: "ProductDetails", params: { productId: notification.product_id } },
          });
          break;
        case "shop_update":
          navigation.navigate(root, {
            screen: "Shops",
            params: { screen: "ShopDetails", params: { shopId: notification.shop_id } },
          });
          break;
        case "message":
          navigation.navigate(root, {
            screen: "Messages",
            params: { screen: "ChatDetail", params: { chatId: notification.chat_id, recipientId: notification.sender_id, recipientName: notification.sender_name } },
          });
          break;
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const markAllRead = () => {
    if (unreadCount === 0) return;
    Alert.alert("Mark All as Read", "Mark all notifications as read?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark All",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("notifications").update({ read: true }).eq("user_id", user.id);
            if (error) throw error;
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          } catch (error) {
            Alert.alert("Error", "Failed to mark notifications as read");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }) => {
    const cfg  = NOTIF_CONFIG[item.type] || DEFAULT_CFG;
    const anim = fadeAnims.current[index] || new Animated.Value(1);
    return (
      <Animated.View style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}>
        <TouchableOpacity
          style={[
            s.card,
            { backgroundColor: surface, borderColor: border },
            !item.read && { borderLeftWidth: 4, borderLeftColor: cfg.color },
            item.read  && { opacity: 0.75 },
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.75}
        >
          {/* Icon */}
          <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={22} color={cfg.color} />
          </View>

          {/* Content */}
          <View style={s.cardBody}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title || "Notification"}
            </Text>
            <Text style={[s.cardMsg, { color: muted }]} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={s.cardFooter}>
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={12} color={muted} style={{ marginRight: 4 }} />
                <Text style={[s.timeText, { color: muted }]}>{getTimeAgo(item.created_at)}</Text>
              </View>
              {!item.read && (
                <View style={[s.newBadge, { backgroundColor: `${cfg.color}20` }]}>
                  <View style={[s.newDot, { backgroundColor: cfg.color }]} />
                  <Text style={[s.newText, { color: cfg.color }]}>New</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const emptyContent = (
    <View style={s.emptyBox}>
      <LinearGradient colors={[`${INDIGO}20`, `${VIOLET}10`]} style={s.emptyCircle}>
        <Ionicons name="notifications-outline" size={44} color={INDIGO} />
      </LinearGradient>
      <Text style={[s.emptyTitle, { color: colors.text }]}>All caught up!</Text>
      <Text style={[s.emptySub, { color: muted }]}>
        You have no notifications yet. We'll let you know when something arrives.
      </Text>
    </View>
  );

  const noUserContent = (
    <View style={s.emptyBox}>
      <LinearGradient colors={[`${INDIGO}20`, `${VIOLET}10`]} style={s.emptyCircle}>
        <Ionicons name="person-outline" size={44} color={INDIGO} />
      </LinearGradient>
      <Text style={[s.emptyTitle, { color: colors.text }]}>Login Required</Text>
      <Text style={[s.emptySub, { color: muted }]}>Sign in to see your notifications</Text>
      <TouchableOpacity
        style={s.loginTouch}
        onPress={() => navigation.navigate("Auth", { screen: "Login" })}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[INDIGO, VIOLET]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.loginBtn}>
          <Text style={s.loginBtnText}>Sign In</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>

      {/* ── Gradient Hero ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[s.heroBubble, { width: 180, height: 180, top: -60, right: -40 }]} />
        <View style={[s.heroBubble, { width: 80,  height: 80,  bottom: -20, left: 20 }]} />

        <View style={s.heroTopRow}>
          <TouchableOpacity style={s.heroBackBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={s.heroTitleWrap}>
            <LinearGradient colors={["rgba(255,255,255,0.25)","rgba(255,255,255,0.1)"]} style={s.heroIconBadge}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </LinearGradient>
            <Text style={s.heroTitle}>Notifications</Text>
          </View>

          <TouchableOpacity
            style={[s.markAllBtn, unreadCount === 0 && { opacity: 0.4 }]}
            onPress={markAllRead}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={s.markAllText}>Read all</Text>
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <View style={s.heroBadgeRow}>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>{unreadCount} unread</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={[s.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={INDIGO} />
        </View>
      ) : !user ? (
        noUserContent
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={() => emptyContent}
          contentContainerStyle={[s.list, notifications.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[INDIGO]} tintColor={INDIGO} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },

  // Hero
  hero: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 20, fontFamily: FONTS.bold, color: "#fff" },
  markAllBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  markAllText: { fontSize: 12, fontFamily: FONTS.semiBold, color: "#fff" },
  heroBadgeRow: { marginTop: 10 },
  heroBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, fontFamily: FONTS.semiBold, color: "#fff" },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Cards
  card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  iconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: FONTS.semiBold, marginBottom: 4 },
  cardMsg:   { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 19, marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeRow:   { flexDirection: "row", alignItems: "center" },
  timeText:  { fontSize: 12, fontFamily: FONTS.regular },
  newBadge:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  newDot:    { width: 6, height: 6, borderRadius: 3 },
  newText:   { fontSize: 11, fontFamily: FONTS.semiBold },

  // Empty
  emptyBox:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  emptyCircle: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 20, fontFamily: FONTS.bold, textAlign: "center" },
  emptySub:    { fontSize: 14, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 21 },

  // Login
  loginTouch: { borderRadius: 14, overflow: "hidden", marginTop: 6, alignSelf: "stretch" },
  loginBtn:   { paddingVertical: 14, alignItems: "center", borderRadius: 14 },
  loginBtnText: { color: "#fff", fontSize: 15, fontFamily: FONTS.bold },
});

export default NotificationsScreen;
