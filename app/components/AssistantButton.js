import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../constants/theme';
import VirtualAssistant from './VirtualAssistant';

// Minimal color palette (matching VirtualAssistant)
const MINIMAL_COLORS = {
  background: '#FFFFFF',
  text: '#111827',
  textMuted: '#9CA3AF',
  accent: '#111827',
  border: '#E5E7EB',
};

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
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Hide tooltip after 4 seconds
      const hideTimer = setTimeout(() => {
        Animated.timing(tooltipAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowTooltip(false));
      }, 4000);

      return () => clearTimeout(hideTimer);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Button press animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    setIsAssistantVisible(true);
    setShowTooltip(false);
    Animated.timing(tooltipAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <View style={styles.container}>
        {showTooltip && (
          <Animated.View
            style={[
              styles.tooltip,
              {
                opacity: tooltipAnim,
                transform: [{
                  translateX: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  })
                }]
              }
            ]}
          >
            <Text style={styles.tooltipText}>Ask me anything</Text>
          </Animated.View>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
        >
          <Animated.View
            style={[
              styles.button,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Feather name="message-circle" size={22} color={MINIMAL_COLORS.background} />
          </Animated.View>
        </TouchableOpacity>
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MINIMAL_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tooltip: {
    marginRight: 12,
    backgroundColor: MINIMAL_COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: MINIMAL_COLORS.text,
  },
});

export default AssistantButton;
