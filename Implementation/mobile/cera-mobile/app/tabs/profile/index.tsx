import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "@/constants/config";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [approvedAt, setApprovedAt] = useState<Date | null>(null);

  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];
  const router = useRouter();

  // Load user each time screen focused
  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchApprovedDate();
    }, [])
  );

  const fetchApprovedDate = async () => {
  const token = await AsyncStorage.getItem("token");
  const res = await axios.get(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.data.approvedAt) {
    setApprovedAt(new Date(res.data.approvedAt));
  }
};
  const fetchUser = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (e) {
      console.error("Profile load error:", e);
      Alert.alert("Error", "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  // PICK & UPLOAD AVATAR (used from preview + menu item)
  const handleChangePhoto = async () => {
    try {
      const img = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (img.canceled) return;

      setUploading(true);

      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();

      formData.append("avatar", {
        uri: img.assets[0].uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      const uploadRes = await axios.patch(
        `${API_BASE_URL}/users/me/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUser((prev: any) => ({
        ...prev,
        avatarUrl: uploadRes.data.user.avatarUrl,
      }));

      Alert.alert("Updated", "Profile photo updated!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/users/me`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser({ ...user, status: newStatus });
    } catch (error) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/auth/login");
  };

  // loading state
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

  const avatarSource = user?.avatarUrl
    ? { uri: user.avatarUrl }
    : require("../../../assets/images/default-avatar.jpg");

  // main profile UI
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
      contentContainerStyle={{ paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      {/* PROFILE HEADER */}
      <View style={styles.profileHeader}>
        {/* Tap = preview only */}
        <TouchableOpacity onPress={() => setPreviewVisible(true)}>
          {uploading ? (
            <ActivityIndicator size="large" color={C.accent} />
          ) : (
            <Image source={avatarSource} style={styles.avatar} />
          )}
        </TouchableOpacity>

        <ThemedText
          type="defaultSemiBold"
          style={[styles.name, { color: C.text }]}
        >
          {user.firstName} {user.lastName}
        </ThemedText>

        <ThemedText style={[styles.email, { color: C.subtext }]}>
          {user.email}
        </ThemedText>

        <ThemedText style={[styles.role, { color: C.accent }]}>
          {user.role?.toUpperCase()}
        </ThemedText>

        {/* EDIT PROFILE */}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: C.accent }]}
          onPress={() => router.push("/tabs/profile/edit_profile")}
        >
          <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
            Edit Profile
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* STATUS SELECTOR */}
      <View style={styles.statusRow}>
        {["active", "busy", "away", "offline"].map((st) => (
          <TouchableOpacity
            key={st}
            style={[
              styles.statusChip,
              {
                borderColor: user.status === st ? C.accent : C.icon,
                backgroundColor:
                  user.status === st ? `${C.accent}22` : "transparent",
              },
            ]}
            onPress={() => handleStatusUpdate(st)}
          >
            <ThemedText style={{ color: C.text, fontSize: 13 }}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* MENU LIST */}
      <View style={styles.menu}>
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          C={C}
          onPress={() => router.push("/tabs/profile/notifications")}
        />

        <MenuItem
          icon="time-outline"
          label="History"
          C={C}
          onPress={() => router.push("/tabs/profile/history")}
        />

        <MenuItem
          icon="list-outline"
          label="My Tasks"
          C={C}
          onPress={() => router.push("/tabs/profile/tasks")}
        />

        <MenuItem
          icon="call-outline"
          label="Contact Information"
          C={C}
          onPress={() => router.push("/tabs/profile/contact_info")}
        />

        <MenuItem
          icon="key-outline"
          label="Change Password"
          C={C}
          onPress={() => router.push("/tabs/profile/change_password")}
        />

        <MenuItem
          icon="time-outline"
          label="Availability"
          C={C}
          onPress={() => router.push("/tabs/profile/availability")}
        />

        {/* This one still uploads directly */}
        <MenuItem
          icon="camera-outline"
          label="Update Photo"
          C={C}
          onPress={handleChangePhoto}
        />

        <MenuItem
          icon="folder-outline"
          label="Files"
          C={C}
          onPress={() => router.push("/tabs/profile/files")}
        />

        <View style={[styles.divider, { backgroundColor: C.icon }]} />

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={C.accent} />
          <ThemedText
            style={[styles.menuText, { color: C.accent, fontWeight: "700" }]}
          >
            Logout
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* FULLSCREEN PREVIEW MODAL */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={[styles.previewBg]}>
          <View style={[styles.previewCard, { backgroundColor: C.card }]}>
            <Image source={avatarSource} style={styles.previewImage} />

            <View style={styles.previewButtonsRow}>
              <TouchableOpacity
                style={[styles.previewBtn, { borderColor: C.icon }]}
                onPress={() => setPreviewVisible(false)}
              >
                <ThemedText style={{ color: C.text }}>Close</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: C.accent }]}
                onPress={async () => {
                  await handleChangePhoto();
                  // keep preview open so user sees updated image
                }}
              >
                <ThemedText style={{ color: "#fff" }}>Change Photo</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  C,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  C: any;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color={C.icon} />
      <ThemedText style={[styles.menuText, { color: C.text }]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // PROFILE HEADER
  profileHeader: {
    alignItems: "center",
    marginBottom: 25,
  },
  avatar: {
    width: 95,
    height: 95,
    borderRadius: 60,
    marginBottom: 10,
  },
  name: { fontSize: 22, marginTop: 10 },
  email: { marginTop: 4 },
  role: { marginTop: 4, fontWeight: "600" },

  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },

  // STATUS CHIPS
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },

  // MENU
  menu: { marginTop: 12 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  menuText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    opacity: 0.4,
  },

  // PREVIEW MODAL
  previewBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  previewCard: {
    borderRadius: 16,
    padding: 16,
    width: "100%",
    alignItems: "center",
  },
  previewImage: {
    width: 220,
    height: 220,
    borderRadius: 120,
    marginBottom: 16,
  },
  previewButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  previewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
});
