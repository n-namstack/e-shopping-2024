import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

const Product360View = ({
  images = [],
  width = screenWidth - 40,
  height = 400,
  autoRotate = false,
  autoRotateSpeed = 2000,
  style,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const translateX = useSharedValue(0);
  const autoRotateRef = useRef(null);

  const imageCount = images.length;
  const imageWidth = width / imageCount;

  React.useEffect(() => {
    if (isRotating && imageCount > 1) {
      autoRotateRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % imageCount);
      }, autoRotateSpeed);
    } else {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    }

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [isRotating, imageCount, autoRotateSpeed]);

  const updateCurrentIndex = (newIndex) => {
    setCurrentIndex(newIndex);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (imageCount > 1) {
        const progress = event.translationX / width;
        const newIndex = Math.round(
          interpolate(
            progress,
            [-1, 0, 1],
            [imageCount - 1, currentIndex, (currentIndex + 1) % imageCount],
            'clamp'
          )
        );
        translateX.value = event.translationX;
        runOnJS(updateCurrentIndex)(newIndex);
      }
    })
    .onEnd(() => {
      translateX.value = withTiming(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const toggleAutoRotate = () => {
    setIsRotating(!isRotating);
  };

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <Text style={styles.noImageText}>No 360° images available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="refresh" size={16} color={COLORS.white} />
          <Text style={styles.badgeText}>360° VIEW</Text>
        </View>
        <TouchableOpacity style={styles.controlButton} onPress={toggleAutoRotate}>
          <Ionicons 
            name={isRotating ? "pause" : "play"} 
            size={16} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.imageContainer, animatedStyle]}>
          <Image
            source={{ uri: images[currentIndex] }}
            style={{ width, height: height - 60 }}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>

      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          Drag to rotate • {currentIndex + 1} of {imageCount}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / imageCount) * 100}%` }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.lightGray,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.bold,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 12,
    backgroundColor: COLORS.lightGray,
  },
  instructionText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.lightGray2,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 1.5,
  },
  noImageText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 16,
    fontFamily: FONTS.medium,
    flex: 1,
    textAlignVertical: 'center',
  },
});

export default Product360View; 