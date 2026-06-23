import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../constants/theme";

const { width, height } = Dimensions.get("window");

const AnimatedSplash = ({ isReady, onHide }) => {
  // ── Entrance animations ──────────────────────────────────────────
  const logoScale   = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(28)).current;
  const titleOp     = useRef(new Animated.Value(0)).current;
  const taglineOp   = useRef(new Animated.Value(0)).current;

  // ── Pulse ring ──────────────────────────────────────────────────
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // ── Floating bubbles ────────────────────────────────────────────
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;

  // ── Loading dots ─────────────────────────────────────────────────
  const dot1Op = useRef(new Animated.Value(0.25)).current;
  const dot2Op = useRef(new Animated.Value(0.25)).current;
  const dot3Op = useRef(new Animated.Value(0.25)).current;

  // ── Exit ─────────────────────────────────────────────────────────
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale   = useRef(new Animated.Value(1)).current;

  // Refs to stop loops on unmount
  const loopsRef = useRef([]);

  useEffect(() => {
    // 1. Entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, damping: 10, stiffness: 100, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY,  { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOp, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      // 2. Pulse ring starts after logo is visible
      const ringLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1,   duration: 0,    useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.5, duration: 0,    useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringScale,   { toValue: 1.65, duration: 1400, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0,    duration: 1400, useNativeDriver: true }),
          ]),
          Animated.delay(600),
        ])
      );
      ringLoop.start();
      loopsRef.current.push(ringLoop);
    });

    // 3. Floating bubbles
    const floatBubble = (anim, toVal, dur, delay) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: toVal,  duration: dur, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,       duration: dur, useNativeDriver: true }),
        ])
      );
      loop.start();
      loopsRef.current.push(loop);
    };
    floatBubble(bubble1Y, -18, 2600, 0);
    floatBubble(bubble2Y, -12, 3200, 900);
    floatBubble(bubble3Y, -22, 2000, 400);

    // 4. Loading dots stagger
    const pulseDot = (anim, delay) => {
      setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1,    duration: 380, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.25, duration: 380, useNativeDriver: true }),
          ])
        );
        loop.start();
        loopsRef.current.push(loop);
      }, delay);
    };
    pulseDot(dot1Op, 0);
    pulseDot(dot2Op, 200);
    pulseDot(dot3Op, 400);

    return () => { loopsRef.current.forEach((l) => l.stop()); };
  }, []);

  // Exit animation when app is ready
  useEffect(() => {
    if (!isReady) return;
    loopsRef.current.forEach((l) => l.stop());
    Animated.parallel([
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(exitScale,   { toValue: 0.92, duration: 500, useNativeDriver: true }),
    ]).start(() => onHide?.());
  }, [isReady]);

  return (
    <Animated.View style={[s.root, { opacity: exitOpacity, transform: [{ scale: exitScale }] }]}>
      <LinearGradient
        colors={["#1E1B4B", "#312E81", "#4F46E5"]}
        style={s.bg}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      >
        {/* ── Decorative bubbles ──────────────────────────────────── */}
        <Animated.View style={[s.bubble, { width: 240, height: 240, top: -100, right: -80, transform: [{ translateY: bubble1Y }] }]} />
        <Animated.View style={[s.bubble, { width: 130, height: 130, top: height * 0.28, left: -50, transform: [{ translateY: bubble2Y }] }]} />
        <Animated.View style={[s.bubble, { width: 90,  height: 90,  bottom: 140, right: 24, transform: [{ translateY: bubble3Y }] }]} />
        <Animated.View style={[s.bubble, { width: 60,  height: 60,  bottom: height * 0.35, left: 40, transform: [{ translateY: bubble3Y }] }]} />

        {/* ── Center ──────────────────────────────────────────────── */}
        <View style={s.center}>
          {/* Pulse ring behind logo */}
          <View style={s.logoStack}>
            <Animated.View style={[s.pulseRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

            {/* Logo */}
            <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              <Image
                source={require("../../assets/logo-hero.png")}
                style={s.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          {/* Title */}
          <Animated.View style={{ opacity: titleOp, transform: [{ translateY: titleY }], alignItems: "center" }}>
            <Text style={s.title}>ShopIt</Text>
            <View style={s.titleUnderline} />
          </Animated.View>

          {/* Tagline */}
          <Animated.Text style={[s.tagline, { opacity: taglineOp }]}>
            Discover local. Shop smart.
          </Animated.Text>
        </View>

        {/* ── Loading dots ────────────────────────────────────────── */}
        <View style={s.dotsRow}>
          <Animated.View style={[s.dot, { opacity: dot1Op }]} />
          <Animated.View style={[s.dot, { opacity: dot2Op }]} />
          <Animated.View style={[s.dot, { opacity: dot3Op }]} />
        </View>

        {/* ── Bottom tagline ───────────────────────────────────────── */}
        <Animated.Text style={[s.bottomText, { opacity: taglineOp }]}>
          Made for Namibia 🇳🇦
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  bg:   { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },

  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  center:    { alignItems: "center", justifyContent: "center", flex: 1 },
  logoStack: { alignItems: "center", justifyContent: "center", marginBottom: 32 },

  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },

  logoWrap: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  logo: { width: 100, height: 100 },

  title: {
    fontSize: 42,
    fontFamily: FONTS.bold,
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 8,
  },
  titleUnderline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  tagline: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.5,
    marginTop: 16,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  bottomText: {
    position: "absolute",
    bottom: 40,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.3,
  },
});

export default AnimatedSplash;
