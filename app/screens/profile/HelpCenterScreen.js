import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import { FONTS } from "../../constants/theme";

const PRIMARY   = "#6366F1";
const PRIMARY_D = "#4F46E5";

const FAQs = [
  {
    question: "How do I create a shop?",
    answer: 'Go to your profile and tap "Become a Seller". Fill in your shop details, name, description, and contact info. Your shop will be reviewed and verified before you can start selling.',
  },
  {
    question: "How do I track my order?",
    answer: 'Go to "My Orders" in your profile. Select the order you want to track to see its current status. You\'ll also receive push notifications whenever your order status changes.',
  },
  {
    question: "What payment methods are accepted?",
    answer: 'We accept credit/debit cards, bank transfers, Pay to Cell (mobile money), and digital wallets. Manage your payment methods under "Payment Methods" in your profile.',
  },
  {
    question: "How do I return an item?",
    answer: 'Go to "My Orders", select the relevant order, and tap "Return Item". Follow the instructions to arrange the return. Refunds are processed within 5–7 business days after the item is received.',
  },
  {
    question: "How do I become a seller?",
    answer: 'Tap "Become a Seller" in your Profile. You\'ll need to verify your identity and provide business documents. Once verified, you can create your shop and start listing products.',
  },
  {
    question: "How do I add products to my shop?",
    answer: 'From your Seller dashboard, go to Products and tap the + button. Add your product photos, description, price, and stock details. Your product will be live after submission.',
  },
];

const CONTACT = [
  { icon: "mail",        color: "#6366F1", bg: "#EEF2FF", title: "Email Support",  desc: "Get help via email",          action: "support@shopit.com",  type: "email" },
  { icon: "call",        color: "#10B981", bg: "#ECFDF5", title: "Phone Support",  desc: "Talk to our support team",    action: "+264 81 000 0000",    type: "phone" },
  { icon: "chatbubbles", color: "#F59E0B", bg: "#FFFBEB", title: "Live Chat",      desc: "Chat with us instantly",      action: "chat",                type: "chat"  },
];

const RESOURCES = [
  { icon: "document-text", color: "#6366F1", label: "Terms & Privacy Policy", onPress: (nav) => nav.navigate("TermsPrivacy") },
  { icon: "car",           color: "#0EA5E9", label: "Shipping Policy",        onPress: () => {} },
  { icon: "refresh",       color: "#10B981", label: "Return Policy",          onPress: () => {} },
];

const HelpCenterScreen = () => {
  const navigation      = useNavigation();
  const { colors }      = useTheme();
  const { isDarkMode }  = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const surface = isDarkMode ? "#1C1C2E" : "#FFFFFF";
  const bg      = isDarkMode ? "#0F0F1A" : "#F5F6FF";
  const muted   = isDarkMode ? "#9CA3AF" : "#6B7280";
  const border  = isDarkMode ? "#2C2C3E" : "#E5E7EB";
  const inputBg = isDarkMode ? "#2C2C3E" : "#F3F4F6";

  const handleContact = (method) => {
    if (method.type === "email") Linking.openURL(`mailto:${method.action}`);
    else if (method.type === "phone") Linking.openURL(`tel:${method.action}`);
  };

  const filteredFAQs = searchQuery
    ? FAQs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQs;

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
        <View style={[s.heroBubble, { width: 90,  height: 90,  bottom: -20, left: 20 }]} />

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.heroCenter}>
          <LinearGradient colors={["rgba(255,255,255,0.25)","rgba(255,255,255,0.1)"]} style={s.heroIcon}>
            <Ionicons name="help-buoy" size={28} color="#fff" />
          </LinearGradient>
          <Text style={s.heroTitle}>Help Center</Text>
          <Text style={s.heroSub}>How can we help you today?</Text>
        </View>

        {/* Search bar inside hero */}
        <View style={[s.searchBar, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)" }]}>
          <Ionicons name="search" size={18} color={isDarkMode ? "rgba(255,255,255,0.6)" : "#9CA3AF"} />
          <TextInput
            style={[s.searchInput, { color: isDarkMode ? "#fff" : "#111827" }]}
            placeholder="Search for help..."
            placeholderTextColor={isDarkMode ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={isDarkMode ? "rgba(255,255,255,0.6)" : "#9CA3AF"} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Contact Support ───────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: muted }]}>CONTACT SUPPORT</Text>
          <View style={s.contactGrid}>
            {CONTACT.map((m) => (
              <TouchableOpacity
                key={m.title}
                style={[s.contactCard, { backgroundColor: surface }]}
                onPress={() => handleContact(m)}
                activeOpacity={0.8}
              >
                <View style={[s.contactIcon, { backgroundColor: isDarkMode ? `${m.color}25` : m.bg }]}>
                  <Ionicons name={m.icon} size={24} color={m.color} />
                </View>
                <Text style={[s.contactTitle, { color: colors.text }]}>{m.title}</Text>
                <Text style={[s.contactDesc, { color: muted }]}>{m.desc}</Text>
                <View style={[s.contactArrow, { backgroundColor: isDarkMode ? `${m.color}20` : m.bg }]}>
                  <Ionicons name="arrow-forward" size={14} color={m.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: muted }]}>FREQUENTLY ASKED QUESTIONS</Text>

          {filteredFAQs.length === 0 ? (
            <View style={[s.emptySearch, { backgroundColor: surface }]}>
              <Ionicons name="search-outline" size={36} color={muted} />
              <Text style={[s.emptyTxt, { color: muted }]}>No results for "{searchQuery}"</Text>
            </View>
          ) : (
            <View style={[s.faqCard, { backgroundColor: surface }]}>
              {filteredFAQs.map((faq, i) => {
                const isExpanded = expandedFAQ === i;
                const isLast     = i === filteredFAQs.length - 1;
                return (
                  <View key={i}>
                    <TouchableOpacity
                      style={s.faqRow}
                      onPress={() => setExpandedFAQ(isExpanded ? null : i)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.faqIconWrap, { backgroundColor: isExpanded ? `${PRIMARY}15` : isDarkMode ? "#2C2C3E" : "#F3F4F6" }]}>
                        <Ionicons name="help-circle-outline" size={18} color={isExpanded ? PRIMARY : muted} />
                      </View>
                      <Text style={[s.faqQuestion, { color: colors.text, flex: 1 }]}>{faq.question}</Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={isExpanded ? PRIMARY : muted}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[s.faqAnswer, { borderColor: `${PRIMARY}25`, backgroundColor: isDarkMode ? "#1E1B4B20" : "#EEF2FF" }]}>
                        <Text style={[s.faqAnswerTxt, { color: isDarkMode ? "#C7D2FE" : "#4338CA" }]}>{faq.answer}</Text>
                      </View>
                    )}

                    {!isLast && <View style={[s.faqDivider, { backgroundColor: border }]} />}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Additional Resources ──────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: muted }]}>RESOURCES</Text>
          <View style={[s.faqCard, { backgroundColor: surface }]}>
            {RESOURCES.map((r, i) => (
              <View key={r.label}>
                <TouchableOpacity
                  style={s.resourceRow}
                  onPress={() => r.onPress(navigation)}
                  activeOpacity={0.7}
                >
                  <View style={[s.resourceIcon, { backgroundColor: `${r.color}18` }]}>
                    <Ionicons name={r.icon} size={18} color={r.color} />
                  </View>
                  <Text style={[s.resourceLabel, { color: colors.text }]}>{r.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </TouchableOpacity>
                {i < RESOURCES.length - 1 && <View style={[s.faqDivider, { backgroundColor: border }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={muted} />
          <Text style={[s.footerTxt, { color: muted }]}>
            We typically respond within 24 hours
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero: { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 20, overflow: "hidden", gap: 0 },
  heroBubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  heroCenter: { alignItems: "center", marginBottom: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { fontSize: 26, fontFamily: FONTS.bold, color: "#fff", marginBottom: 6 },
  heroSub:   { fontSize: 14, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.75)" },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  section:      { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 1, marginBottom: 12, marginLeft: 2 },

  contactGrid: { flexDirection: "row", gap: 10 },
  contactCard: {
    flex: 1, borderRadius: 18, padding: 16, alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  contactIcon:  { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  contactTitle: { fontSize: 13, fontFamily: FONTS.bold, textAlign: "center" },
  contactDesc:  { fontSize: 11, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 15 },
  contactArrow: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },

  faqCard: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  faqRow:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  faqIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  faqQuestion: { fontSize: 14, fontFamily: FONTS.medium, lineHeight: 20 },
  faqAnswer:   { marginHorizontal: 16, marginBottom: 14, borderRadius: 12, borderWidth: 1, padding: 14 },
  faqAnswerTxt:{ fontSize: 13, fontFamily: FONTS.regular, lineHeight: 20 },
  faqDivider:  { height: 1, marginHorizontal: 16 },

  resourceRow:  { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  resourceIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resourceLabel:{ flex: 1, fontSize: 15, fontFamily: FONTS.medium },

  emptySearch: { borderRadius: 18, padding: 36, alignItems: "center", gap: 10 },
  emptyTxt:    { fontSize: 14, fontFamily: FONTS.regular },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 },
  footerTxt: { fontSize: 12, fontFamily: FONTS.regular },
});

export default HelpCenterScreen;
