import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';

/**
 * EmptyState component for displaying empty screens with an action button
 * 
 * @param {Object} props
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.title - Main title text
 * @param {string} props.message - Optional descriptive message
 * @param {string} props.actionLabel - Text for the action button
 * @param {function} props.onAction - Function to call when button is pressed
 * @param {string} props.iconColor - Optional icon color (defaults to #007AFF)
 * @param {string} props.buttonVariant - Optional button variant (defaults to 'primary')
 */
const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  iconColor = '#007AFF',
  buttonVariant = 'primary',
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
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