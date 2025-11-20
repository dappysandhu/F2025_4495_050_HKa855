import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "@/constants/config";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import BackHeader from "@/components/ui/BackHeader";

export default function EditProfileScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const scheme = useColorScheme() || "light";
  const C = Colors[scheme as "light" | "dark"];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const u = res.data;
      setUsername(u.username || "");
      setEmail(u.email || "");
      setPhone(u.phone || "");
      setSkills(u.skills ? u.skills.join(", ") : "");
    } catch (e) {
      console.error("Load profile error:", e);
      Alert.alert("Error", "Unable to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
  if (!username) {
    Alert.alert("Error", "Username is required");
    return;
  }

  setSaving(true);
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const payload = {
      username,
      email,
      phone,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const res = await axios.patch(`${API_BASE_URL}/users/me`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    Alert.alert("Success", res.data.message || "Profile updated successfully");
    router.back();
  } catch (err: any) {
    console.error("Save profile error:", err);
    Alert.alert("Error", err.response?.data?.message || "Failed to update profile");
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <ThemedText style={{ marginTop: 10, color: C.text }}>
          Loading Profile...
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      {/* ✅ Same header as My Tasks */}
      <BackHeader title="Edit Profile" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ThemedText type="title" style={[styles.title, { color: C.text }]}>
          Edit Profile
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: C.background, color: C.text, borderColor: C.icon },
          ]}
          placeholder="Enter your name"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor={C.icon}
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                scheme === "dark" ? "rgba(255,255,255,0.05)" : "#f1f1f1",
              color: C.subtext,
              borderColor: C.icon,
            },
          ]}
          placeholder="Email"
          value={email}
          editable={false}
          placeholderTextColor={C.icon}
        />

        <TextInput
          style={[
            styles.input,
            { backgroundColor: C.background, color: C.text, borderColor: C.icon },
          ]}
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={C.icon}
        />

        <TextInput
          style={[
            styles.input,
            { backgroundColor: C.background, color: C.text, borderColor: C.icon },
          ]}
          placeholder="Enter your skills (comma separated)"
          value={skills}
          onChangeText={setSkills}
          multiline
          placeholderTextColor={C.icon}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#C04A2B" }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Save Changes
            </ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    marginVertical: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 30,
    alignItems: "center",
    backgroundColor: "#C04A2B",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
