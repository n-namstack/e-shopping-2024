import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS } from "../../constants/theme";

const { height } = Dimensions.get("window");

const CommentModal = ({ type, itemId, visible, onClose, itemName = "" }) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const flatListRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          closeModal();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10 }).start();
        }
      },
    })
  ).current;

  const tableName = type === "product" ? "product_comments" : "order_comments";
  const idField = type === "product" ? "product_id" : "order_id";

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && itemId) {
      fetchComments();
      fetchCurrentUserProfile();
    }
  }, [visible, itemId]);

  useEffect(() => {
    if (!itemId) return;
    const subscription = supabase
      .channel(`${tableName}_channel_${itemId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName, filter: `${idField}=eq.${itemId}` }, () => {
        if (visible) fetchComments();
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [itemId, type, visible]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, firstname, lastname, username, role")
        .eq("id", user.id)
        .single();
      if (data) setCurrentUserProfile(data);
    } catch (err) {
      console.error("Error fetching current user profile:", err.message);
    }
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(idField, itemId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments(data || []);
      if (data && data.length > 0) {
        const ids = [...new Set(data.map(c => c.user_id))];
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, firstname, lastname, username, role")
          .in("id", ids);
        const map = {};
        (profileData || []).forEach(p => { map[p.id] = p; });
        setUserProfiles(map);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    } catch (err) {
      console.error(`Error fetching ${type} comments:`, err.message);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!user) { Alert.alert("Login Required", "You must be logged in to post comments"); return; }
    if (!message.trim()) return;
    try {
      setSending(true);
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ [idField]: itemId, user_id: user.id, message: message.trim() }])
        .select();
      if (error) throw error;
      setMessage("");
      if (currentUserProfile && !userProfiles[user.id]) {
        setUserProfiles(prev => ({ ...prev, [user.id]: currentUserProfile }));
      }
      if (data && data.length > 0) {
        setComments(prev => [...prev, data[0]]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error(`Error posting ${type} comment:`, err.message);
      Alert.alert("Error", `Failed to post comment. ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMin = Math.floor((now - date) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: height, duration: 300, useNativeDriver: true }).start(() => onClose());
  };

  const chatBg = isDarkMode ? "#111318" : "#F0F2F5";
  const headerBg = isDarkMode ? colors.card : "#fff";
  const hasText = message.trim().length > 0;

  const renderComment = ({ item, index }) => {
    const profile = userProfiles[item.user_id] || {};
    const fullName = `${profile.firstname || ""} ${profile.lastname || ""}`.trim();
    const displayName = fullName || profile.username || "User";
    const isSeller = profile.role === "seller";
    const isCurrentUser = user && item.user_id === user.id;
    const initial = displayName.charAt(0).toUpperCase();

    const isPaymentProof = item.message.includes("💳 Payment proof uploaded");
    const urlMatch = isPaymentProof ? item.message.match(/https?:\/\/[^\s]+/) : null;
    const imageUrl = urlMatch ? urlMatch[0] : null;
    const displayMessage = isPaymentProof ? "💳 Payment proof uploaded" : item.message;

    // Check grouping: show avatar only on last message in consecutive sequence
    const next = comments[index + 1];
    const isLast = !next || next.user_id !== item.user_id;
    const prev = comments[index - 1];
    const isFirst = !prev || prev.user_id !== item.user_id;
    const marginTop = isFirst ? 8 : 2;

    const sentRadius = {
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      borderBottomLeftRadius: 18, borderBottomRightRadius: isLast ? 4 : 18,
    };
    const receivedRadius = {
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      borderBottomLeftRadius: isLast ? 4 : 18, borderBottomRightRadius: 18,
    };

    const handleImagePress = () => {
      if (!imageUrl) return;
      Alert.alert("Payment Proof", "View full image?", [
        { text: "Cancel", style: "cancel" },
        { text: "View", onPress: () => import("expo-web-browser").then(wb => wb.openBrowserAsync(imageUrl)) },
      ]);
    };

    if (isCurrentUser) {
      return (
        <View style={[styles.msgRow, styles.sentRow, { marginTop, paddingLeft: 60 }]}>
          <View style={[styles.bubble, styles.sentBubble, sentRadius]}>
            {isFirst && (
              <Text style={styles.sentSenderLabel}>You</Text>
            )}
            <Text style={styles.sentText}>{displayMessage}</Text>
            {isPaymentProof && imageUrl && (
              <TouchableOpacity style={styles.proofWrap} onPress={handleImagePress}>
                <Image source={{ uri: imageUrl }} style={styles.proofImage} resizeMode="cover" />
                <View style={styles.proofOverlay}>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.proofOverlayText}>Tap to view</Text>
                </View>
              </TouchableOpacity>
            )}
            <Text style={styles.sentTime}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={styles.avatarSlot}>
            {isLast ? (
              <View style={[styles.avatarFallback, { backgroundColor: COLORS.primary, borderColor: isDarkMode ? '#111318' : '#F0F2F5' }]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            ) : <View style={{ width: 30 }} />}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, styles.receivedRow, { marginTop, paddingRight: 60 }]}>
        <View style={styles.avatarSlot}>
          {isLast ? (
            <View style={[styles.avatarFallback, { backgroundColor: stringToColor(displayName), borderColor: isDarkMode ? '#111318' : '#F0F2F5' }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          ) : <View style={{ width: 30 }} />}
        </View>
        <View style={[
          styles.bubble, styles.receivedBubble, receivedRadius,
          { backgroundColor: isDarkMode ? "#1E2126" : "#fff",
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.35 : 0.07, shadowRadius: 3, elevation: 2 },
        ]}>
          {isFirst && (
            <View style={styles.receivedHeader}>
              <Text style={[styles.receivedName, { color: isDarkMode ? "#ccc" : "#555" }]}>{displayName}</Text>
              {isSeller && (
                <View style={styles.sellerBadge}>
                  <Ionicons name="storefront" size={10} color="#fff" />
                  <Text style={styles.sellerBadgeText}>Seller</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[styles.receivedText, { color: colors.text }]}>{displayMessage}</Text>
          {isPaymentProof && imageUrl && (
            <TouchableOpacity style={styles.proofWrap} onPress={handleImagePress}>
              <Image source={{ uri: imageUrl }} style={styles.proofImage} resizeMode="cover" />
              <View style={styles.proofOverlay}>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.proofOverlayText}>Tap to view</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={[styles.receivedTime, { color: isDarkMode ? "#666" : "#bbb" }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeModal}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { backgroundColor: headerBg, transform: [{ translateY: slideAnim }] }]}>
          {/* Handle + header */}
          <View style={[styles.sheetHeader, { backgroundColor: headerBg, borderBottomColor: isDarkMode ? "#2C2C2E" : "#F0F0F0" }]} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: isDarkMode ? "#555" : "#D8D8D8" }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {type === "product" ? "Comments" : "Conversation"}
            </Text>
            <TouchableOpacity onPress={closeModal} style={[styles.closeBtn, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
              <Ionicons name="close" size={20} color={isDarkMode ? "#aaa" : "#888"} />
            </TouchableOpacity>
          </View>

          {/* Order/product label */}
          {itemName ? (
            <View style={[styles.itemLabel, { backgroundColor: isDarkMode ? colors.background : "#F8F9FA", borderBottomColor: isDarkMode ? "#2C2C2E" : "#EBEBEB" }]}>
              <Text style={[styles.itemLabelKey, { color: COLORS.primary }]}>
                {type === "product" ? "Product:" : "Order:"}
              </Text>
              <Text style={[styles.itemLabelVal, { color: colors.text }]} numberOfLines={1}>{itemName}</Text>
            </View>
          ) : null}

          {/* Messages */}
          <View style={[styles.msgArea, { backgroundColor: chatBg }]}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1, alignSelf: "center" }} />
            ) : comments.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={comments}
                keyExtractor={item => item.id}
                renderItem={renderComment}
                contentContainerStyle={styles.msgList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              />
            ) : (
              <View style={styles.emptyBox}>
                <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? "#2C2C2E" : "#EBEBEB" }]}>
                  <Ionicons name="chatbubbles-outline" size={36} color={isDarkMode ? "#555" : "#ccc"} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {type === "product" ? "No comments yet" : "No messages yet"}
                </Text>
                <Text style={[styles.emptySub, { color: isDarkMode ? "#666" : "#bbb" }]}>
                  {type === "product" ? "Be the first to ask about this product!" : "Start a conversation about this order."}
                </Text>
              </View>
            )}
          </View>

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.inputBar, {
              backgroundColor: isDarkMode ? "#1A1A1E" : "#fff",
              borderTopColor: isDarkMode ? "#2C2C2E" : "#EBEBEB",
            }]}>
              <View style={[styles.inputAvatar, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.inputAvatarText}>
                  {currentUserProfile?.firstname?.charAt(0).toUpperCase() ||
                    currentUserProfile?.username?.charAt(0).toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>

              <TextInput
                style={[styles.textInput, {
                  backgroundColor: isDarkMode ? "#2C2C2E" : "#F2F2F7",
                  color: colors.text,
                }]}
                placeholder={`Add a comment${user ? "" : " (login required)"}`}
                placeholderTextColor={isDarkMode ? "#555" : "#c0c0c0"}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                editable={!!user}
              />

              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: hasText && user ? COLORS.primary : (isDarkMode ? "#2C2C2E" : "#E5E5EA") }]}
                onPress={postComment}
                disabled={!hasText || sending || !user}
                activeOpacity={0.75}
              >
                {sending
                  ? <ActivityIndicator size="small" color={hasText ? "#fff" : "#aaa"} />
                  : <Ionicons name="send" size={17} color={hasText && user ? "#fff" : (isDarkMode ? "#555" : "#bbb")} style={{ marginLeft: 2 }} />
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const stringToColor = (str) => {
  const palette = ["#5B6CF6", "#E84393", "#FF6B35", "#00B4D8", "#2DC653", "#9B5DE5", "#F15BB5"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "88%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    position: "relative",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 18,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  itemLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  itemLabelKey: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 13,
    marginRight: 8,
  },
  itemLabelVal: {
    fontFamily: "Jost_500Medium",
    fontSize: 13,
    flex: 1,
  },
  msgArea: {
    flex: 1,
  },
  msgList: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  sentRow: {
    justifyContent: "flex-end",
  },
  receivedRow: {
    justifyContent: "flex-start",
  },
  avatarSlot: {
    width: 34,
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 4,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarInitial: {
    color: "#fff",
    fontFamily: "Jost_600SemiBold",
    fontSize: 12,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
  },
  sentBubble: {
    backgroundColor: COLORS.primary,
  },
  receivedBubble: {
    backgroundColor: "#fff",
  },
  sentSenderLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 3,
  },
  sentText: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    color: "#fff",
    lineHeight: 22,
  },
  sentTime: {
    fontFamily: "Jost_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  receivedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  receivedName: {
    fontFamily: "Jost_500Medium",
    fontSize: 11,
  },
  sellerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  sellerBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Jost_600SemiBold",
    letterSpacing: 0.2,
  },
  receivedText: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  receivedTime: {
    fontFamily: "Jost_400Regular",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  proofWrap: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  proofImage: {
    width: 180,
    height: 140,
    borderRadius: 10,
  },
  proofOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  proofOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Jost_500Medium",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 17,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: "80%",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    borderTopWidth: 0.5,
    gap: 8,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },
  inputAvatarText: {
    color: "#fff",
    fontFamily: "Jost_600SemiBold",
    fontSize: 14,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    fontFamily: "Jost_400Regular",
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
});

export default CommentModal;
