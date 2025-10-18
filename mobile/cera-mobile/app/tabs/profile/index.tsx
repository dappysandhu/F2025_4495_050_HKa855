import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "@/constants/config";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme || "light"];
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return setLoading(false);

      const res = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (e) {
      console.error("Profile load error:", e);
      Alert.alert("Error", "Could not load profile information.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/auth/login");
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator color="#C04A2B" size="large" />
        <ThemedText style={{ marginTop: 10 }}>Loading Profile...</ThemedText>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <Ionicons name="person-circle-outline" size={70} color="#C04A2B" />
        <ThemedText style={{ marginTop: 10, color: "#fff" }}>No user data available</ThemedText>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <ThemedText style={styles.logoutText}>Login Again</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <SafeAreaView>
        <View style={styles.profileHeader}>
          <Ionicons name="person-circle-outline" size={90} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.name}>
            {user.username}
          </ThemedText>
          <ThemedText style={styles.email}>{user.email}</ThemedText>
          <ThemedText style={styles.role}>{user.role?.toUpperCase()}</ThemedText>
          <TouchableOpacity style={styles.editBtn} disabled>
            <ThemedText style={styles.editText}>Edit Profile</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/tabs/profile/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>Notifications</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/tabs/profile/history")}
          >
            <Ionicons name="time-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>History</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/tabs/profile/tasks")}
          >
            <Ionicons name="list-outline" size={24} color="#fff" />
            <ThemedText style={styles.menuText}>My Tasks</ThemedText>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#C04A2B" />
            <ThemedText style={[styles.menuText, { color: "#C04A2B" }]}>
              Logout
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileHeader: { alignItems: "center", marginBottom: 30 },
  name: { fontSize: 22, color: "#fff", marginTop: 10 },
  email: { color: "#aaa", marginTop: 4 },
  role: { color: "#C04A2B", marginTop: 4, fontWeight: "600" },
  editBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
  editText: { color: "#fff", fontWeight: "600" },
  menu: { marginTop: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  menuText: { color: "#fff", fontSize: 16 },
  divider: { height: 1, backgroundColor: "#333", marginVertical: 14 },
  logoutBtn: {
    backgroundColor: "#C04A2B",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  logoutText: { color: "#fff", fontWeight: "700" },
});
