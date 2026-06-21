import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useTheme } from '@react-navigation/native';

/**
 * EmptyState component for displaying empty screens with an action button
 * 
 * @param {Object} props
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.title - Main title text
 * @param {string} props.message - Optional descriptive message
 * @param {string} props.actionLabel - Text for the action button
 * @param {function} props.onAction - Function to call when button is pressed
 * @param {string} props.iconColor - Optional icon color (defaults to #6366F1)
 * @param {string} props.buttonVariant - Optional button variant (defaults to 'primary')
 */
const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  iconColor = '#6366F1',
  buttonVariant = 'primary',
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={64} color={iconColor} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message && <Text style={[styles.message, { color: colors.text }]}>{message}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          variant={buttonVariant}
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: '80%',
  },
  button: {
    minWidth: 150,
  },
});

export default EmptyState; 