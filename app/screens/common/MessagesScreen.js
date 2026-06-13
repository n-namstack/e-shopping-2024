import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../constants/themeContext';
import supabase from '../../lib/supabase';
import { COLORS } from '../../constants/theme';
import useAuthStore from '../../store/authStore';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typingConversations, setTypingConversations] = useState({});
  const typingChannelsRef = useRef([]);
  const typingTimeoutsRef = useRef({});
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });

  useEffect(() => {
    if (user) fetchConversations();

    const subscription = supabase
      .channel('conversations_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        const conv = payload.new || payload.old;
        if (conv?.participant1_id === user?.id || conv?.participant2_id === user?.id) {
          fetchConversations();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      typingChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      typingChannelsRef.current = [];
      Object.values(typingTimeoutsRef.current).forEach(t => clearTimeout(t));
    };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchConversations();
    }, [user])
  );

  const fetchConversations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_time', { ascending: false });
      if (error) throw error;

      setConversations(data || []);

      if (data && data.length > 0) {
        const participantIds = [...new Set(
          data.flatMap(c => [c.participant1_id, c.participant2_id]).filter(id => id !== user.id)
        )];
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, firstname, lastname, username, profile_image, role')
          .in('id', participantIds);
        const map = {};
        (profileData || []).forEach(p => { map[p.id] = p; });
        setProfiles(map);
      }

      typingChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      typingChannelsRef.current = [];
      (data || []).forEach(conv => {
        const ch = supabase
          .channel(`typing-${conv.id}`)
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (payload.userId !== user?.id) {
              setTypingConversations(prev => ({ ...prev, [conv.id]: true }));
              clearTimeout(typingTimeoutsRef.current[conv.id]);
              typingTimeoutsRef.current[conv.id] = setTimeout(() => {
                setTypingConversations(prev => { const next = { ...prev }; delete next[conv.id]; return next; });
              }, 3000);
            }
          })
          .subscribe();
        typingChannelsRef.current.push(ch);
      });
    } catch (err) {
      console.error('Error fetching conversations:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) {
      const h = date.getHours(), m = date.getMinutes();
      return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    }
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const navigateToChat = (conversation) => {
    const otherId = conversation.participant1_id === user.id
      ? conversation.participant2_id : conversation.participant1_id;
    const other = profiles[otherId];
    if (!other) return;
    if (conversation.unread_count > 0) {
      supabase.from('conversations').update({ unread_count: 0 }).eq('id', conversation.id).then();
    }
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      recipientId: otherId,
      recipientName: `${other.firstname || ''} ${other.lastname || ''}`.trim() || other.username,
      recipientImage: other.profile_image,
      recipientRole: other.role,
    });
  };

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const otherId = conv.participant1_id === user?.id ? conv.participant2_id : conv.participant1_id;
      const profile = profiles[otherId];
      const name = `${profile?.firstname || ''} ${profile?.lastname || ''}`.trim() || profile?.username || '';
      return name.toLowerCase().includes(q) || (conv.last_message_text || '').toLowerCase().includes(q);
    });
  };

  const renderItem = ({ item }) => {
    const otherId = item.participant1_id === user?.id ? item.participant2_id : item.participant1_id;
    const profile = profiles[otherId] || {};
    const fullName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim();
    const displayName = fullName || profile.username || 'User';
    const hasUnread = item.unread_count > 0;
    const isTyping = !!typingConversations[item.id];
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.card }]}
        onPress={() => navigateToChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {profile.profile_image ? (
            <Image source={{ uri: profile.profile_image }} style={[styles.avatar, { borderColor: isDarkMode ? colors.background : '#fff' }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: stringToColor(displayName), borderColor: isDarkMode ? colors.background : '#fff' }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          {profile.role === 'seller' && (
            <View style={[styles.roleDot, { borderColor: colors.card }]}>
              <Ionicons name="storefront" size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <View style={styles.itemTop}>
            <Text style={[styles.itemName, { color: colors.text }, hasUnread && styles.boldText]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.itemTime, { color: isDarkMode ? '#666' : '#bbb' }]}>
              {formatTime(item.last_message_time)}
            </Text>
          </View>

          <View style={styles.itemBottom}>
            <Text
              style={[
                styles.itemPreview,
                { color: isTyping ? COLORS.primary : (hasUnread ? colors.text : (isDarkMode ? '#777' : '#aaa')) },
                hasUnread && !isTyping && styles.boldText,
                isTyping && styles.italicText,
              ]}
              numberOfLines={1}
            >
              {isTyping ? 'typing...' : (item.last_message_text || 'Say hello 👋')}
            </Text>

            {hasUnread && !isTyping && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filtered = getFilteredConversations();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDarkMode ? '#2C2C2E' : '#F0F0F0' }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity style={[styles.newChatBtn, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
          <Ionicons name="search" size={16} color={isDarkMode ? '#666' : '#bbb'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={isDarkMode ? '#555' : '#c0c0c0'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={isDarkMode ? '#666' : '#ccc'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchConversations(); }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5', marginLeft: 84 }]} />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
            <Ionicons name="chatbubbles-outline" size={40} color={isDarkMode ? '#555' : '#ccc'} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {searchQuery ? 'No results found' : 'No conversations yet'}
          </Text>
          <Text style={[styles.emptySub, { color: isDarkMode ? '#666' : '#bbb' }]}>
            {searchQuery ? 'Try a different search term' : 'Start chatting with sellers and buyers'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Deterministic color from a name string
const stringToColor = (str) => {
  const palette = ['#5B6CF6', '#E84393', '#FF6B35', '#00B4D8', '#2DC653', '#9B5DE5', '#F15BB5', '#FEE440'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    padding: 0,
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 20 },
  separator: { height: 0.5 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  avatarInitial: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  roleDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 4,
  },
  itemContent: { flex: 1, minWidth: 0 },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPreview: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  boldText: { fontFamily: 'Poppins_600SemiBold' },
  italicText: { fontStyle: 'italic' },
  badge: {
    backgroundColor: COLORS.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MessagesScreen;
