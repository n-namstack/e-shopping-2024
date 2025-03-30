import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NetworkErrorView = ({ 
  onRetry, 
  message = "Unable to connect to the server. Please check your internet connection and try again." 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="wifi-off" size={70} color="#333" />
      </View>
      
      <Text style={styles.title}>No Connection</Text>
      
      <Text style={styles.message}>{message}</Text>
      
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
      
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          If the problem persists, please check:
        </Text>
        <Text style={styles.helpItem}>• Your WiFi or mobile data is turned on</Text>
        <Text style={styles.helpItem}>• The server is running</Text>
        <Text style={styles.helpItem}>• Correct IP address is configured</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  helpItem: {
    fontSize: 14,
    color: '#64748b',
    marginVertical: 4,
  }
});

export default NetworkErrorView; 