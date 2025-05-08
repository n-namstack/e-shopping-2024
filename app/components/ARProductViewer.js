import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import * as Permissions from 'expo-permissions';

const { width, height } = Dimensions.get('window');

const ARProductViewer = ({ visible, onClose, product }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [productPlaced, setProductPlaced] = useState(false);
  const [productPosition, setProductPosition] = useState({ x: width / 2, y: height / 2 });
  const [productScale, setProductScale] = useState(1);
  const [productRotation, setProductRotation] = useState(0);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to use the AR feature',
          [{ text: 'OK', onPress: onClose }]
        );
      }
      
      setLoading(false);
    })();
  }, []);

  // Handle camera ready state
  const handleCameraReady = () => {
    setCameraReady(true);
    setTimeout(() => {
      setProductPlaced(true);
    }, 1000);
  };

  // Handle product placement
  const handlePlaceProduct = (event) => {
    if (!productPlaced) return;
    
    const { locationX, locationY } = event.nativeEvent;
    setProductPosition({ x: locationX, y: locationY });
  };

  // Handle product scaling
  const handleScale = (increase) => {
    setProductScale(prevScale => {
      const newScale = increase ? prevScale + 0.1 : prevScale - 0.1;
      return Math.max(0.5, Math.min(newScale, 2.5));
    });
  };

  // Handle product rotation
  const handleRotate = () => {
    setProductRotation(prevRotation => prevRotation + 45);
  };

  // Handle taking a screenshot
  const handleTakeScreenshot = () => {
    Alert.alert(
      'Feature Coming Soon',
      'The ability to save AR screenshots will be available in the next update!',
      [{ text: 'OK' }]
    );
  };

  if (hasPermission === null || loading) {
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

  if (hasPermission === false) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off-outline" size={64} color={COLORS.gray} />
          <Text style={styles.permissionText}>Camera permission is required for AR</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
        <Camera
          style={styles.camera}
          onCameraReady={handleCameraReady}
          ratio="16:9"
        >
          <View style={styles.overlay}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>AR View</Text>
              <TouchableOpacity style={styles.screenshotButton} onPress={handleTakeScreenshot}>
                <Ionicons name="camera" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Product Overlay */}
            {productPlaced && (
              <TouchableOpacity
                activeOpacity={1}
                style={[
                  styles.productOverlay,
                  {
                    left: productPosition.x - (100 * productScale) / 2,
                    top: productPosition.y - (100 * productScale),
                    transform: [
                      { scale: productScale },
                      { rotate: `${productRotation}deg` }
                    ]
                  }
                ]}
                onPress={handlePlaceProduct}
              >
                <Image
                  source={{ uri: product?.images?.[0] || 'https://via.placeholder.com/200' }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            {/* Instruction */}
            {cameraReady && !productPlaced && (
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Scanning environment...
                </Text>
              </View>
            )}

            {/* Controls */}
            {productPlaced && (
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
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {productPlaced
                  ? 'Tap to place • Pinch to resize • Rotate with buttons'
                  : 'Preparing AR view...'}
              </Text>
            </View>
          </View>
        </Camera>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
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
  screenshotButton: {
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
  },
  productImage: {
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  instructionContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.medium,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
});

export default ARProductViewer;
