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
  const C = Colors[colorScheme || "light"];
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

  // ------------------ Loading ------------------
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.accent} size="large" />
        <ThemedText style={{ marginTop: 10, color: C.text }}>
          Loading Profile...
        </ThemedText>
      </SafeAreaView>
    );
  }

  // ------------------ No User ------------------
  if (!user) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <Ionicons name="person-circle-outline" size={70} color={C.accent} />
        <ThemedText style={{ marginTop: 10, color: C.text }}>
          No user data available
        </ThemedText>
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: C.accent }]}
          onPress={handleLogout}
        >
          <ThemedText style={[styles.logoutText, { color: "#fff" }]}>
            Login Again
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ------------------ Main Profile ------------------
  return (
    <ThemedView style={[styles.container, { backgroundColor: C.background }]}>
      <SafeAreaView>
        <View style={styles.profileHeader}>
          <Ionicons name="person-circle-outline" size={90} color={C.accent} />
          <ThemedText type="defaultSemiBold" style={[styles.name, { color: C.text }]}>
            {user.username}
          </ThemedText>
          <ThemedText style={[styles.email, { color: C.subtext }]}>
            {user.email}
          </ThemedText>
          <ThemedText style={[styles.role, { color: C.accent }]}>
            {user.role?.toUpperCase()}
          </ThemedText>

         <TouchableOpacity
           style={[
             styles.editBtn,
             { backgroundColor: colorScheme === "dark" ? "#BC4B2F" : C.tint },
           ]}
           disabled
         >
           <ThemedText style={[styles.editText, { color: "#fff" }]}>
             Edit Profile
           </ThemedText>
         </TouchableOpacity>

        </View>

        {/* Menu Section */}
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/tabs/profile/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color={C.icon} />
            <ThemedText style={[styles.menuText, { color: C.text }]}>
              Notifications
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/tabs/profile/history")}
          >
            <Ionicons name="time-outline" size={24} color={C.icon} />
            <ThemedText style={[styles.menuText, { color: C.text }]}>
              History
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/tabs/profile/tasks")}
          >
            <Ionicons name="list-outline" size={24} color={C.icon} />
            <ThemedText style={[styles.menuText, { color: C.text }]}>
              My Tasks
            </ThemedText>
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colorScheme === "dark" ? "#333" : "#ccc" },
            ]}
          />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={C.accent} />
            <ThemedText
              style={[styles.menuText, { color: C.accent, fontWeight: "700" }]}
            >
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
  name: { fontSize: 22, marginTop: 10 },
  email: { marginTop: 4 },
  role: { marginTop: 4, fontWeight: "600" },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
  editText: { fontWeight: "600" },
  menu: { marginTop: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  menuText: { fontSize: 16 },
  divider: { height: 1, marginVertical: 14 },
  logoutBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  logoutText: { fontWeight: "700" },
});
