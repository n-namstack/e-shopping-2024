import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS } from '../../constants/theme';

const { height } = Dimensions.get('window');

const CommentModal = ({ 
  type, // 'product' or 'order'
  itemId, // productId or orderId
  visible,
  onClose,
  itemName = '' // Product or order name
}) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Determine which table to use based on type
  const tableName = type === 'product' ? 'product_comments' : 'order_comments';
  const idField = type === 'product' ? 'product_id' : 'order_id';

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
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName, filter: `${idField}=eq.${itemId}` },
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
        .from('profiles')
        .select('id, firstname, lastname, username, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setCurrentUserProfile(data);
    } catch (error) {
      console.error('Error fetching current user profile:', error.message);
    }
  };

  // Function to fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Fetch comments for the product or order
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(idField, itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setComments(data || []);
      
      // Fetch user profiles for all commenters
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, firstname, lastname, username, role')
          .in('id', userIds);
          
        if (profileError) throw profileError;
        
        // Create a map of user profiles for easy lookup
        const profileMap = {};
        profiles.forEach(profile => {
          profileMap[profile.id] = profile;
        });
        
        setUserProfiles(profileMap);
      }
    } catch (error) {
      console.error(`Error fetching ${type} comments:`, error.message);
      Alert.alert('Error', `Failed to load comments. ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to post a new comment
  const postComment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to post comments');
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
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Clear the input field
      setMessage('');
      
      // Add current user's profile to userProfiles if it's not there yet
      if (currentUserProfile && !userProfiles[user.id]) {
        setUserProfiles(prev => ({
          ...prev,
          [user.id]: currentUserProfile
        }));
      }
      
      // Update local comments immediately for better UX
      if (data && data.length > 0) {
        setComments([...comments, data[0]]);
      }
    } catch (error) {
      console.error(`Error posting ${type} comment:`, error.message);
      Alert.alert('Error', `Failed to post comment. ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
  };

  // Render a comment item
  const renderComment = ({ item }) => {
    const profile = userProfiles[item.user_id] || {};
    const fullName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim();
    const displayName = fullName || profile.username || item.user_id.substring(0, 8);
    const isSeller = profile.role === 'seller';
    const isCurrentUser = user && item.user_id === user.id;
    
    return (
      <View style={[styles.commentItem, isCurrentUser && styles.currentUserComment]}>
        <View style={styles.commentHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{displayName}</Text>
                {isSeller && (
                  <View style={styles.sellerBadge}>
                    <Text style={styles.sellerBadgeText}>Seller</Text>
                  </View>
                )}
                {isCurrentUser && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.commentText}>{item.message}</Text>
      </View>
    );
  };

  // Close the modal
  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.modalContainer,
                  { transform: [{ translateY: slideAnim }] }
                ]}
              >
                <View style={styles.header}>
                  <View style={styles.headerHandle} />
                  <Text style={styles.headerTitle}>
                    {type === 'product' ? 'Comments' : 'Conversation'}
                  </Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>

                {itemName && (
                  <View style={styles.itemNameContainer}>
                    <Text style={styles.itemNameLabel}>
                      {type === 'product' ? 'Product:' : 'Order:'}
                    </Text>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {itemName}
                    </Text>
                  </View>
                )}

                <View style={styles.commentsContainer}>
                  {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
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
                      removeClippedSubviews={true}
                      inverted={false}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="chat-bubble-outline" size={48} color={COLORS.gray} />
                      <Text style={styles.emptyStateText}>
                        {type === 'product' 
                          ? 'No comments yet. Be the first to ask about this product!' 
                          : 'No messages yet. Start a conversation about this order.'}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {currentUserProfile?.firstname?.charAt(0).toUpperCase() || 
                       currentUserProfile?.username?.charAt(0).toUpperCase() || 
                       user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={`Add a comment${user ? '' : ' (login required)'}`}
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
                      (!message.trim() || sending || !user) ? styles.sendButtonDisabled : {}
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
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '77%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  headerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    position: 'absolute',
    top: 5,
    alignSelf: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: COLORS.black,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 12,
    padding: 5,
  },
  commentsContainer: {
    flex: 1,
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  currentUserComment: {
    backgroundColor: '#f0f7ff',
    borderColor: '#e0f0ff',
    marginTop: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: COLORS.black,
  },
  sellerBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  sellerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
  },
  youBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  youBadgeText: {
    color: '#606060',
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
  },
  commentDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.gray,
  },
  commentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.black,
    marginLeft: 46,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: '80%',
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
  },
  itemNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f7f7f7',
  },
  itemNameLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: COLORS.gray,
    marginRight: 4,
  },
  itemName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.black,
    flex: 1,
  },
});

export default CommentModal; 