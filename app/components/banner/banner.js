import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Animated,
  Image,
} from 'react-native';

const AnimatedBannerCarousel = ({ banners }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollViewRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');
  const animation = useRef(new Animated.Value(0)).current; // Animated value for opacity

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (scrollViewRef.current) {
        const nextPosition =
          scrollPosition + screenWidth >= banners.length * screenWidth
            ? 0
            : scrollPosition + screenWidth;

        scrollViewRef.current.scrollTo({ x: nextPosition, animated: true });
        setScrollPosition(nextPosition);
      }
    }, 4000); // Change banner every 4 seconds

    return () => clearInterval(intervalId); // Clear interval on unmount
  }, [scrollPosition, banners.length, screenWidth]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 800, // Fade in duration
        useNativeDriver: true,
      }),
      Animated.delay(2400), // Delay before fade out
      Animated.timing(animation, {
        toValue: 0,
        duration: 800, // Fade out duration
        useNativeDriver: true,
      }),
    ]).start(() => animation.setValue(0)); // Reset opacity after animation
  }, [scrollPosition, animation]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.carouselContainer}
      contentContainerStyle={{ width: banners.length * screenWidth }}
    >
      {banners.map((banner, index) => (
        <View key={index} style={{ width: screenWidth}}>
          <Animated.Image
            source={{ uri: banner.imageUrl }}
            style={[styles.bannerImage, { opacity: animation }]}
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    paddingVertical: 10,
    borderRadius: 10,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
});

export default AnimatedBannerCarousel;
