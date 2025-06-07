import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageZoom = ({ 
  imageUri, 
  width = screenWidth, 
  height = 400,
  minZoom = 1,
  maxZoom = 3,
  style,
  resizeMode = 'contain',
  onSwipeLeft,
  onSwipeRight
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(minZoom, Math.min(maxZoom, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < minZoom) {
        scale.value = withTiming(minZoom);
        savedScale.value = minZoom;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        const maxTranslateX = (width * (scale.value - 1)) / 2;
        const maxTranslateY = (height * (scale.value - 1)) / 2;
        
        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, savedTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, savedTranslateY.value + event.translationY)
        );
      }
    })
    .onEnd((event) => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      
      // Handle swipe gestures when not zoomed
      if (scale.value <= 1) {
        const swipeThreshold = 50;
        const swipeVelocityThreshold = 500;
        
        if (Math.abs(event.translationX) > swipeThreshold || Math.abs(event.velocityX) > swipeVelocityThreshold) {
          if (event.translationX > 0 || event.velocityX > 0) {
            // Swipe right
            runOnJS(onSwipeRight)?.();
          } else {
            // Swipe left
            runOnJS(onSwipeLeft)?.();
          }
        }
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(
    Gesture.Race(doubleTapGesture, pinchGesture),
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <Image
            source={{ uri: imageUri }}
            style={{ width, height }}
            resizeMode={resizeMode}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default ImageZoom; 