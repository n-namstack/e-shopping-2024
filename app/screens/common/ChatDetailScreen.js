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
import { Ionicons } from '@expo/vector-icons';
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

const ChatDetailScreen = ({ navigation, route }) => {
  const { conversationId, recipientId, recipientName, recipientImage, recipientRole } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Set the header title to the recipient's name
  useEffect(() => {
    navigation.setOptions({
      title: recipientName,
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleViewProfile} style={styles.headerButton}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [recipientName]);

  // Fetch messages when component mounts
  useEffect(() => {
    if (user) {
      fetchMessages();
      
      // Mark conversation as read
      if (conversationId) {
        supabase
          .from('conversations')
          .update({ unread_count: 0 })
          .eq('id', conversationId)
          .then();
      }
    }

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('private_messages_channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'private_messages',
          filter: `sender_id=eq.${recipientId} AND recipient_id=eq.${user?.id}` 
        },
        (payload) => {
          // Add new message to the list
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new;
            setMessages(prevMessages => [...prevMessages, newMessage]);
            
            // Mark as read
            supabase
              .from('private_messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
              .then();
              
            // Scroll to bottom
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [user, recipientId]);

  // Function to fetch messages
  const fetchMessages = async () => {
    if (!user || !recipientId) return;
    
    try {
      setLoading(true);
      
      // Fetch messages between the current user and the recipient
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark received messages as read
      const unreadMessageIds = data
        .filter(msg => msg.recipient_id === user.id && !msg.is_read)
        .map(msg => msg.id);
        
      if (unreadMessageIds.length > 0) {
        await supabase
          .from('private_messages')
          .update({ is_read: true })
          .in('id', unreadMessageIds);
      }
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to send a message
  const sendMessage = async () => {
    if (!messageText.trim() || !user || !recipientId) return;
    
    try {
      setSending(true);
      
      // Insert new message
      const { data, error } = await supabase
        .from('private_messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: recipientId,
            message: messageText.trim(),
            is_read: false,
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Clear input field
      setMessageText('');
      
      // Add message to local state
      if (data && data.length > 0) {
        setMessages([...messages, data[0]]);
        
        // Scroll to bottom
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error.message);
    } finally {
      setSending(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  // Navigate to user profile
  const handleViewProfile = () => {
    if (recipientRole === 'seller') {
      // Navigate to seller shop
      navigation.navigate('ShopDetails', { sellerId: recipientId });
    } else {
      // Navigate to buyer profile (if implemented)
      // navigation.navigate('BuyerProfile', { buyerId: recipientId });
    }
  };

  // Format timestamp for messages
  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    return `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  };

  // Format date for message groups
  const formatMessageDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    if (!messages.length) return [];
    
    const groups = [];
    let currentDate = null;
    let currentGroup = null;
    
    messages.forEach(message => {
      const messageDate = formatMessageDate(message.created_at);
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        currentGroup = {
          date: messageDate,
          data: [message]
        };
        groups.push(currentGroup);
      } else {
        currentGroup.data.push(message);
      }
    });
    
    return groups;
  };

  // Render a message group with date header
  const renderMessageGroup = ({ item }) => {
    return (
      <View>
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{item.date}</Text>
        </View>
        
        {item.data.map(message => renderMessage(message))}
      </View>
    );
  };

  // Render an individual message
  const renderMessage = (message) => {
    const isUserMessage = message.sender_id === user?.id;
    
    return (
      <View 
        key={message.id}
        style={[
          styles.messageContainer, 
          isUserMessage ? styles.userMessageContainer : styles.otherMessageContainer
        ]}
      >
        {!isUserMessage && (
          <View style={styles.messageAvatar}>
            {recipientImage ? (
              <Image 
                source={{ uri: recipientImage }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {recipientName ? recipientName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble, 
          isUserMessage ? styles.userMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={styles.messageText}>{message.message}</Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  const messageGroups = groupMessagesByDate();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
        keyboardVerticalOffset={90}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messageGroups}
            keyExtractor={(item) => item.date}
            renderItem={renderMessageGroup}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.messagesList}
          />
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              (!messageText.trim() || sending) ? styles.sendButtonDisabled : {}
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    marginRight: 8,
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: 16,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateHeaderText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.gray,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 4,
  },
  userMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: COLORS.black,
  },
  messageTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    fontFamily: 'Poppins_400Regular',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ChatDetailScreen; 