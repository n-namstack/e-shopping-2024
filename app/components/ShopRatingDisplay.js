import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

const ShopRatingDisplay = ({ shopId }) => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    fetchRatings();
  }, [shopId]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_ratings')
        .select(`
          *,
          profile:profiles (
            username,
            avatar_url
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setRatings(data);
        const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
        setAverageRating(avg);
        setRatingCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Rating Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.ratingCircle}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= averageRating ? 'star' : 'star-outline'}
                size={16}
                color={star <= averageRating ? '#FFD700' : '#CCCCCC'}
              />
            ))}
          </View>
          <Text style={styles.ratingCount}>{ratingCount} reviews</Text>
        </View>
      </View>

      {/* Reviews List */}
      <ScrollView 
        style={styles.reviewsContainer}
        showsVerticalScrollIndicator={false}
      >
        {ratings.map((rating) => (
          <View key={rating.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  {rating.profile?.avatar_url ? (
                    <Image
                      source={{ uri: rating.profile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <Ionicons name="person-circle" size={32} color={COLORS.gray} />
                  )}
                </View>
                <View>
                  <Text style={styles.username}>
                    {rating.profile?.username || 'Anonymous'}
                  </Text>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= rating.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={star <= rating.rating ? '#FFD700' : '#CCCCCC'}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.date}>
                {new Date(rating.created_at).toLocaleDateString()}
              </Text>
            </View>
            {rating.comment && (
              <Text style={styles.comment}>{rating.comment}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  summaryContainer: {
    padding: 16,
    alignItems: 'center',
  },
  ratingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
    elevation: 3,
  },
  averageRating: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  reviewsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  username: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  ratingStars: {
    flexDirection: 'row',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  comment: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
});

export default ShopRatingDisplay; 