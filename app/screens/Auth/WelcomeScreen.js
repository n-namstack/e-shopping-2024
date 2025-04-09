import React from "react";
import { View, Text, StyleSheet, Image, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/ui/Button";
import { FONTS, COLORS } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const handleRegister = () => {
    navigation.navigate("Register");
  };

  const handleBrowseProducts = () => {
    navigation.navigate("Buyer", { screen: 'Home' });
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.surfaceMedium, COLORS.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.header}>
          <Image
            source={require("../../../assets/SHOPIT.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* <Text style={styles.appName}>E-Shopping Namibia</Text> */}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Welcome to E-Shopping!</Text>
          <Text style={styles.subtitle}>
            Your one-stop destination for online shopping in Namibia
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Login"
            variant="primary"
            size="lg"
            isFullWidth
            onPress={handleLogin}
            style={styles.loginButton}
            textStyle={styles.loginButtonTextStyle}
          />

          <Button
            title="Register"
            variant="outline"
            size="lg"
            isFullWidth
            onPress={handleRegister}
            style={styles.registerButton}
            textStyle={styles.registerttonTextStyle}
          />

          <Button
            title="Browse Products"
            variant="link"
            onPress={handleBrowseProducts}
            style={styles.browseButton}
            textStyle={styles.browseText}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#FFFFFF",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 35,
    padding: 10,
  },
  logo: {
    width: 170,
    height: 140,
    padding: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    fontFamily: FONTS.regular,
    // backgroundColor:"yellow"
  },
  title: {
    fontSize: 27,
    color: COLORS.primary,
    // backgroundColor:"red",
    textAlign: "center",
    marginBottom: 10,
    width: "100%",
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLighter,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: FONTS.regular,
  },
  buttonContainer: {
    marginBottom: 40,
    fontFamily: FONTS.regular,
  },
  loginButton: {
    marginBottom: 12,
  },

  loginButtonTextStyle: {
    fontFamily: FONTS.regular,
  },

  registerButton: {
    marginBottom: 20,
  },

  registerttonTextStyle: {
    fontFamily: FONTS.regular,
  },

  browseButton: {
    marginTop: 10,
  },
  browseText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
  },
  linearGradient: {
    flex: 1,
  },
});

export default WelcomeScreen;
