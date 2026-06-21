import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import Button from "../../components/ui/Button";
import supabase from "../../lib/supabase";

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "com.namstack.eshoppit://reset-password",
      });

      if (error) throw error;

      setResetSent(true);
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Forgot Password
          </Text>
          {!resetSent ? (
            <Text
              style={[styles.subtitle, { color: isDarkMode ? "#aaa" : "#666" }]}
            >
              Enter your email address and we'll send you a link to reset your
              password
            </Text>
          ) : (
            <Text
              style={[styles.subtitle, { color: isDarkMode ? "#aaa" : "#666" }]}
            >
              Password reset email sent! Check your inbox for instructions
            </Text>
          )}
        </View>

        {!resetSent ? (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={isDarkMode ? "#666" : "#aaa"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <Button
              title="Reset Password"
              variant="primary"
              size="lg"
              isFullWidth
              isLoading={loading}
              onPress={handleResetPassword}
              style={styles.resetButton}
            />
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color="#4CAF50"
              style={styles.successIcon}
            />
            <Text
              style={[
                styles.successText,
                { color: isDarkMode ? "#aaa" : "#666" },
              ]}
            >
              We've sent a password reset link to your email. Please check your
              inbox and follow the instructions.
            </Text>
            <Button
              title="Back to Login"
              textStyle={{ color: colors.text }}
              variant="outline"
              size="lg"
              isFullWidth
              onPress={() => navigation.navigate("Login")}
              style={[styles.backToLoginButton, { borderColor: colors.border }]}
            />
          </View>
        )}

        <View style={styles.helpContainer}>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.helpText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    marginTop: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginTop: 30,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  resetButton: {
    marginTop: 10,
  },
  helpContainer: {
    marginTop: "auto",
    alignItems: "center",
    padding: 20,
  },
  helpText: {
    color: "#007AFF",
    fontSize: 16,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  backToLoginButton: {
    marginTop: 20,
  },
});

export default ForgotPasswordScreen;
