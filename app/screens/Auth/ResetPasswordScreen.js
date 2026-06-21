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

const ResetPasswordScreen = ({ onComplete }) => {
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      Alert.alert(
        "Password Updated",
        "Your password has been updated successfully. You can now log in with your new password.",
        [{ text: "OK", onPress: onComplete }]
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputBg = isDarkMode ? "#1E1E1E" : "#F5F5F5";
  const borderColor = isDarkMode ? "#333" : "#E0E0E0";
  const placeholderColor = isDarkMode ? "#666" : "#999";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Set New Password</Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? "#aaa" : "#666" }]}>
            Enter a new password for your account
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="lock-closed-outline" size={20} color={placeholderColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="New Password"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={placeholderColor}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="lock-closed-outline" size={20} color={placeholderColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirm New Password"
              placeholderTextColor={placeholderColor}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={placeholderColor}
              />
            </TouchableOpacity>
          </View>

          <Button
            title={loading ? "Updating..." : "Update Password"}
            onPress={handleUpdatePassword}
            disabled={loading}
            style={styles.button}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 80, marginBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 10 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  button: { marginTop: 8 },
});

export default ResetPasswordScreen;
