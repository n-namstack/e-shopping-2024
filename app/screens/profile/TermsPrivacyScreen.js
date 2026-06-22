import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import { FONTS } from "../../constants/theme";

const PRIMARY = "#6366F1";

const TERMS = [
  {
    icon: "checkmark-circle",
    title: "1. Acceptance of Terms",
    body: "By accessing and using this application, you accept and agree to be bound by the terms and provisions of this agreement.",
  },
  {
    icon: "person-circle",
    title: "2. User Account",
    body: "To use certain features of the application, you must register for an account. You agree to provide accurate information and keep your account information updated.",
  },
  {
    icon: "shield",
    title: "3. User Conduct",
    body: "You agree not to use the application to:",
    bullets: [
      "Post unauthorized commercial communications",
      "Upload viruses or malicious code",
      "Collect users' information without their consent",
      "Engage in unlawful multi-level marketing",
    ],
  },
  {
    icon: "storefront",
    title: "4. Seller Terms",
    body: "Sellers must comply with all applicable laws and regulations. Products must be accurately described and priced. Sellers are responsible for shipping and customer service.",
  },
  {
    icon: "cart",
    title: "5. Buyer Terms",
    body: "Buyers agree to pay for items purchased and provide accurate shipping information. Buyers must comply with return policies as specified by sellers.",
  },
  {
    icon: "ribbon",
    title: "6. Intellectual Property",
    body: "The application and its original content are protected by copyright, trademark, and other laws. Our trademarks may not be used without our prior written permission.",
  },
  {
    icon: "ban",
    title: "7. Termination",
    body: "We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that violates these terms or is harmful to other users.",
  },
  {
    icon: "refresh-circle",
    title: "8. Changes to Terms",
    body: "We reserve the right to modify or replace these terms at any time. We will provide notice of any changes by posting the new terms on the application.",
  },
];

const PRIVACY = [
  {
    icon: "information-circle",
    title: "1. Information We Collect",
    body: "We collect information you provide directly to us, including:",
    bullets: ["Name and contact information", "Payment information", "Shipping addresses", "Profile information"],
  },
  {
    icon: "analytics",
    title: "2. How We Use Information",
    body: "We use the information we collect to:",
    bullets: ["Process your transactions", "Provide customer support", "Send marketing communications", "Improve our services"],
  },
  {
    icon: "share-social",
    title: "3. Information Sharing",
    body: "We may share your information with:",
    bullets: ["Service providers", "Payment processors", "Law enforcement when required"],
  },
  {
    icon: "lock-closed",
    title: "4. Data Security",
    body: "We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.",
  },
  {
    icon: "hand-left",
    title: "5. Your Rights",
    body: "You have the right to:",
    bullets: ["Access your personal information", "Correct inaccurate information", "Request deletion of your information", "Opt-out of marketing communications"],
  },
  {
    icon: "globe",
    title: "6. Cookies",
    body: "We use cookies and similar technologies to collect information about your browsing activities and to manage your preferences.",
  },
  {
    icon: "people",
    title: "7. Children's Privacy",
    body: "Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13.",
  },
  {
    icon: "document-text",
    title: "8. Changes to Privacy Policy",
    body: "We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.",
  },
];

const TermsPrivacyScreen = () => {
  const navigation     = useNavigation();
  const { colors }     = useTheme();
  const { isDarkMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState("terms");

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";

  const sections = activeTab === "terms" ? TERMS : PRIVACY;
  const lastUpdated = "June 2025";

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: bg }]}>

      {/* ── Gradient Hero ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[s.bubble, { width: 180, height: 180, top: -60, right: -40 }]} />
        <View style={[s.bubble, { width: 90,  height: 90,  bottom: -20, left: 20 }]} />

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.heroCenter}>
          <LinearGradient colors={["rgba(255,255,255,0.25)","rgba(255,255,255,0.1)"]} style={s.heroIcon}>
            <Ionicons name="document-lock" size={28} color="#fff" />
          </LinearGradient>
          <Text style={s.heroTitle}>Terms & Privacy</Text>
          <Text style={s.heroSub}>Last updated {lastUpdated}</Text>
        </View>

        {/* Tab switcher inside hero */}
        <View style={s.tabRow}>
          {[
            { key: "terms",   label: "Terms of Service" },
            { key: "privacy", label: "Privacy Policy"   },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, activeTab === t.key && s.tabActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {sections.map((sec, i) => (
          <View key={i} style={[s.card, { backgroundColor: surface }]}>
            {/* Section header */}
            <View style={s.cardHeader}>
              <View style={[s.cardIcon, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
                <Ionicons name={sec.icon} size={18} color={PRIMARY} />
              </View>
              <Text style={[s.cardTitle, { color: colors.text }]}>{sec.title}</Text>
            </View>

            {/* Divider */}
            <View style={[s.cardDivider, { backgroundColor: border }]} />

            {/* Body */}
            <Text style={[s.cardBody, { color: muted }]}>{sec.body}</Text>

            {/* Bullets */}
            {sec.bullets?.map((b, bi) => (
              <View key={bi} style={s.bulletRow}>
                <View style={s.bulletDot} />
                <Text style={[s.bulletTxt, { color: muted }]}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={muted} />
          <Text style={[s.footerTxt, { color: muted }]}>
            ShopIt · All rights reserved © {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero:   { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  bubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },

  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  heroCenter: { alignItems: "center", marginBottom: 20 },
  heroIcon:   { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle:  { fontSize: 24, fontFamily: FONTS.bold, color: "#fff", marginBottom: 4 },
  heroSub:    { fontSize: 13, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)" },

  tabRow:     { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 4, gap: 4 },
  tab:        { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  tabActive:  { backgroundColor: "#fff" },
  tabTxt:     { fontSize: 13, fontFamily: FONTS.medium, color: "rgba(255,255,255,0.7)" },
  tabTxtActive: { color: PRIMARY, fontFamily: FONTS.bold },

  card: {
    borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  cardIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle:   { fontSize: 15, fontFamily: FONTS.bold, flex: 1 },
  cardDivider: { height: 1, marginBottom: 12 },
  cardBody:    { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22, marginBottom: 4 },

  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY, marginTop: 7, flexShrink: 0 },
  bulletTxt: { flex: 1, fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22 },

  footer:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 },
  footerTxt: { fontSize: 12, fontFamily: FONTS.regular },
});

export default TermsPrivacyScreen;
