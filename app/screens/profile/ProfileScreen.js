import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { FONTS } from "../../constants/theme";
import { useAppTheme } from "../../constants/themeContext";
import { useTheme } from "@react-navigation/native";

const PRIMARY = "#6366F1";

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, refreshSession } = useAuthStore();
  const [profile, setProfile]             = useState(null);
  const [shopInfo, setShopInfo]           = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [verificationStatus, setVerificationStatus]     = useState(null);
  const [stats, setStats]                 = useState(null);
  const { isDarkMode, toggleTheme }       = useAppTheme();
  const { colors }                        = useTheme();

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const isSeller = profile?.role === "seller" || profile?.role === "admin";

  useEffect(() => {
    fetchProfile();
    checkVerificationStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const { data: profileData, error } = await supabase
        .from("profiles").select("*").eq("id", user.id).limit(1);
      if (error) throw error;

      let p = profileData?.[0];
      if (!p) {
        const { data: newP } = await supabase.from("profiles").insert([{
          id: user.id, email: user.email,
          firstname: user.user_metadata?.full_name?.split(" ")[0] || "",
          lastname: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
          username: user.email.split("@")[0], cellphone_no: "", role: "buyer", is_verified: true,
        }]).select().single();
        p = newP;
      }
      setProfile(p);

      if (p?.role === "seller" || p?.role === "admin") {
        const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", user.id).limit(1);
        if (shopData?.[0]) {
          setShopInfo(shopData[0]);
          const { data: productData } = await supabase.from("products").select("id", { count: "exact" }).eq("shop_id", shopData[0].id);
          const { data: statsData }   = await supabase.from("seller_stats").select("*").eq("shop_id", shopData[0].id).limit(1);
          setStats({ total: productData?.length || 0, ...(statsData?.[0] || {}) });
        }
      }
    } catch (e) {
      console.error("fetchProfile:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const { data } = await supabase.from("seller_verifications").select("status").eq("user_id", user.id).limit(1);
      setVerificationStatus(data?.[0]?.status || "unverified");
    } catch (e) {}
  };

  const handleSignOut = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { try { await signOut(); } catch (e) {} } },
    ]);
  };

  const handleSwitchToBuyer = () => {
    Alert.alert("Switch to Buyer", "Switch to Buyer mode?", [
      { text: "Cancel", style: "cancel" },
      { text: "Switch", onPress: async () => {
        try {
          setIsLoading(true);
          await supabase.from("profiles").update({ role: "buyer" }).eq("id", user.id);
          await supabase.auth.updateUser({ data: { role: "buyer" } });
          await refreshSession();
          Alert.alert("Success", "You are now in Buyer mode");
        } catch (e) { Alert.alert("Error", "Failed to switch to Buyer mode"); }
        finally { setIsLoading(false); }
      }},
    ]);
  };

  const handleSwitchToSeller = async () => {
    const switchFn = async () => {
      try {
        setIsLoading(true);
        await supabase.from("profiles").update({ role: "seller" }).eq("id", user.id);
        await supabase.auth.updateUser({ data: { role: "seller" } });
        await refreshSession();
        Alert.alert("Success", "You are now in Seller mode");
      } catch (e) { Alert.alert("Error", "Failed to switch to Seller mode"); }
      finally { setIsLoading(false); }
    };
    Alert.alert("Become a Seller", "This will give you the ability to create shops and sell products.", [
      { text: "Cancel", style: "cancel" },
      { text: "Become Seller", onPress: switchFn },
    ]);
  };

  const displayName = profile?.full_name ||
    (profile?.firstname ? `${profile.firstname} ${profile.lastname || ""}`.trim() : null) ||
    user?.email?.split("@")[0] || "User";

  const initial = displayName.charAt(0).toUpperCase();

  if (isLoading) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
        <LinearGradient colors={["#312E81","#4F46E5","#7C3AED"]} style={s.heroSkeleton} />
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Gradient Hero ───────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#312E81","#4F46E5","#7C3AED"]}
          style={s.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View style={[s.heroBubble, { width: 180, height: 180, top: -60, right: -40 }]} />
          <View style={[s.heroBubble, { width: 100, height: 100, top: 30, right: 60 }]} />

          {/* Avatar */}
          <View style={s.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <LinearGradient colors={["rgba(255,255,255,0.3)","rgba(255,255,255,0.1)"]} style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Name & email */}
          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroEmail}>{user?.email}</Text>

          {/* Role / shop badge */}
          <View style={s.heroBadgeRow}>
            {isSeller && shopInfo ? (
              <View style={[s.heroBadge, { backgroundColor: "rgba(16,185,129,0.25)" }]}>
                <Ionicons name="storefront" size={13} color="#4ADE80" />
                <Text style={[s.heroBadgeTxt, { color: "#4ADE80" }]}>{shopInfo.name}</Text>
              </View>
            ) : (
              <View style={[s.heroBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Ionicons name="person" size={13} color="#fff" />
                <Text style={[s.heroBadgeTxt, { color: "#fff" }]}>Buyer</Text>
              </View>
            )}
            {isSeller && verificationStatus === "verified" && (
              <View style={[s.heroBadge, { backgroundColor: "rgba(16,185,129,0.25)" }]}>
                <Ionicons name="checkmark-circle" size={13} color="#4ADE80" />
                <Text style={[s.heroBadgeTxt, { color: "#4ADE80" }]}>Verified</Text>
              </View>
            )}
            {isSeller && verificationStatus === "pending" && (
              <View style={[s.heroBadge, { backgroundColor: "rgba(251,191,36,0.25)" }]}>
                <Ionicons name="time" size={13} color="#FCD34D" />
                <Text style={[s.heroBadgeTxt, { color: "#FCD34D" }]}>Pending Verification</Text>
              </View>
            )}
            {isSeller && verificationStatus === "unverified" && (
              <TouchableOpacity
                style={[s.heroBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}
                onPress={() => navigation.navigate("Verification")}
              >
                <Ionicons name="shield-checkmark" size={13} color="#fff" />
                <Text style={[s.heroBadgeTxt, { color: "#fff" }]}>Get Verified</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats row (sellers) */}
          {isSeller && stats && (
            <View style={s.statsRow}>
              <StatChip label="Products" value={stats.total || 0} />
              <View style={s.statDivider} />
              <StatChip label="Orders" value={stats.total_orders || 0} />
              <View style={s.statDivider} />
              <StatChip label="Rating" value={stats.average_rating ? `${parseFloat(stats.average_rating).toFixed(1)}★` : "—"} />
            </View>
          )}

          {/* Edit profile button */}
          <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={s.editBtnTxt}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Buyer quick actions ──────────────────────────────────────────── */}
        {!isSeller && (
          <View style={s.quickRow}>
            {[
              { icon: "bag-handle",  label: "Orders",   color: "#6366F1", bg: "#EEF2FF",  onPress: () => navigation.navigate("OrdersTab", { screen: "Orders" }) },
              { icon: "location",    label: "Address",  color: "#F97316", bg: "#FFF7ED",  onPress: () => navigation.navigate("ShippingAddress") },
              { icon: "card",        label: "Payment",  color: "#8B5CF6", bg: "#F5F3FF",  onPress: () => navigation.navigate("PaymentMethods") },
              { icon: "heart",       label: "Wishlist", color: "#EF4444", bg: "#FEF2F2",  onPress: () => navigation.navigate("Wishlist") },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={[s.quickItem, { backgroundColor: surface }]} onPress={a.onPress}>
                <View style={[s.quickIcon, { backgroundColor: isDarkMode ? `${a.color}25` : a.bg }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[s.quickLabel, { color: colors.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Account section ──────────────────────────────────────────────── */}
        <Section title="Account" colors={colors}>
          {!isSeller && <Row icon="person" color="#0EA5E9"  label="Personal Information" onPress={() => navigation.navigate("EditProfile")} border={border} colors={colors} />}
          <Row icon="cart"     color="#8B5CF6"  label="My Orders"         onPress={() => navigation.navigate("OrdersTab", { screen: "Orders" })} border={border} colors={colors} />
          <Row icon="location" color="#F97316"  label="Shipping Address"  onPress={() => navigation.navigate("ShippingAddress")} border={border} colors={colors} />
          <Row icon="card"     color="#10B981"  label="Payment Methods"   onPress={() => navigation.navigate("PaymentMethods")} border={border} colors={colors} last />
        </Section>

        {/* ── Seller shop management ────────────────────────────────────────── */}
        {isSeller && (
          <Section title="Shop Management" colors={colors}>
            <Row icon="storefront"    color="#0EA5E9" label="Manage Shop"  onPress={() => navigation.navigate("ShopsTab", { screen: "Shops" })} border={border} colors={colors} />
            <Row icon="cube"          color="#F59E0B" label="Products"     onPress={() => navigation.navigate("ProductsTab", { screen: "Products" })} border={border} colors={colors} badge={stats?.total} />
            <Row icon="list"          color="#8B5CF6" label="Orders"       onPress={() => navigation.navigate("OrdersTab", { screen: "Orders" })} border={border} colors={colors} />
            <Row icon="analytics"     color="#10B981" label="Analytics"    onPress={() => navigation.navigate("DashboardTab", { screen: "Analytics" })} border={border} colors={colors} />
            <Row icon="card"          color="#14B8A6" label="Bank Details" onPress={() => navigation.navigate("ProfileTab", { screen: "BankDetails" })} border={border} colors={colors} />
            <Row icon="cash"          color="#16A34A" label="Payouts"      onPress={() => navigation.navigate("ProfileTab", { screen: "SellerPayouts" })} border={border} colors={colors} />
            {profile?.role === "admin" && <Row icon="shield-checkmark" color="#DC2626" label="Manage Payouts"      onPress={() => navigation.navigate("ProfileTab", { screen: "AdminPayouts" })} border={border} colors={colors} />}
            {profile?.role === "admin" && <Row icon="person-circle"    color="#7C3AED" label="Seller Verifications" onPress={() => navigation.navigate("ProfileTab", { screen: "AdminVerifications" })} border={border} colors={colors} last />}
          </Section>
        )}

        {/* ── Switch role ───────────────────────────────────────────────────── */}
        <Section title="Account Type" colors={colors}>
          {isSeller
            ? <Row icon="person"     color="#3B82F6" label="Switch to Buyer Mode" onPress={handleSwitchToBuyer}   border={border} colors={colors} last />
            : <Row icon="storefront" color="#F59E0B" label="Become a Seller"      onPress={handleSwitchToSeller}  border={border} colors={colors} last />
          }
        </Section>

        {/* ── Preferences ───────────────────────────────────────────────────── */}
        <Section title="Preferences" colors={colors}>
          <SwitchRow icon="notifications" color="#F43F5E" label="Notifications" value={notificationsEnabled} onToggle={() => setNotificationsEnabled(v => !v)} border={border} colors={colors} />
          <SwitchRow icon="moon"          color="#6366F1" label="Dark Mode"      value={isDarkMode}           onToggle={toggleTheme}                              border={border} colors={colors} last />
        </Section>

        {/* ── Support ───────────────────────────────────────────────────────── */}
        <Section title="Support" colors={colors}>
          <Row icon="help-circle"    color="#0EA5E9" label="Help Center"         onPress={() => navigation.navigate("HelpCenter")}  border={border} colors={colors} />
          <Row icon="document-text"  color="#6366F1" label="Terms & Privacy"     onPress={() => navigation.navigate("TermsPrivacy")} border={border} colors={colors} last />
        </Section>

        {/* ── Danger ────────────────────────────────────────────────────────── */}
        <Section title="Account Management" colors={colors}>
          <Row icon="trash" color="#EF4444" label="Delete Account" onPress={() => navigation.navigate("AccountDeletion")} border={border} colors={colors} last danger />
        </Section>

        {/* ── Logout ────────────────────────────────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[s.version, { color: muted }]}>Version {Constants.expoConfig?.version ?? "1.1.0"}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Small reusable components ─────────────────────────────────────────────────
const StatChip = ({ label, value }) => (
  <View style={s.statChip}>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const Section = ({ title, colors, children }) => (
  <View style={s.section}>
    <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
    <View style={[s.sectionCard, { backgroundColor: colors.card }]}>
      {children}
    </View>
  </View>
);

const Row = ({ icon, color, label, onPress, border, colors, last, badge, danger }) => (
  <TouchableOpacity
    style={[s.row, !last && { borderBottomWidth: 1, borderBottomColor: border }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[s.rowIcon, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={19} color={color} />
    </View>
    <Text style={[s.rowLabel, { color: danger ? "#EF4444" : colors.text }]}>{label}</Text>
    {badge != null && (
      <View style={s.badge}><Text style={s.badgeTxt}>{badge}</Text></View>
    )}
    <Ionicons name="chevron-forward" size={18} color={danger ? "#EF4444" : "#94A3B8"} />
  </TouchableOpacity>
);

const SwitchRow = ({ icon, color, label, value, onToggle, border, colors, last }) => (
  <View style={[s.row, !last && { borderBottomWidth: 1, borderBottomColor: border }]}>
    <View style={[s.rowIcon, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={19} color={color} />
    </View>
    <Text style={[s.rowLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#D1D5DB", true: `${PRIMARY}60` }}
      thumbColor={value ? PRIMARY : "#F3F4F6"}
      ios_backgroundColor="#D1D5DB"
    />
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },

  heroSkeleton: { height: 280 },

  hero: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  heroBubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  avatarWrap: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 38, fontFamily: FONTS.bold, color: "#fff" },

  heroName:  { fontSize: 22, fontFamily: FONTS.bold, color: "#fff", marginBottom: 4 },
  heroEmail: { fontSize: 13, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", marginBottom: 12 },

  heroBadgeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  heroBadgeTxt: { fontSize: 12, fontFamily: FONTS.bold },

  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 16, gap: 8 },
  statChip:  { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontFamily: FONTS.bold, color: "#fff" },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },

  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  editBtnTxt: { fontSize: 14, fontFamily: FONTS.medium, color: "#fff" },

  quickRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 10 },
  quickItem: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  quickIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickLabel: { fontSize: 12, fontFamily: FONTS.medium },

  section:     { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bold, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 },
  sectionCard: { borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  rowIcon:  { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: FONTS.medium },
  badge:    { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeTxt: { color: "#fff", fontSize: 11, fontFamily: FONTS.bold },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EF4444", marginHorizontal: 16, marginTop: 24, borderRadius: 16, paddingVertical: 15, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  logoutTxt: { fontSize: 16, fontFamily: FONTS.bold, color: "#fff" },

  version: { textAlign: "center", fontSize: 12, fontFamily: FONTS.regular, marginTop: 16, marginBottom: 8 },
});

export default ProfileScreen;
