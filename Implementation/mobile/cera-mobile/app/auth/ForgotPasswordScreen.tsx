import React, { useState } from "react";
import { TextInput, TouchableOpacity, StyleSheet, Alert , useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/config";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const scheme = useColorScheme();
  const C = Colors[scheme || "light"];

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Please enter your email");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      Alert.alert("Success", data.message);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Unable to send reset email");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: C.background }]}>
      
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color={C.text} />
      </TouchableOpacity>

      <ThemedText type="title" style={styles.title}>
        Forgot Password
      </ThemedText>

      {/* Input */}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: C.background,
            color: C.text,
            borderColor: C.icon,
          },
        ]}
        placeholder="Enter your email"
        placeholderTextColor={C.icon}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#C04A2B" }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>
          {loading ? "Sending..." : "Send Reset Link"}
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
