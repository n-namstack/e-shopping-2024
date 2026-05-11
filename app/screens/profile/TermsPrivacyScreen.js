import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { FONTS } from "../../constants/theme";

const TermsPrivacyScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState("terms"); // 'terms' or 'privacy'
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  const renderTermsContent = () => (
    <View style={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        By accessing and using this application, you accept and agree to be
        bound by the terms and provision of this agreement.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>2. User Account</Text>

      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        To use certain features of the application, you must register for an
        account. You agree to provide accurate information and keep your account
        information updated.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>3. User Conduct</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        You agree not to use the application to:
      </Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        • Post unauthorized commercial communications
      </Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Upload viruses or malicious code</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        • Collect users' information without their consent
      </Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        • Engage in unlawful multi-level marketing
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Seller Terms</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        Sellers must comply with all applicable laws and regulations. Products
        must be accurately described and priced. Sellers are responsible for
        shipping and customer service.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Buyer Terms</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        Buyers agree to pay for items purchased and provide accurate shipping
        information. Buyers must comply with return policies as specified by
        sellers.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Intellectual Property</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        The application and its original content are protected by copyright,
        trademark, and other laws. Our trademarks may not be used without our
        prior written permission.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Termination</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We reserve the right to terminate or suspend your account and access to
        the application at our sole discretion, without notice, for conduct that
        we believe violates these terms or is harmful to other users.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Changes to Terms</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We reserve the right to modify or replace these terms at any time. We
        will provide notice of any changes by posting the new terms on the
        application.
      </Text>
    </View>
  );

  const renderPrivacyContent = () => (
    <View style={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Information We Collect</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We collect information you provide directly to us, including:
      </Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Name and contact information</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Payment information</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Shipping addresses</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Profile information</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>2. How We Use Information</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We use the information we collect to:
      </Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Process your transactions</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Provide customer support</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Send marketing communications</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Improve our services</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Information Sharing</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>We may share your information with:</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Service providers</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Payment processors</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Law enforcement when required</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Data Security</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We implement appropriate security measures to protect your personal
        information. However, no method of transmission over the Internet is
        100% secure.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Your Rights</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>You have the right to:</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Access your personal information</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Correct inaccurate information</Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        • Request deletion of your information
      </Text>
      <Text style={[styles.listItem, { color: isDarkMode ? '#aaa' : '#334155' }]}>• Opt-out of marketing communications</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Cookies</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We use cookies and similar technologies to collect information about
        your browsing activities and to manage your preferences.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Children's Privacy</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        Our services are not directed to children under 13. We do not knowingly
        collect personal information from children under 13.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Changes to Privacy Policy</Text>
      <Text style={[styles.paragraph, { color: isDarkMode ? '#aaa' : '#334155' }]}>
        We may update this privacy policy from time to time. We will notify you
        of any changes by posting the new policy on this page.
      </Text>
    </View>
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms & Privacy</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "terms" && [styles.activeTab, { borderBottomColor: colors.text }]]}
          onPress={() => setActiveTab("terms")}
        >
          <Text
            style={[
              styles.tabText,
              { color: isDarkMode ? '#aaa' : '#64748b' },
              activeTab === "terms" && [styles.activeTabText, { color: colors.text }],
            ]}
          >
            Terms of Service
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "privacy" && [styles.activeTab, { borderBottomColor: colors.text }]]}
          onPress={() => setActiveTab("privacy")}
        >
          <Text
            style={[
              styles.tabText,
              { color: isDarkMode ? '#aaa' : '#64748b' },
              activeTab === "privacy" && [styles.activeTabText, { color: colors.text }],
            ]}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === "terms" ? renderTermsContent() : renderPrivacyContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    // fontWeight: "bold",
    color: "#0f172a",
    fontFamily: FONTS.bold
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
    fontFamily: FONTS.medium
  },
  activeTabText: {
    color: "#0f172a",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: "#0f172a",
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: FONTS.regular
  },
  listItem: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginLeft: 16,
    marginBottom: 8,
    fontFamily: FONTS.regular
  },
});

export default TermsPrivacyScreen;
