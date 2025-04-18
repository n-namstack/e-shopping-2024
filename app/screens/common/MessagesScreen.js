import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import supabase from '../../lib/supabase';
import { COLORS, FONTS } from '../../constants/theme';
import useAuthStore from '../../store/authStore';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';

const MessagesScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState({});
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Fetch conversations on component mount
  useEffect(() => {
    if (user) {
      fetchConversations();
    }

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('conversations_channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations',
          filter: `participant1_id=eq.${user?.id} OR participant2_id=eq.${user?.id}` 
        },
        (payload) => {
          // Refresh conversations when there are changes
          fetchConversations();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Function to fetch user's conversations
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get all conversations where the user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_time', { ascending: false });
        
      if (error) throw error;
      
      setConversations(data || []);
      
      // Fetch profiles for all conversation participants
      if (data && data.length > 0) {
        const participantIds = data.flatMap(conv => 
          [conv.participant1_id, conv.participant2_id].filter(id => id !== user.id)
        );
        
        const uniqueParticipantIds = [...new Set(participantIds)];
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, firstname, lastname, username, profile_image, role')
          .in('id', uniqueParticipantIds);
          
        if (profileError) throw profileError;
        
        // Create a map of profiles for easy lookup
        const profileMap = {};
        profileData.forEach(profile => {
          profileMap[profile.id] = profile;
        });
        
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Within the last 24 hours, show hours/minutes
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      // MM/DD format
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // Navigate to chat detail
  const navigateToChat = (conversation) => {
    const otherParticipantId = conversation.participant1_id === user.id
      ? conversation.participant2_id
      : conversation.participant1_id;
      
    const otherParticipant = profiles[otherParticipantId];
    
    if (!otherParticipant) return;
    
    // Mark conversation as read when navigating to chat
    if (conversation.unread_count > 0) {
      supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation.id)
        .then();
    }
    
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      recipientId: otherParticipantId,
      recipientName: `${otherParticipant.firstname || ''} ${otherParticipant.lastname || ''}`.trim() || otherParticipant.username,
      recipientImage: otherParticipant.profile_image,
      recipientRole: otherParticipant.role,
    });
  };

  // Render a conversation item
  const renderConversationItem = ({ item }) => {
    // Determine which participant is the other user
    const otherParticipantId = item.participant1_id === user.id
      ? item.participant2_id
      : item.participant1_id;
      
    const profile = profiles[otherParticipantId] || {};
    const fullName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim();
    const displayName = fullName || profile.username || 'User';
    const hasUnread = item.unread_count > 0;
    
    return (
      <TouchableOpacity 
        style={[styles.conversationItem, hasUnread && styles.unreadConversation]} 
        onPress={() => navigateToChat(item)}
      >
        <View style={styles.avatarContainer}>
          {profile.profile_image ? (
            <Image 
              source={{ uri: profile.profile_image }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {profile.role === 'seller' && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>S</Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, hasUnread && styles.unreadText]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.conversationTime}>{formatDate(item.last_message_time)}</Text>
          </View>
          
          <View style={styles.messagePreviewContainer}>
            <Text 
              style={[styles.messagePreview, hasUnread && styles.unreadText]} 
              numberOfLines={1}
            >
              {item.last_message_text}
            </Text>
            
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.conversationsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="chat-bubble-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Messages from sellers and buyers will appear here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: COLORS.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationsList: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadConversation: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: COLORS.black,
    flex: 1,
  },
  conversationTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  unreadText: {
    fontFamily: 'Poppins_500Medium',
    color: COLORS.black,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    color: COLORS.black,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MessagesScreen; 