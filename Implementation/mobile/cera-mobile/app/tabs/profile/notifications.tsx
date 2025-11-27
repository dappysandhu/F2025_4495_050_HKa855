import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/config";
import BackHeader from "@/components/ui/BackHeader";

export default function NotificationsScreen() {
  const scheme = useColorScheme() || "light";
  const C = Colors[scheme as "light" | "dark"];

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Missing authentication token");
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(res.data);
    } catch (err: any) {
      console.error("Error fetching notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const receiveSub = Notifications.addNotificationReceivedListener((notif) => {
      const content = notif.request.content;
      const newNotif = {
        _id: `live-${Date.now()}`,
        title: content.title,
        body: content.body,
        read: false,
        createdAt: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => receiveSub.remove();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: item.read ? C.card : C.cardAlt,
          borderLeftWidth: 4,
          borderLeftColor: item.read ? "transparent" : C.accent,
        },
      ]}
      onPress={() => {
        if (!item.read) markAsRead(item._id);

       if (item.metadata?.coordinates?.length === 2) {
  const [lng, lat] = item.metadata.coordinates;
  const label = encodeURIComponent(item.metadata.address || "Emergency Location");

  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
  });

  Linking.openURL(url || `https://www.google.com/maps?q=${lat},${lng}`);
  return;
}

// --- FALLBACK: open maps with raw address ---
if (item.metadata?.address) {
  const encoded = encodeURIComponent(item.metadata.address);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${encoded}`
      : `geo:0,0?q=${encoded}`;

  Linking.openURL(url);
  return;
}

        Alert.alert(item.title || "Notification", item.body || "");
      }}
    >
      <Ionicons
        name={item.read ? "notifications-outline" : "notifications"}
        size={22}
        color={C.accent}
        style={{ marginRight: 10 }}
      />

      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.cardTitle, { color: C.text }]}>
          {item.title || "Notification"}
        </ThemedText>

        <ThemedText style={[styles.cardBody, { color: C.subtext }]}>
          {item.body || ""}
        </ThemedText>

        {item.metadata?.address && (
          <ThemedText
            style={{
              color: C.accent,
              fontSize: 13,
              marginTop: 4,
              fontWeight: "600",
            }}
          >
            📍 {item.metadata.address}
          </ThemedText>
        )}

        <ThemedText style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
          {new Date(item.createdAt).toLocaleString()}
        </ThemedText>
      </View>

      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: C.accent }]} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Notifications" />

      <View style={styles.header}>
        <Ionicons name="notifications-outline" size={28} color={C.accent} />
        <ThemedText type="title" style={[styles.headerTitle, { color: C.text }]}>
          Notifications
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={64} color={C.accent} />
          <ThemedText style={[styles.title, { color: C.text }]}>
            No Notifications
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingVertical: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.accent}
            />
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 8,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { marginTop: 10 },

  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    width: "100%", // ⭐ VERY IMPORTANT — makes tap work
  },

  cardTitle: { fontWeight: "700", fontSize: 15 },

  cardBody: { fontSize: 13, marginTop: 2 },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 6,
  },
});
