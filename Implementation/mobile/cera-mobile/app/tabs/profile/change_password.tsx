import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackHeader from "@/components/ui/BackHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/config";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";


export default function ChangePasswordScreen() {
  const C = Colors[useColorScheme() || "dark"];
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // show/hide toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);

  const validatePassword = (pw: string) => {
    const regex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>]).{8,}$/;
    return regex.test(pw);
  };

  const save = async () => {
    if (!currentPassword || !newPassword || !confirm) {
      return Alert.alert("Error", "All fields are required.");
    }

    if (newPassword !== confirm) {
      return Alert.alert("Error", "New password and confirm password do not match.");
    }

    if (!validatePassword(newPassword)) {
      return Alert.alert(
        "Weak Password",
        "Password must contain:\n• Minimum 8 characters\n• One uppercase letter\n• One number\n• One special character"
      );
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      await axios.patch(
        `${API_BASE_URL}/users/me/password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Password updated successfully!");
      setTimeout(() => router.back(), 200);

    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || err?.response?.data?.error || "Unable to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Change Password" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ThemedText style={[styles.sectionTitle, { color: C.text }]}>
          Update Your Password
        </ThemedText>

        {/* CURRENT PASSWORD */}
        <View style={[styles.inputWrap, { borderColor: C.icon }]}>
          <TextInput
            placeholder="Current Password"
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={[styles.input, { color: C.text }]}
            placeholderTextColor={C.subtext}
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
            <Ionicons
              name={showCurrent ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={C.icon}
            />
          </TouchableOpacity>
        </View>

        {/* NEW PASSWORD */}
        <View style={[styles.inputWrap, { borderColor: C.icon }]}>
          <TextInput
            placeholder="New Password"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
            style={[styles.input, { color: C.text }]}
            placeholderTextColor={C.subtext}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons
              name={showNew ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={C.icon}
            />
          </TouchableOpacity>
        </View>

        {/* CONFIRM PASSWORD */}
        <View style={[styles.inputWrap, { borderColor: C.icon }]}>
          <TextInput
            placeholder="Confirm New Password"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            style={[styles.input, { color: C.text }]}
            placeholderTextColor={C.subtext}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons
              name={showConfirm ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={C.icon}
            />
          </TouchableOpacity>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.accent }]}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveText}>Update Password</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 20,
  },

  inputWrap: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
  },

  saveBtn: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },

  saveText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
});
