import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import VirtualAssistant from './VirtualAssistant';

const { width } = Dimensions.get('window');

const AssistantButton = ({ navigation }) => {
  const [isAssistantVisible, setIsAssistantVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  
  // Show tooltip after 3 seconds on first render
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Hide tooltip after 5 seconds
      const hideTimer = setTimeout(() => {
        Animated.timing(tooltipAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowTooltip(false));
      }, 5000);
      
      return () => clearTimeout(hideTimer);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Button press animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePress = () => {
    setIsAssistantVisible(true);
    setShowTooltip(false);
    Animated.timing(tooltipAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.container}
      >
        <Animated.View 
          style={[
            styles.button,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </Animated.View>
        
        {showTooltip && (
          <Animated.View 
            style={[
              styles.tooltip,
              { opacity: tooltipAnim }
            ]}
          >
            <Text style={styles.tooltipText}>
              Need help? Ask me anything!
            </Text>
            <View style={styles.tooltipArrow} />
          </Animated.View>
        )}
      </TouchableOpacity>
      
      <VirtualAssistant 
        isVisible={isAssistantVisible}
        onClose={() => setIsAssistantVisible(false)}
        navigation={navigation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    zIndex: 999,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  tooltip: {
    position: 'absolute',
    right: 64,
    top: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  tooltipArrow: {
    position: 'absolute',
    right: -8,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderLeftWidth: 8,
    borderLeftColor: '#fff',
  },
});

export default AssistantButton;
