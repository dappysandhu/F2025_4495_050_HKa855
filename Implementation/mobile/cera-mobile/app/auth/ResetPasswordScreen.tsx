import React, { useState } from "react";
import { TextInput, TouchableOpacity, StyleSheet, Alert , useColorScheme } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/config";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const scheme = useColorScheme();
  const C = Colors[scheme || "light"];

  const handleReset = async () => {
    if (!password) return Alert.alert("Missing Password", "Enter a new password");

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();
      setLoading(false);

      Alert.alert("Success", data.message);
      router.push("/auth/login");
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Unable to reset password");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: C.background }]}>
      
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color={C.text} />
      </TouchableOpacity>

      <ThemedText type="title" style={styles.title}>
        Reset Password
      </ThemedText>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: C.background,
            color: C.text,
            borderColor: C.icon,
          },
        ]}
        placeholder="Enter new password"
        placeholderTextColor={C.icon}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#C04A2B" }]}
        onPress={handleReset}
        disabled={loading}
      >
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>
          {loading ? "Updating..." : "Reset Password"}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 8,
  },
  title: {
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
});
