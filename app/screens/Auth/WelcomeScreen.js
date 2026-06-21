import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Animated,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import Button from "../../components/ui/Button";
import { FONTS } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFonts,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";

const { width, height } = Dimensions.get("window");

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.spring(cardAnim,  { toValue: 0, tension: 55, friction: 10, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar style="light" />

      {/* Hero gradient */}
      <LinearGradient
        colors={["#312E81", "#4338CA", "#6366F1"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.hero}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circleTL]} />
        <View style={[styles.circle, styles.circleBR]} />
        <View style={[styles.circle, styles.circleMid]} />

        <SafeAreaView style={styles.heroContent}>
          {/* Badge */}
          <Animated.View style={[styles.badge, { opacity: fadeAnim }]}>
            <Text style={styles.badgeText}>🛍  Namibia's #1 Shopping App</Text>
          </Animated.View>

          {/* Logo */}
          <Animated.View style={{
            transform: [
              { scale: logoAnim.interpolate({ inputRange: [0,1], outputRange: [0.7, 1] }) },
              { translateY: logoAnim.interpolate({ inputRange: [0,1], outputRange: [30, 0] }) },
            ],
            opacity: logoAnim,
          }}>
            <Image
              source={require("../../../assets/logo-hero.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Bottom card */}
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ translateY: cardAnim }], opacity: fadeAnim }]}>
        <View style={[styles.cardHandle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.text }]}>Welcome to E-Shopping!</Text>
        <Text style={styles.subtitle}>
          Your one-stop destination for online shopping in Namibia
        </Text>

        <View style={styles.buttons}>
          <Button
            title="Login"
            variant="primary"
            size="lg"
            isFullWidth
            onPress={() => navigation.navigate("Login")}
            style={styles.loginBtn}
          />
          <Button
            title="Create Account"
            variant="outline"
            size="lg"
            isFullWidth
            onPress={() => navigation.navigate("Register")}
            style={styles.registerBtn}
          />
          <Button
            title="Browse without signing in"
            variant="text"
            onPress={() => navigation.navigate("Buyer", { screen: "Home" })}
            textStyle={styles.browseText}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const HERO_HEIGHT = height * 0.56;

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: { height: HERO_HEIGHT },
  heroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },

  // Decorative blobs
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circleTL: { width: 200, height: 200, top: -60, left: -60 },
  circleBR: { width: 260, height: 260, bottom: -80, right: -80 },
  circleMid: { width: 120, height: 120, top: "30%", right: "10%" },

  // Badge
  badge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: { color: "#fff", fontSize: 13, fontFamily: FONTS.medium },

  // Logo
  logo: { width: width * 0.72, height: width * 0.68 },

  // Bottom card
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 10,
    marginTop: -28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  cardHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontFamily: FONTS.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  buttons: { gap: 12 },
  loginBtn: { marginBottom: 0 },
  registerBtn: { marginBottom: 0 },
  browseText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontFamily: FONTS.medium,
    textAlign: "center",
  },
});

export default WelcomeScreen;
