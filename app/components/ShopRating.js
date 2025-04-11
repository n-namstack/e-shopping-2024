import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

const ShopRating = ({ shopId, buyerId, onRatingSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase
        .from('shop_ratings')
        .upsert({
          shop_id: shopId,
          buyer_id: buyerId,
          rating: rating,
          comment: comment,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'shop_id,buyer_id'
        });

      if (error) throw error;

      Alert.alert('Success', 'Thank you for your rating!');
      onRatingSubmit?.();
      setRating(0);
      setComment('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate this Shop</Text>
      
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={24}
              color={star <= rating ? '#FFD700' : '#CCCCCC'}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.commentInput}
        placeholder="Write a review (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleRating}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting...' : 'Submit Rating'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    ...SHADOWS.small,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: FONTS.regular,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
});

export default ShopRating; 