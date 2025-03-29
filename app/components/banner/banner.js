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
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [animatedBanners, setAnimatedBanners] = useState({});
  const [visibleBannerIndex, setVisibleBannerIndex] = useState(0);

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
    }, 6000);

    return () => clearInterval(intervalId);
  }, [scrollPosition, banners.length, screenWidth]);

  const handleScroll = (event) => {
    const newScrollPosition = event.nativeEvent.contentOffset.x;
    const newVisibleBannerIndex = Math.round(newScrollPosition / screenWidth);
    setVisibleBannerIndex(newVisibleBannerIndex);
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.carouselContainer}
      contentContainerStyle={{ width: banners.length * screenWidth }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {banners.map((banner, index) => {
        const opacity = useRef(new Animated.Value(1)).current;

        useEffect(() => {
          if (index === visibleBannerIndex) {
            setAnimatedBanners((prev) => ({ ...prev, [index]: true }));

            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.delay(3000),
              Animated.timing(opacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]).start(() =>
              setAnimatedBanners((prev) => ({ ...prev, [index]: false }))
            );
          } else if (
            !animatedBanners[index] &&
            animatedBanners[index] !== undefined
          ) {
            opacity.setValue(1);
          }
        }, [visibleBannerIndex, index]); // Corrected closing parenthesis here

        const nextIndex = (index + 1) % banners.length; // Get the next banner index

        return (
          <View key={index} style={{ width: screenWidth, overflow: 'hidden' }}>
            <View style={styles.bannerContainer}>
              <View style={styles.bannerFull}>
                <Image
                  source={{ uri: banners[nextIndex].imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <Animated.Image
                  source={{ uri: banner.imageUrl }}
                  style={[styles.bannerImage, { opacity }]}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    paddingVertical: 10,
  },
  bannerContainer: {
    width: '100%',
    height: 200,
  },
  bannerFull: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '95%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default AnimatedBannerCarousel;
