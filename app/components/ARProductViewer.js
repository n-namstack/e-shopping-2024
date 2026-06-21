import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  Platform,
  PanResponder,
  Animated,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../constants/theme';
import { removeBackground } from '../utils/backgroundRemoval';

const { width, height } = Dimensions.get('window');

const ROOMS = [
  {
    id: 0,
    label: 'Living Room',
    uri: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&q=80&w=1080',
  },
  {
    id: 1,
    label: 'Bedroom',
    uri: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?ixlib=rb-4.0.3&q=80&w=1080',
  },
  {
    id: 2,
    label: 'Kitchen',
    uri: 'https://images.unsplash.com/photo-1556911220-bda9f7f7597e?ixlib=rb-4.0.3&q=80&w=1080',
  },
  {
    id: 3,
    label: 'Office',
    uri: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-4.0.3&q=80&w=1080',
  },
];

const TUTORIAL_STEPS = [
  { icon: 'hand-left-outline',        text: 'Drag the product anywhere in the scene to place it' },
  { icon: 'add-circle-outline',       text: 'Use + and − to scale the product up or down' },
  { icon: 'refresh-outline',          text: 'Rotate clockwise or counter-clockwise with the arrow buttons' },
  { icon: 'home-outline',             text: 'Tap a room below to preview in different environments' },
];

const ARProductViewer = ({ visible, onClose, product }) => {
  const [loading, setLoading]                   = useState(true);
  const [currentRoom, setCurrentRoom]           = useState(0);
  const [showTutorial, setShowTutorial]         = useState(true);
  const [processedImageUri, setProcessedImageUri] = useState(null);
  const [bgRemoving, setBgRemoving]             = useState(false);

  const pan             = useRef(new Animated.ValueXY()).current;
  const scale           = useRef(new Animated.Value(1)).current;
  const rotate          = useRef(new Animated.Value(0)).current;
  const fadeAnim        = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { pan.flattenOffset(); },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setShowTutorial(true);
      setProcessedImageUri(null);
      loadingProgress.setValue(0);
      fadeAnim.setValue(0);
      pan.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      rotate.setValue(0);

      Animated.timing(loadingProgress, { toValue: 1, duration: 1300, useNativeDriver: false }).start();

      const timer = setTimeout(() => {
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }, 1400);

      // Kick off background removal in parallel — swaps in when ready
      const imageUrl = product?.images?.[0];
      if (imageUrl) {
        setBgRemoving(true);
        removeBackground(imageUrl).then((uri) => {
          if (uri) setProcessedImageUri(uri);
          setBgRemoving(false);
        });
      }

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleScale = (increase) => {
    const next = scale._value + (increase ? 0.15 : -0.15);
    if (next >= 0.35 && next <= 2.8) scale.setValue(next);
  };

  const handleRotate = (clockwise = true) => {
    rotate.setValue(rotate._value + (clockwise ? 45 : -45));
  };

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(pan,    { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: false }),
      Animated.spring(rotate, { toValue: 0, useNativeDriver: false }),
    ]).start();
  };

  // ── LOADING SCREEN ──
  if (loading) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
        <View style={styles.loadingRoot}>
          <LinearGradient colors={["#0D0D1F", "#1E1B4B", "#2E2A6E"]} style={StyleSheet.absoluteFill} />

          {/* Decorative blobs */}
          <View style={[styles.blob, { width: 260, height: 260, top: -80, right: -80, backgroundColor: 'rgba(99,102,241,0.12)' }]} />
          <View style={[styles.blob, { width: 200, height: 200, bottom: 40, left: -60, backgroundColor: 'rgba(139,92,246,0.1)' }]} />

          <View style={styles.loadingContent}>
            {/* Icon */}
            <View style={styles.loadingIconRing}>
              <LinearGradient colors={["rgba(99,102,241,0.25)", "rgba(99,102,241,0.05)"]} style={styles.loadingIconGrad}>
                <Ionicons name="cube-outline" size={44} color="#818CF8" />
              </LinearGradient>
            </View>

            <Text style={styles.loadingTitle}>AR Preview</Text>
            <Text style={styles.loadingSubtitle}>Preparing your virtual room…</Text>

            {/* Progress bar */}
            <View style={styles.loadingTrack}>
              <Animated.View style={[styles.loadingFill, {
                width: loadingProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>

            {/* Product name */}
            {product?.name && (
              <View style={styles.loadingProductPill}>
                <MaterialIcons name="storefront" size={13} color="#818CF8" />
                <Text style={styles.loadingProductName} numberOfLines={1}>{product.name}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  const room = ROOMS[currentRoom];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>

        {/* Background room image */}
        <Image source={{ uri: room.uri }} style={styles.background} resizeMode="cover" />

        {/* Top gradient scrim for header readability */}
        <LinearGradient
          colors={["rgba(0,0,0,0.65)", "rgba(0,0,0,0.2)", "transparent"]}
          style={styles.topScrim}
          pointerEvents="none"
        />

        {/* ── HEADER ── */}
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>AR Preview</Text>
              <View style={styles.roomLabelPill}>
                <Ionicons name="home-outline" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.roomLabelText}>{room.label}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowTutorial(true)}>
              <Ionicons name="help-circle-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* ── DRAGGABLE PRODUCT ── */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.productWrap,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale },
                { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
              ],
            },
          ]}
        >
          {/* Multi-layer cast shadow (far → near = wide+soft → tight+dark) */}
          <View style={styles.shadowFar} />
          <View style={styles.shadowMid} />
          <View style={styles.shadowNear} />

          {/* Product frame with depth shadow */}
          <View style={[styles.productFrame, processedImageUri && { opacity: 1 }]}>
            <Image
              source={{ uri: processedImageUri || product?.images?.[0] || 'https://via.placeholder.com/240' }}
              style={styles.productImage}
              resizeMode="contain"
            />
            {/* Directional lighting: warm highlight top-left → cool shadow bottom-right */}
            <LinearGradient
              colors={['rgba(255,248,210,0.16)', 'transparent', 'rgba(0,0,30,0.28)']}
              locations={[0, 0.38, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>

          {/* Background-removal status badge */}
          {bgRemoving && (
            <View style={styles.bgBadge}>
              <ActivityIndicator size={10} color="#818CF8" />
              <Text style={styles.bgBadgeText}>Removing bg…</Text>
            </View>
          )}
        </Animated.View>

        {/* ── RIGHT CONTROL PANEL ── */}
        <View style={styles.controlPanel}>
          {/* Scale group */}
          <TouchableOpacity style={styles.controlBtn} onPress={() => handleScale(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.controlSep} />
          <TouchableOpacity style={styles.controlBtn} onPress={() => handleScale(false)}>
            <Ionicons name="remove" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.controlGroupGap} />

          {/* Rotate group */}
          <TouchableOpacity style={styles.controlBtn} onPress={() => handleRotate(true)}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.controlSep} />
          <TouchableOpacity style={styles.controlBtn} onPress={() => handleRotate(false)}>
            <Ionicons name="refresh" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </TouchableOpacity>

          <View style={styles.controlGroupGap} />

          {/* Reset */}
          <TouchableOpacity style={[styles.controlBtn, styles.resetBtn]} onPress={resetPosition}>
            <MaterialIcons name="center-focus-strong" size={20} color="#818CF8" />
          </TouchableOpacity>
        </View>

        {/* ── BOTTOM AREA ── */}
        <View style={styles.bottomArea}>
          {/* Hint */}
          <View style={styles.hintPill}>
            <Ionicons name="hand-left-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.hintText}>Drag to move · Use buttons to resize and rotate</Text>
          </View>

          {/* Room thumbnails */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomStrip}
          >
            {ROOMS.map((r, i) => {
              const active = i === currentRoom;
              return (
                <TouchableOpacity key={r.id} style={styles.roomThumbWrap} onPress={() => setCurrentRoom(i)}>
                  <View style={[styles.roomThumbFrame, active && styles.roomThumbFrameActive]}>
                    <Image source={{ uri: r.uri }} style={styles.roomThumbImg} resizeMode="cover" />
                    {active && (
                      <View style={styles.roomThumbCheck}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.roomThumbLabel, active && styles.roomThumbLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── TUTORIAL OVERLAY ── */}
        {showTutorial && (
          <View style={styles.tutorialOverlay}>
            <View style={styles.tutorialCard}>
              {/* Indigo top glow */}
              <LinearGradient
                colors={["rgba(99,102,241,0.18)", "transparent"]}
                style={styles.tutorialGlow}
                pointerEvents="none"
              />

              <View style={styles.tutorialIconWrap}>
                <Ionicons name="cube" size={32} color="#818CF8" />
              </View>
              <Text style={styles.tutorialTitle}>How to Use AR Preview</Text>
              <Text style={styles.tutorialSubtitle}>Place this product in your space</Text>

              <View style={styles.tutorialSteps}>
                {TUTORIAL_STEPS.map((step, i) => (
                  <View key={i} style={styles.tutorialStep}>
                    <View style={styles.tutorialStepIcon}>
                      <Ionicons name={step.icon} size={17} color="#818CF8" />
                    </View>
                    <Text style={styles.tutorialText}>{step.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity activeOpacity={0.88} style={styles.tutorialBtnShadow} onPress={() => setShowTutorial(false)}>
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tutorialBtn}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.tutorialBtnText}>Start Exploring</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999 },

  // ── Loading ──
  loadingRoot:    { flex: 1 },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingIconRing: { marginBottom: 28 },
  loadingIconGrad: {
    width: 92, height: 92, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.45)',
  },
  loadingTitle:    { fontSize: 26, fontFamily: FONTS.bold,    color: '#fff', marginBottom: 8 },
  loadingSubtitle: { fontSize: 14, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.55)', marginBottom: 32 },
  loadingTrack: {
    width: 180, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 24,
  },
  loadingFill: { height: '100%', borderRadius: 2, backgroundColor: '#6366F1' },
  loadingProductPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },
  loadingProductName: {
    fontSize: 13, fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.75)', maxWidth: 220,
  },

  // ── Main ──
  root:       { flex: 1, backgroundColor: '#000' },
  background: { position: 'absolute', width: '100%', height: '100%' },
  topScrim:   { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },

  // ── Header ──
  headerSafe:   { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter:  { alignItems: 'center', gap: 4 },
  headerTitle:   { color: '#fff', fontSize: 17, fontFamily: FONTS.semiBold },
  roomLabelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  roomLabelText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: FONTS.medium },

  // ── Product ──
  productWrap: {
    position: 'absolute',
    width: 240,
    top: height / 2 - 125,
    left: width / 2 - 120,
    alignItems: 'center',
  },
  productFrame: {
    width: 230, height: 230,
    overflow: 'hidden',
    opacity: 0.92,
    // Outer frame shadow gives depth against any background
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 14 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 12,
  },
  productImage: { width: '100%', height: '100%' },

  // Background-removal badge
  bgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.4)',
  },
  bgBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: FONTS.medium },

  // Multi-layer ground shadow (wide+faint → tight+dark)
  shadowFar: {
    width: 215, height: 38, borderRadius: 108,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginTop: 6,
  },
  shadowMid: {
    width: 162, height: 20, borderRadius: 81,
    backgroundColor: 'rgba(0,0,0,0.14)',
    marginTop: -14,
  },
  shadowNear: {
    width: 108, height: 11, borderRadius: 54,
    backgroundColor: 'rgba(0,0,0,0.34)',
    marginTop: -8,
  },

  // ── Control panel ──
  controlPanel: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -130,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    overflow: 'hidden',
    paddingVertical: 4,
    width: 52,
  },
  controlBtn:      { width: 52, height: 50, justifyContent: 'center', alignItems: 'center' },
  controlSep:      { height: 1, marginHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  controlGroupGap: { height: 10 },
  resetBtn:        { backgroundColor: 'rgba(99,102,241,0.22)' },

  // ── Bottom ──
  bottomArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  hintPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  hintText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: FONTS.medium },

  // Room strip
  roomStrip:       { paddingHorizontal: 16, gap: 12, paddingBottom: 2 },
  roomThumbWrap:   { alignItems: 'center', gap: 5 },
  roomThumbFrame: {
    width: 64, height: 64, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  roomThumbFrameActive: { borderColor: '#6366F1', borderWidth: 2.5 },
  roomThumbImg:    { width: '100%', height: '100%' },
  roomThumbCheck: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(99,102,241,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  roomThumbLabel:       { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: FONTS.medium },
  roomThumbLabelActive: { color: '#fff', fontFamily: FONTS.semiBold },

  // ── Tutorial ──
  tutorialOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 20, padding: 24,
  },
  tutorialCard: {
    backgroundColor: 'rgba(14,14,26,0.97)',
    borderRadius: 26, padding: 24, width: '100%',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center', overflow: 'hidden',
  },
  tutorialGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  tutorialIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.35)',
    marginBottom: 16,
  },
  tutorialTitle:    { fontSize: 20, fontFamily: FONTS.bold,    color: '#fff', marginBottom: 4 },
  tutorialSubtitle: { fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.45)', marginBottom: 22 },
  tutorialSteps:    { width: '100%', marginBottom: 6 },
  tutorialStep:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  tutorialStepIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.14)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  tutorialText: {
    fontSize: 13, fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.72)', flex: 1, lineHeight: 20, marginTop: 6,
  },
  tutorialBtnShadow: {
    width: '100%', borderRadius: 14, marginTop: 10,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  tutorialBtn:     { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  tutorialBtnText: { color: '#fff', fontSize: 16, fontFamily: FONTS.semiBold },
});

export default ARProductViewer;
