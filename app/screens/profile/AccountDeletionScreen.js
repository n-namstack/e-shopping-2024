import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';
import useAuthStore from '../../store/authStore';
import { FONTS } from '../../constants/theme';

const INDIGO = "#6366F1";

const deletionReasons = [
  'I no longer need this account',
  'Privacy concerns',
  'Too many emails/notifications',
  'Found a better alternative',
  'Technical issues',
  'Other',
];

const dataToAnonymize = [
  'Profile information (name, email, phone) - replaced with "Deleted User"',
  'Shop information (if seller) - marked as "Shop by Deleted User"',
  'Personal messages and private data',
  'Verification documents and personal uploads',
  'Wishlist, preferences, and personal settings',
];

const dataToKeep = [
  'Order history (anonymized) - needed for tracking and business records',
  'Product listings (if seller) - marked as from deleted user',
  'Reviews (anonymized) - important for other users and business integrity',
  'Transaction records - required for legal and tax compliance',
];

const AccountDeletionScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const { deleteAccount } = useAuthStore();
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const surface  = isDarkMode ? '#1C1C2E' : '#FFFFFF';
  const bg       = isDarkMode ? '#0F0F1A' : '#F5F6FF';
  const muted    = isDarkMode ? '#9CA3AF' : '#6B7280';
  const border   = isDarkMode ? '#2C2C3E' : '#E5E7EB';
  const inputBg  = isDarkMode ? '#2C2C3E' : '#F3F4F6';

  const handleDeleteAccount = async () => {
    if (confirmationText.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "DELETE" to confirm account deletion.');
      return;
    }
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for account deletion.');
      return;
    }
    Alert.alert(
      'Final Confirmation',
      'This will permanently delete your account and all associated data. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: performDeletion },
      ]
    );
  };

  const performDeletion = async () => {
    try {
      setIsDeleting(true);
      const { success, error } = await deleteAccount();
      if (success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been permanently deleted. You will now be logged out.',
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] }) }]
        );
      } else {
        Alert.alert('Error', error || 'Failed to delete account. Please try again or contact support.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = confirmationText.toLowerCase() === 'delete' && !!selectedReason && !isDeleting;

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
          <LinearGradient colors={["rgba(239,68,68,0.4)","rgba(239,68,68,0.2)"]} style={s.heroIcon}>
            <Ionicons name="trash" size={28} color="#fff" />
          </LinearGradient>
          <Text style={s.heroTitle}>Delete Account</Text>
          <Text style={s.heroSub}>This action is permanent and cannot be undone</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* ── Warning Card ──────────────────────────────────────────────── */}
        <View style={[s.warnCard, { backgroundColor: isDarkMode ? "#2D0A0A" : "#FEF2F2" }]}>
          <View style={s.warnHeader}>
            <View style={[s.warnIconWrap, { backgroundColor: isDarkMode ? "#7F1D1D40" : "#FEE2E2" }]}>
              <Ionicons name="information-circle" size={22} color="#EF4444" />
            </View>
            <Text style={[s.warnTitle, { color: "#EF4444" }]}>Account Anonymization</Text>
          </View>
          <Text style={[s.warnText, { color: isDarkMode ? "#FCA5A5" : "#7F1D1D" }]}>
            Your personal information will be removed, but some data is kept anonymized for business continuity and legal compliance (similar to Instagram, Amazon).
          </Text>
        </View>

        {/* ── Data to be Removed ───────────────────────────────────────── */}
        <SectionCard title="Personal data that will be removed / anonymized" surface={surface} textColor={colors.text}>
          {dataToAnonymize.map((item, i) => (
            <DataRow key={i} icon="eye-off" iconColor="#F59E0B" text={item} muted={muted} />
          ))}
        </SectionCard>

        {/* ── Data Kept ─────────────────────────────────────────────────── */}
        <SectionCard title="Business data kept (anonymized)" surface={surface} textColor={colors.text}>
          {dataToKeep.map((item, i) => (
            <DataRow key={i} icon="shield-checkmark" iconColor="#10B981" text={item} muted={muted} />
          ))}
          <View style={[s.keepNote, { backgroundColor: isDarkMode ? "#052E16" : "#F0FDF4", borderColor: "#10B981" }]}>
            <Text style={[s.keepNoteTxt, { color: isDarkMode ? "#6EE7B7" : "#065F46" }]}>
              This approach protects other users' order history and maintains business integrity while removing your personal information.
            </Text>
          </View>
        </SectionCard>

        {/* ── Alternatives ──────────────────────────────────────────────── */}
        <SectionCard title="Consider these alternatives" surface={surface} textColor={colors.text}>
          <AltRow icon="pause-circle" color="#F59E0B" label="Temporarily deactivate your account" bg={isDarkMode ? "#2C2C3E" : "#FFFBEB"} textColor={colors.text} />
          <AltRow icon="settings"    color={INDIGO}   label="Update your privacy settings"         bg={isDarkMode ? "#2C2C3E" : "#EEF2FF"} textColor={colors.text} />
          <AltRow icon="mail"        color="#10B981"  label="Manage email notifications"           bg={isDarkMode ? "#2C2C3E" : "#ECFDF5"} textColor={colors.text} />
        </SectionCard>

        {/* ── Reason Selection ──────────────────────────────────────────── */}
        <SectionCard title="Why are you deleting your account?" surface={surface} textColor={colors.text}>
          {deletionReasons.map((reason, i) => {
            const selected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.reasonRow,
                  { borderColor: selected ? INDIGO : border, backgroundColor: selected ? (isDarkMode ? "#1E1B4B" : "#EEF2FF") : "transparent" },
                ]}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <View style={[s.radio, { borderColor: selected ? INDIGO : (isDarkMode ? "#555" : "#D1D5DB") }]}>
                  {selected && <View style={s.radioInner} />}
                </View>
                <Text style={[s.reasonTxt, { color: colors.text }]}>{reason}</Text>
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        {/* ── Confirmation Input ────────────────────────────────────────── */}
        <SectionCard title='Type "DELETE" to confirm' surface={surface} textColor={colors.text}>
          <TextInput
            style={[s.input, { backgroundColor: inputBg, borderColor: border, color: colors.text }]}
            value={confirmationText}
            onChangeText={setConfirmationText}
            placeholder='Type DELETE here'
            autoCapitalize="characters"
            placeholderTextColor={muted}
          />
        </SectionCard>

        {/* ── Delete Button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.deleteBtnWrap, !canDelete && s.deleteBtnDisabled]}
          onPress={handleDeleteAccount}
          disabled={!canDelete}
          activeOpacity={0.85}
        >
          {canDelete ? (
            <LinearGradient colors={["#DC2626", "#EF4444"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.deleteGradient}>
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={s.deleteBtnTxt}>Delete My Account</Text>
                </>
              )}
            </LinearGradient>
          ) : (
            <View style={s.deleteGradient}>
              <Ionicons name="trash" size={20} color="rgba(255,255,255,0.5)" />
              <Text style={[s.deleteBtnTxt, { color: "rgba(255,255,255,0.5)" }]}>Delete My Account</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Support Card ──────────────────────────────────────────────── */}
        <View style={[s.supportCard, { backgroundColor: surface }]}>
          <View style={[s.supportIconWrap, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
            <Ionicons name="help-buoy" size={22} color={INDIGO} />
          </View>
          <Text style={[s.supportTitle, { color: colors.text }]}>Need help instead?</Text>
          <Text style={[s.supportSub, { color: muted }]}>
            Our support team is here for you. Reach out before taking any action.
          </Text>
          <TouchableOpacity style={[s.supportBtn, { borderColor: INDIGO }]} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={16} color={INDIGO} />
            <Text style={[s.supportBtnTxt, { color: INDIGO }]}>Contact Support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const SectionCard = ({ title, surface, textColor, children }) => (
  <View style={[s.card, { backgroundColor: surface }]}>
    <Text style={[s.cardTitle, { color: textColor }]}>{title}</Text>
    <View style={[s.cardDivider]} />
    <View style={{ gap: 12 }}>{children}</View>
  </View>
);

const DataRow = ({ icon, iconColor, text, muted }) => (
  <View style={s.dataRow}>
    <View style={[s.dataIconWrap, { backgroundColor: `${iconColor}18` }]}>
      <Ionicons name={icon} size={15} color={iconColor} />
    </View>
    <Text style={[s.dataRowTxt, { color: muted }]}>{text}</Text>
  </View>
);

const AltRow = ({ icon, color, label, bg, textColor }) => (
  <TouchableOpacity style={[s.altRow, { backgroundColor: bg }]} activeOpacity={0.7}>
    <View style={[s.altIconWrap, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={[s.altTxt, { color: textColor }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={color} />
  </TouchableOpacity>
);

const s = StyleSheet.create({
  flex: { flex: 1 },

  hero:       { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20, overflow: "hidden" },
  bubble:     { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  heroCenter: { alignItems: "center" },
  heroIcon:   { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle:  { fontSize: 24, fontFamily: FONTS.bold, color: "#fff", marginBottom: 6 },
  heroSub:    { fontSize: 13, fontFamily: FONTS.regular, color: "rgba(255,255,255,0.7)", textAlign: "center" },

  warnCard: {
    borderRadius: 18, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: "#EF4444",
  },
  warnHeader:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  warnIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  warnTitle:    { fontSize: 16, fontFamily: FONTS.bold },
  warnText:     { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 21 },

  card: {
    borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle:   { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 12 },
  cardDivider: { height: 1, backgroundColor: "#E5E7EB", marginBottom: 14 },

  dataRow:     { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dataIconWrap:{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  dataRowTxt:  { flex: 1, fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20 },

  keepNote: {
    marginTop: 14, borderRadius: 10, borderLeftWidth: 3, padding: 12,
  },
  keepNoteTxt: { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 20 },

  altRow:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14 },
  altIconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  altTxt:     { flex: 1, fontSize: 14, fontFamily: FONTS.regular },

  reasonRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5,
  },
  radio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: INDIGO },
  reasonTxt:  { flex: 1, fontSize: 14, fontFamily: FONTS.regular },

  input: {
    borderWidth: 1.5, borderRadius: 12, padding: 14,
    fontSize: 16, fontFamily: FONTS.regular,
  },

  deleteBtnWrap:     { borderRadius: 16, overflow: "hidden", marginBottom: 20 },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteGradient:    {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, backgroundColor: "#9CA3AF",
  },
  deleteBtnTxt: { fontSize: 16, fontFamily: FONTS.bold, color: "#fff" },

  supportCard: {
    borderRadius: 18, padding: 20, marginBottom: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  supportIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  supportTitle:    { fontSize: 16, fontFamily: FONTS.bold, marginBottom: 6 },
  supportSub:      { fontSize: 13, fontFamily: FONTS.regular, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  supportBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5, borderRadius: 12 },
  supportBtnTxt:   { fontSize: 14, fontFamily: FONTS.medium },
});

export default AccountDeletionScreen;
