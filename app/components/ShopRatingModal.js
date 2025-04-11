import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../lib/supabase';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

const ShopRatingModal = ({ visible, onClose, shopId, buyerId, onRatingSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRating = async () => {
    if (!shopId || !buyerId) {
      Alert.alert('Error', 'Unable to submit rating. Please try logging in again.');
      return;
    }

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
          user_id: buyerId,
          rating: rating,
          comment: comment.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'shop_id,user_id'
        });

      if (error) throw error;

      Alert.alert('Success', 'Thank you for your rating!');
      onRatingSubmit?.();
      onClose();
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Rating submission error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate this Shop</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
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
            placeholderTextColor={COLORS.textSecondary}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontFamily: FONTS.regular,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
    fontSize: 16,
  },
});

export default ShopRatingModal; 