import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import supabase from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { COLORS, FONTS, SHADOWS } from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnimations = useRef([]);

  // Create animations for list items
  useEffect(() => {
    // Initialize animation values for each notification item
    fadeInAnimations.current = notifications.map(() => new Animated.Value(0));
    
    // Create staggered animations for the list items
    const animations = fadeInAnimations.current.map((anim, index) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true
      });
    });
    
    // Start the animations
    Animated.stagger(50, animations).start();
  }, [notifications]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setLoading(false);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if not already
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    console.log('Notification clicked:', notification);
    console.log('Order ID:', notification.order_id);
    console.log('Notification type:', notification.type);

    try {
      // Check user role to determine correct navigator
      const isSeller = user?.role === 'seller';
      console.log('User is seller:', isSeller);
      
      // Root navigator based on user role
      const rootNavigator = isSeller ? 'Seller' : 'Buyer';
      
      // Navigate based on notification type
      switch (notification.type) {
        case 'order_update':
        case 'new_order':
        case 'order_confirmed':
        case 'payment_approved':
        case 'payment_rejected':
        case 'payment_required':
        case 'payment_received':
          console.log('Navigating to OrderDetails with orderId:', notification.order_id);
          
          try {
            if (isSeller) {
              // Navigate using Seller stack
              navigation.navigate(rootNavigator, {
                screen: 'Orders', 
                params: {
                  screen: 'OrderDetails', 
                  params: { orderId: notification.order_id } 
                }
              });
            } else {
              // Navigate using Buyer stack
              navigation.navigate(rootNavigator, {
                screen: 'OrdersTab', 
                params: {
                  screen: 'OrderDetails', 
                  params: { orderId: notification.order_id } 
                }
              });
            }
          } catch (navError) {
            console.error('Error navigating to OrderDetails:', navError);
            Alert.alert('Navigation Error', 'Could not open order details. Please try again or access it from your orders list.');
          }
          break;
        case 'new_product':
          try {
            if (isSeller) {
              navigation.navigate(rootNavigator, {
                screen: 'Products',
                params: {
                  screen: 'ProductDetails',
                  params: { productId: notification.product_id }
                }
              });
            } else {
              navigation.navigate(rootNavigator, {
                screen: 'Home',
                params: {
                  screen: 'ProductDetails',
                  params: { productId: notification.product_id }
                }
              });
            }
          } catch (navError) {
            console.error('Error navigating to ProductDetails:', navError);
            Alert.alert('Navigation Error', 'Could not open product details. Please try again later.');
          }
          break;
        case 'shop_update':
          try {
            if (isSeller) {
              navigation.navigate(rootNavigator, {
                screen: 'Shops',
                params: {
                  screen: 'ShopDetails',
                  params: { shopId: notification.shop_id }
                }
              });
            } else {
              navigation.navigate(rootNavigator, {
                screen: 'Shops',
                params: {
                  screen: 'ShopDetails',
                  params: { shopId: notification.shop_id }
                }
              });
            }
          } catch (navError) {
            console.error('Error navigating to ShopDetails:', navError);
            Alert.alert('Navigation Error', 'Could not open shop details. Please try again later.');
          }
          break;
        case 'like':
        case 'comment':
          try {
            navigation.navigate(rootNavigator, {
              screen: 'Home',
              params: {
                screen: 'ProductDetails',
                params: { productId: notification.product_id }
              }
            });
          } catch (navError) {
            console.error('Error navigating to ProductDetails:', navError);
            Alert.alert('Navigation Error', 'Could not open product details. Please try again later.');
          }
          break;
        case 'message':
          try {
            navigation.navigate(rootNavigator, {
              screen: 'Messages',
              params: {
                screen: 'ChatDetail', 
                params: {
                  chatId: notification.chat_id,
                  recipientId: notification.sender_id, 
                  recipientName: notification.sender_name 
                }
              }
            });
          } catch (navError) {
            console.error('Error navigating to ChatDetail:', navError);
            Alert.alert('Navigation Error', 'Could not open chat. Please try again later.');
          }
          break;
        default:
          // Default action for unknown notification types
          console.log('No handler for notification type:', notification.type);
          Alert.alert('Notification', 'This notification type is not supported yet.');
          break;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Could not navigate to the requested screen. Error: ' + error.message);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;

    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id);

              if (error) throw error;

              // Mark all as read locally
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              
              setLoading(false);
              Alert.alert('Success', 'All notifications marked as read');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_update':
      case 'new_order':
      case 'order_confirmed':
        return 'cart';
      case 'payment_approved':
      case 'payment_received':
        return 'checkmark-circle';
      case 'payment_rejected':
        return 'close-circle';
      case 'payment_required':
        return 'card';
      case 'new_product':
        return 'pricetag';
      case 'shop_update':
        return 'storefront';
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      case 'message':
        return 'mail';
      default:
        return 'notifications';
    }
  };

  const getIconBgColor = (type) => {
    switch (type) {
      case 'order_update':
      case 'new_order':
      case 'order_confirmed':
        return COLORS.primary;
      case 'payment_approved':
      case 'payment_received':
        return '#4CAF50'; // Green for success
      case 'payment_rejected':
        return '#FF5722'; // Red for rejection
      case 'payment_required':
        return '#FF9800'; // Orange for pending
      case 'new_product':
        return COLORS.primary;
      case 'shop_update':
        return COLORS.primary;
      case 'like':
        return COLORS.primary;
      case 'comment':
        return COLORS.primary;
      case 'message':
        return COLORS.primary;
      default:
        return COLORS.primary;
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) {
      return 'just now';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}w ago`;
    }
    
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }
    
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  // Render notification item without hooks inside
  const renderNotificationItem = ({ item, index }) => {
    // Get the animation value for this item
    const itemAnimation = fadeInAnimations.current[index] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={{
          opacity: itemAnimation,
          transform: [{ 
            translateY: itemAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            item.read ? styles.notificationRead : styles.notificationUnread
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View 
            style={[
              styles.notificationIconContainer,
              { backgroundColor: getIconBgColor(item.type) }
            ]}
          >
            <Ionicons 
              name={getNotificationIcon(item.type)} 
              size={22} 
              color="#fff" 
            />
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.notificationFooter}>
              <Text style={styles.notificationTime}>
                {getTimeAgo(item.created_at)}
              </Text>
              {!item.read && (
                <View style={styles.unreadIndicator}>
                  <Text style={styles.unreadIndicatorText}>New</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="notifications-off" size={80} color={COLORS.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyMessage}>
            You need to be logged in to view notifications
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholderButton} />
        </View>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <EmptyState
            icon="notifications-off"
            title="No Notifications"
            message="You don't have any notifications yet"
            actionLabel="Browse Products"
            onAction={() => navigation.navigate('Home')}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearAllNotifications}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f6fa',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}20`,
  },
  clearButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  placeholderButton: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  notificationUnread: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationRead: {
    backgroundColor: '#FAFBFD',
    opacity: 0.9,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...SHADOWS.small,
  },
  notificationContent: {
    flex: 1,
    paddingRight: 10,
  },
  notificationTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginBottom: 10,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: FONTS.regular,
  },
  unreadIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  unreadIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFC',
  },
  emptyIcon: {
    marginBottom: 24,
    opacity: 0.8,
    color: COLORS.primary,
  },
  emptyTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loginButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    ...SHADOWS.medium,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
});

export default NotificationsScreen; 