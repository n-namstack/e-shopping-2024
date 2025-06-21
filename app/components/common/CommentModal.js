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
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import supabase from "../../lib/supabase";
import useAuthStore from "../../store/authStore";
import { COLORS, FONTS } from "../../constants/theme";

const { height } = Dimensions.get("window");

const CommentModal = ({
  type, // 'product' or 'order'
  itemId, // productId or orderId
  visible,
  onClose,
  itemName = "", // Product or order name
}) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Pan responder for drag gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gestureState) => {
        // Only allow downward dragging (positive dy)
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (event, gestureState) => {
        // If dragged down more than 100 pixels, close the modal
        if (gestureState.dy > 100) {
          closeModal();
        } else {
          // Otherwise, snap back to original position
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Determine which table to use based on type
  const tableName = type === "product" ? "product_comments" : "order_comments";
  const idField = type === "product" ? "product_id" : "order_id";

  // Slide in and out animations
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Fetch comments when component mounts
  useEffect(() => {
    if (visible && itemId) {
      fetchComments();
      fetchCurrentUserProfile();
    }
  }, [visible, itemId]);

  // Set up real-time subscription for comments
  useEffect(() => {
    if (!itemId) return;

    const subscription = supabase
      .channel(`${tableName}_channel`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
          filter: `${idField}=eq.${itemId}`,
        },
        (payload) => {
          // Refresh comments when there are changes
          if (visible) {
            fetchComments();
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [itemId, type, visible]);

  // Function to fetch current user's profile
  const fetchCurrentUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, firstname, lastname, username, role")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setCurrentUserProfile(data);
    } catch (error) {
      console.error("Error fetching current user profile:", error.message);
    }
  };

  // Function to fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true);

      // Fetch comments for the product or order
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(idField, itemId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setComments(data || []);

      // Fetch user profiles for all commenters
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((comment) => comment.user_id))];
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, firstname, lastname, username, role")
          .in("id", userIds);

        if (profileError) throw profileError;

        // Create a map of user profiles for easy lookup
        const profileMap = {};
        profiles.forEach((profile) => {
          profileMap[profile.id] = profile;
        });

        setUserProfiles(profileMap);
      }
    } catch (error) {
      console.error(`Error fetching ${type} comments:`, error.message);
      Alert.alert("Error", `Failed to load comments. ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to post a new comment
  const postComment = async () => {
    if (!user) {
      Alert.alert("Login Required", "You must be logged in to post comments");
      return;
    }

    if (!message.trim()) return;

    try {
      setSending(true);

      const { data, error } = await supabase
        .from(tableName)
        .insert([
          {
            [idField]: itemId,
            user_id: user.id,
            message: message.trim(),
          },
        ])
        .select();

      if (error) throw error;

      // Clear the input field
      setMessage("");

      // Add current user's profile to userProfiles if it's not there yet
      if (currentUserProfile && !userProfiles[user.id]) {
        setUserProfiles((prev) => ({
          ...prev,
          [user.id]: currentUserProfile,
        }));
      }

      // Update local comments immediately for better UX
      if (data && data.length > 0) {
        setComments([...comments, data[0]]);
      }
    } catch (error) {
      console.error(`Error posting ${type} comment:`, error.message);
      Alert.alert("Error", `Failed to post comment. ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) {
      return "just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "yesterday";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
  };

  // Render a comment item
  const renderComment = ({ item }) => {
    const profile = userProfiles[item.user_id] || {};
    const fullName = `${profile.firstname || ""} ${
      profile.lastname || ""
    }`.trim();
    const displayName =
      fullName || profile.username || item.user_id.substring(0, 8);
    const isSeller = profile.role === "seller";
    const isCurrentUser = user && item.user_id === user.id;

    // Check if this is a payment proof message
    const isPaymentProof = item.message.includes("💳 Payment proof uploaded");

    // Extract image URL from the message
    let imageUrl = null;
    if (isPaymentProof) {
      const urlMatch = item.message.match(/https?:\/\/[^\s]+/);
      imageUrl = urlMatch ? urlMatch[0] : null;
    }

    const displayMessage = isPaymentProof
      ? "💳 Payment proof uploaded"
      : item.message;

    console.log("💬 Comment processing:", {
      isPaymentProof,
      imageUrl,
      originalMessage: item.message,
      displayMessage,
    });

    const handleImagePress = () => {
      if (imageUrl) {
        Alert.alert("Payment Proof", "View full image?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Download",
            onPress: () => {
              // Open image in browser for download
              import("expo-web-browser").then((WebBrowser) => {
                WebBrowser.openBrowserAsync(imageUrl);
              });
            },
          },
          {
            text: "View",
            onPress: () => {
              // You can implement a full-screen image viewer here
              import("expo-web-browser").then((WebBrowser) => {
                WebBrowser.openBrowserAsync(imageUrl);
              });
            },
          },
        ]);
      }
    };

    return (
      <View style={styles.messageContainer}>
        {isCurrentUser ? (
          // Current user message (right side)
          <View style={styles.currentUserMessageWrapper}>
            <View style={styles.currentUserBubble}>
              <View style={styles.currentUserHeader}>
                <Text style={styles.currentUserName}>You</Text>
                <Text style={styles.currentUserDate}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <Text style={styles.currentUserText}>{displayMessage}</Text>
              {isPaymentProof && imageUrl && (
                <TouchableOpacity
                  style={styles.paymentProofContainer}
                  onPress={handleImagePress}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.paymentProofImage}
                    resizeMode="cover"
                    onLoad={() =>
                      console.log("✅ Image loaded successfully:", imageUrl)
                    }
                    onError={(error) =>
                      console.log(
                        "❌ Image load error:",
                        error.nativeEvent.error
                      )
                    }
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.imageOverlayText}>
                      Tap to view/download
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {isPaymentProof && !imageUrl && (
                <View style={styles.paymentProofError}>
                  <Text style={styles.paymentProofErrorText}>
                    Image URL not found in message
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.currentUserAvatar}>
              <Text style={styles.currentUserAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        ) : (
          // Other user message (left side)
          <View style={styles.otherUserMessageWrapper}>
            <View style={styles.otherUserAvatar}>
              <Text style={styles.otherUserAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.otherUserBubble}>
              <View style={styles.otherUserHeader}>
                <View style={styles.nameRow}>
                  <Text style={styles.otherUserName}>{displayName}</Text>
                  {isSeller && (
                    <View style={styles.sellerBadge}>
                      <Text style={styles.sellerBadgeText}>SELLER</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.otherUserDate}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <Text style={styles.otherUserText}>{displayMessage}</Text>
              {isPaymentProof && imageUrl && (
                <TouchableOpacity
                  style={styles.paymentProofContainer}
                  onPress={handleImagePress}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.paymentProofImage}
                    resizeMode="cover"
                    onLoad={() =>
                      console.log("✅ Image loaded successfully:", imageUrl)
                    }
                    onError={(error) =>
                      console.log(
                        "❌ Image load error:",
                        error.nativeEvent.error
                      )
                    }
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.imageOverlayText}>
                      Tap to view/download
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {isPaymentProof && !imageUrl && (
                <View style={styles.paymentProofError}>
                  <Text style={styles.paymentProofErrorText}>
                    Image URL not found in message
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Close the modal with animation
  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Handle close button press
  const handleClose = () => {
    closeModal();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdropArea} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.header} {...panResponder.panHandlers}>
            <View style={styles.headerHandle} />
            <Text style={styles.headerTitle}>
              {type === "product" ? "Comments" : "Conversation"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {itemName && (
            <View style={styles.itemNameContainer}>
              <Text style={styles.itemNameLabel}>
                {type === "product" ? "Product:" : "Order:"}
              </Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {itemName}
              </Text>
            </View>
          )}

          <View style={styles.commentsContainer}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            ) : comments.length > 0 ? (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.commentsList}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={false}
                inverted={false}
                style={{ flex: 1 }}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                bounces={true}
                alwaysBounceVertical={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                directionalLockEnabled={true}
                scrollEventThrottle={16}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={48}
                  color={COLORS.gray}
                />
                <Text style={styles.emptyStateText}>
                  {type === "product"
                    ? "No comments yet. Be the first to ask about this product!"
                    : "No messages yet. Start a conversation about this order."}
                </Text>
              </View>
            )}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <View style={styles.inputContainer}>
              <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {currentUserProfile?.firstname?.charAt(0).toUpperCase() ||
                    currentUserProfile?.username?.charAt(0).toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase() ||
                    "U"}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={`Add a comment${user ? "" : " (login required)"}`}
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                editable={!!user}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !message.trim() || sending || !user
                    ? styles.sendButtonDisabled
                    : {},
                ]}
                onPress={postComment}
                disabled={!message.trim() || sending || !user}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdropArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    position: "relative",
    backgroundColor: "#fafafa",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerHandle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D0D0D0",
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: COLORS.black,
    marginBottom: 4,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 16,
    padding: 8,
    zIndex: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    overflow: "hidden",
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 8,
  },
  // Current user (right side) styles
  currentUserMessageWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingLeft: 60,
  },
  currentUserBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    padding: 12,
    marginRight: 8,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  currentUserAvatarText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  currentUserHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  currentUserName: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  currentUserDate: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },
  currentUserText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  // Other user (left side) styles
  otherUserMessageWrapper: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingRight: 60,
  },
  otherUserBubble: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    padding: 12,
    marginLeft: 8,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otherUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  otherUserAvatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  otherUserHeader: {
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  otherUserName: {
    color: COLORS.black,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  sellerBadge: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  sellerBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3,
  },
  otherUserDate: {
    color: "#999",
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },
  otherUserText: {
    color: COLORS.black,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  itemNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemNameLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 8,
  },
  itemName: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: COLORS.black,
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginBottom: 4,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginHorizontal: 8,
    fontSize: 15,
    maxHeight: 120,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    borderWidth: 1,
    borderColor: "#e9ecef",
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#d6d8db",
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#f8f9fa",
  },
  emptyStateText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 20,
    maxWidth: "85%",
    lineHeight: 24,
  },
  loader: {
    flex: 1,
    alignSelf: "center",
  },
  paymentProofContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  paymentProofImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    marginLeft: 4,
  },
  paymentProofError: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#ffebee",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  paymentProofErrorText: {
    color: "#c62828",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});

export default CommentModal;
