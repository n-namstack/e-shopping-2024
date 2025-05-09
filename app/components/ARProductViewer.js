import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const ARProductViewer = ({ visible, onClose, product }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Animation values
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  
  // Background options for AR simulation (using remote URLs instead of local assets)
  const backgroundOptions = [
    { uri: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&q=80&w=1080' },
    { uri: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?ixlib=rb-4.0.3&q=80&w=1080' },
    { uri: 'https://images.unsplash.com/photo-1556911220-bda9f7f7597e?ixlib=rb-4.0.3&q=80&w=1080' },
    { uri: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-4.0.3&q=80&w=1080' },
  ];
  
  // Pan responder for dragging the product
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  // Initialize AR view (simulated for compatibility)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPermission(true);
      setLoading(false);
      // Set a default background
      setBackgroundImage(backgroundOptions[0]);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [visible]);
  
  // Handle scaling the product
  const handleScale = (increase) => {
    const newValue = scale._value + (increase ? 0.1 : -0.1);
    if (newValue >= 0.5 && newValue <= 2.5) {
      scale.setValue(newValue);
    }
  };
  
  // Handle rotating the product
  const handleRotate = () => {
    const newValue = rotate._value + 45;
    rotate.setValue(newValue);
  };
  
  // Change background
  const changeBackground = () => {
    const currentIndex = backgroundOptions.findIndex(bg => 
      bg.uri === backgroundImage?.uri
    );
    const nextIndex = (currentIndex + 1) % backgroundOptions.length;
    setBackgroundImage(backgroundOptions[nextIndex]);
  };
  
  // Close tutorial
  const closeTutorial = () => {
    setShowTutorial(false);
  };
  
  // Reset product position
  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
      }),
      Animated.spring(rotate, {
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start();
  };
  
  if (loading || hasPermission === null) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Preparing AR Experience...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Background Image (simulating a room) */}
        <Image 
          source={backgroundImage} 
          style={styles.backgroundImage} 
          resizeMode="cover"
        />
        
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AR View</Text>
            <TouchableOpacity style={styles.changeBackgroundButton} onPress={changeBackground}>
              <MaterialIcons name="style" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Product Overlay */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.productOverlay,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: scale },
                  { rotate: rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg']
                  }) }
                ]
              }
            ]}
          >
            <Image
              source={{ uri: product?.images?.[0] || 'https://via.placeholder.com/200' }}
              style={styles.productImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => handleScale(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => handleScale(false)}>
              <Ionicons name="remove" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleRotate}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={resetPosition}>
              <Ionicons name="refresh-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Drag to move • Use buttons to resize and rotate
            </Text>
          </View>
          
          {/* Tutorial Overlay */}
          {showTutorial && (
            <View style={styles.tutorialOverlay}>
              <View style={styles.tutorialCard}>
                <Text style={styles.tutorialTitle}>How to use AR View</Text>
                <View style={styles.tutorialStep}>
                  <Ionicons name="hand" size={24} color={COLORS.primary} />
                  <Text style={styles.tutorialText}>Drag the product to position it</Text>
                </View>
                <View style={styles.tutorialStep}>
                  <Ionicons name="resize" size={24} color={COLORS.primary} />
                  <Text style={styles.tutorialText}>Use + and - buttons to resize</Text>
                </View>
                <View style={styles.tutorialStep}>
                  <Ionicons name="refresh" size={24} color={COLORS.primary} />
                  <Text style={styles.tutorialText}>Rotate to change orientation</Text>
                </View>
                <View style={styles.tutorialStep}>
                  <MaterialIcons name="style" size={24} color={COLORS.primary} />
                  <Text style={styles.tutorialText}>Change background to see in different rooms</Text>
                </View>
                <TouchableOpacity style={styles.tutorialButton} onPress={closeTutorial}>
                  <Text style={styles.tutorialButtonText}>Got it!</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  changeBackgroundButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  productOverlay: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    top: height / 2 - 100,
    left: width / 2 - 100,
  },
  productImage: {
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'column',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.regular,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.medium,
    marginTop: 20,
  },
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tutorialCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  tutorialTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  tutorialText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginLeft: 10,
    flex: 1,
  },
  tutorialButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
});

export default ARProductViewer;
