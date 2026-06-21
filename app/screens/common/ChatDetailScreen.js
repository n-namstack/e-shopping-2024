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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';
import supabase from '../../lib/supabase';
import { COLORS } from '../../constants/theme';
import useAuthStore from '../../store/authStore';
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
} from '@expo-google-fonts/jost';

const CHAT_BG_LIGHT = '#F0F2F5';
const CHAT_BG_DARK = '#111318';

const TypingDots = ({ isDarkMode }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(Math.max(0, 600 - delay)),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 180);
    const a3 = animate(dot3, 360);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isDarkMode ? '#aaa' : '#999',
            opacity: dot,
            transform: [{ scale: dot.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1.1] }) }],
          }}
        />
      ))}
    </View>
  );
};

const Avatar = ({ image, name, size = 36, style, borderColor = '#fff' }) => {
  const ring = { borderWidth: 2, borderColor };
  if (image) {
    return <Image source={{ uri: image }} style={[{ width: size, height: size, borderRadius: size / 2 }, ring, style]} />;
  }
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    }, ring, style]}>
      <Text style={{ color: '#fff', fontFamily: 'Jost_600SemiBold', fontSize: size * 0.38 }}>
        {name?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
};

const ChatDetailScreen = ({ navigation, route }) => {
  const { conversationId, recipientId, recipientName, recipientImage, recipientRole } = route.params;
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatChannelRef = useRef(null);
  const lastTypingBroadcastRef = useRef(0);
  const lastMessageCreatedAtRef = useRef(null);
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    if (user) {
      fetchMessages();
      if (conversationId) {
        supabase.from('conversations').update({ unread_count: 0 }).eq('id', conversationId).then();
      }
    }

    const chatChannel = supabase
      .channel(`chat-${conversationId}`)
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        const newMessage = payload.message;
        if (!newMessage || newMessage.sender_id === user?.id) return;
        setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        setIsRecipientTyping(false);
        clearTimeout(typingTimeoutRef.current);
        supabase.from('private_messages').update({ is_read: true }).eq('id', newMessage.id).then();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user?.id) {
          setIsRecipientTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsRecipientTyping(false), 3000);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') chatChannelRef.current = chatChannel;
      });

    return () => {
      supabase.removeChannel(chatChannel);
      chatChannelRef.current = null;
      clearTimeout(typingTimeoutRef.current);
    };
  }, [user, recipientId, conversationId]);

  // Polling fallback — catches messages when broadcast WebSocket misses delivery
  useEffect(() => {
    if (!user || !recipientId) return;

    const pollNewMessages = async () => {
      if (!lastMessageCreatedAtRef.current) return;
      try {
        const { data } = await supabase
          .from('private_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
          .gt('created_at', lastMessageCreatedAtRef.current)
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = data.filter(m => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            lastMessageCreatedAtRef.current = newMsgs[newMsgs.length - 1].created_at;
            return [...prev, ...newMsgs];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          const unread = data.filter(m => m.recipient_id === user.id && !m.is_read).map(m => m.id);
          if (unread.length > 0) {
            supabase.from('private_messages').update({ is_read: true }).in('id', unread).then();
          }
        }
      } catch (err) {
        console.error('Poll error:', err.message);
      }
    };

    const interval = setInterval(pollNewMessages, 4000);
    return () => clearInterval(interval);
  }, [user, recipientId]);

  const fetchMessages = async () => {
    if (!user || !recipientId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      if (data && data.length > 0) {
        lastMessageCreatedAtRef.current = data[data.length - 1].created_at;
      }
      const unreadIds = (data || []).filter(m => m.recipient_id === user.id && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('private_messages').update({ is_read: true }).in('id', unreadIds);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (err) {
      console.error('Error fetching messages:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTextChange = (text) => {
    setMessageText(text);
    if (text.length > 0 && chatChannelRef.current) {
      const now = Date.now();
      if (now - lastTypingBroadcastRef.current > 2000) {
        lastTypingBroadcastRef.current = now;
        chatChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } });
      }
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !recipientId) return;
    const textToSend = messageText.trim();
    setMessageText('');
    try {
      setSending(true);
      const { data, error } = await supabase
        .from('private_messages')
        .insert([{ sender_id: user.id, recipient_id: recipientId, message: textToSend, is_read: false }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const sentMessage = data[0];
        setMessages(prev => [...prev, sentMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        chatChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: sentMessage } });
      }
      if (conversationId) {
        supabase.from('conversations').update({
          last_message_text: textToSend,
          last_message_time: new Date().toISOString(),
        }).eq('id', conversationId).then();
      }
    } catch (err) {
      console.error('Error sending message:', err.message);
      setMessageText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDateLabel = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const buildListItems = () => {
    const items = [];
    let lastDate = null;
    messages.forEach((msg, idx) => {
      const label = formatDateLabel(msg.created_at);
      if (label !== lastDate) {
        items.push({ type: 'date', id: `date-${label}-${idx}`, label });
        lastDate = label;
      }
      const prev = messages[idx - 1];
      const next = messages[idx + 1];
      const samePrevSender = prev && prev.sender_id === msg.sender_id && formatDateLabel(prev.created_at) === label;
      const sameNextSender = next && next.sender_id === msg.sender_id && formatDateLabel(next.created_at) === label;
      items.push({ type: 'message', id: String(msg.id), msg, isFirst: !samePrevSender, isLast: !sameNextSender });
    });
    if (isRecipientTyping) items.push({ type: 'typing', id: 'typing' });
    return items;
  };

  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={[styles.datePill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
            <Text style={[styles.datePillText, { color: isDarkMode ? '#ccc' : '#666' }]}>{item.label}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'typing') {
      return (
        <View style={[styles.msgRow, styles.receivedRow, { marginTop: 4, marginBottom: 8 }]}>
          <View style={styles.avatarSlot}>
            <Avatar image={recipientImage} name={recipientName} size={30} borderColor={isDarkMode ? '#111318' : '#F0F2F5'} />
          </View>
          <View style={[styles.typingBubble, {
            backgroundColor: isDarkMode ? '#1E2126' : '#fff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.4 : 0.1, shadowRadius: 4, elevation: 3,
          }]}>
            <TypingDots isDarkMode={isDarkMode} />
          </View>
        </View>
      );
    }

    const { msg, isFirst, isLast } = item;
    const isSent = msg.sender_id === user?.id;
    const marginTop = isFirst ? 8 : 2;

    const sentRadius = {
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      borderBottomLeftRadius: 18, borderBottomRightRadius: isLast ? 4 : 18,
    };
    const receivedRadius = {
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      borderBottomLeftRadius: isLast ? 4 : 18, borderBottomRightRadius: 18,
    };

    return (
      <View style={[styles.msgRow, isSent ? styles.sentRow : styles.receivedRow, { marginTop }]}>
        {!isSent && (
          <View style={styles.avatarSlot}>
            {isLast
              ? <Avatar image={recipientImage} name={recipientName} size={30} />
              : <View style={{ width: 30 }} />}
          </View>
        )}

        <View style={[
          styles.bubble,
          isSent
            ? [styles.sentBubble, sentRadius]
            : [styles.receivedBubble, receivedRadius, {
                backgroundColor: isDarkMode ? '#1E2126' : '#fff',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDarkMode ? 0.35 : 0.07, shadowRadius: 3, elevation: 2,
              }],
        ]}>
          <Text style={[styles.msgText, { color: isSent ? '#fff' : colors.text }]}>
            {msg.message}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, { color: isSent ? 'rgba(255,255,255,0.65)' : (isDarkMode ? '#666' : '#bbb') }]}>
              {formatTime(msg.created_at)}
            </Text>
            {isSent && (
              <Ionicons
                name={msg.is_read ? 'checkmark-done' : 'checkmark'}
                size={13}
                color={msg.is_read ? '#90CAF9' : 'rgba(255,255,255,0.55)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!fontsLoaded) return null;

  const listItems = buildListItems();
  const headerBg = isDarkMode ? '#1A1A1E' : '#fff';
  const chatBg = isDarkMode ? CHAT_BG_DARK : CHAT_BG_LIGHT;
  const hasText = messageText.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBg }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Custom header */}
      <View style={[styles.header, {
        backgroundColor: headerBg,
        borderBottomColor: isDarkMode ? '#2C2C2E' : '#EBEBEB',
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => recipientRole === 'seller' && navigation.navigate('ShopDetails', { sellerId: recipientId })}
        >
          <Avatar image={recipientImage} name={recipientName} size={40} style={styles.headerAvatar} borderColor={isDarkMode ? '#2C2C2E' : '#F0F0F0'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>{recipientName}</Text>
            <View style={[styles.roleChip, {
              backgroundColor: recipientRole === 'seller' ? 'rgba(255,107,53,0.13)' : 'rgba(33,150,243,0.1)',
            }]}>
              <Ionicons
                name={recipientRole === 'seller' ? 'storefront' : 'bag-handle'}
                size={11}
                color={recipientRole === 'seller' ? '#FF6B35' : COLORS.primary}
              />
              <Text style={[styles.roleChipText, { color: recipientRole === 'seller' ? '#FF6B35' : COLORS.primary }]}>
                {recipientRole === 'seller' ? 'Seller' : 'Buyer'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="call-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => recipientRole === 'seller' && navigation.navigate('ShopDetails', { sellerId: recipientId })}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={isDarkMode ? '#aaa' : '#555'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: chatBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchMessages(); }}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, {
          backgroundColor: isDarkMode ? '#1A1A1E' : '#fff',
          borderTopColor: isDarkMode ? '#2C2C2E' : '#EBEBEB',
        }]}>
          <TouchableOpacity style={styles.emojiBtn}>
            <Ionicons name="happy-outline" size={26} color={isDarkMode ? '#666' : '#ccc'} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, {
              backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7',
              color: colors.text,
            }]}
            placeholder="Message..."
            placeholderTextColor={isDarkMode ? '#555' : '#c0c0c0'}
            value={messageText}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: hasText ? COLORS.primary : (isDarkMode ? '#2C2C2E' : '#E5E5EA') }]}
            onPress={sendMessage}
            disabled={!hasText || sending}
            activeOpacity={0.75}
          >
            {sending
              ? <ActivityIndicator size="small" color={hasText ? '#fff' : '#aaa'} />
              : <Ionicons name="send" size={17} color={hasText ? '#fff' : (isDarkMode ? '#555' : '#bbb')} style={{ marginLeft: 2 }} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    marginRight: 10,
  },
  headerName: {
    fontFamily: 'Jost_600SemiBold',
    fontSize: 16,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  roleChipText: {
    fontFamily: 'Jost_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 8,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 14,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  datePillText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sentRow: {
    justifyContent: 'flex-end',
    paddingLeft: 52,
  },
  receivedRow: {
    justifyContent: 'flex-start',
    paddingRight: 52,
  },
  avatarSlot: {
    width: 34,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
  },
  sentBubble: {
    backgroundColor: COLORS.primary,
  },
  receivedBubble: {
    backgroundColor: '#fff',
  },
  msgText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 2,
  },
  timeText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 8,
  },
  emojiBtn: {
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    fontFamily: 'Jost_400Regular',
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
});

export default ChatDetailScreen;
