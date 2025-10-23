import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import api from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BackHeader from "@/components/ui/BackHeader";

export default function NotificationsScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔄 load backend notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await api.get("/notifications/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Foreground receive
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      const content = notif.request.content;
      const newNotif = {
        _id: `live-${Date.now()}`,
        title: content.title,
        body: content.body,
        data: content.data,
        read: false,
        createdAt: new Date(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    });

    // Tapped → navigate
    const respSub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const raw = response.notification.request.content.data?.screen;
        // Only navigate when screen is a string path; otherwise fallback to tasks
        const screen =
          typeof raw === "string" && raw.length > 0
            ? raw
            : "/tabs/profile/tasks";
        // router.push(screen);
      }
    );

    return () => {
      sub.remove();
      respSub.remove();
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await api.patch(`/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await api.patch(`/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all read:", err);
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
        router.push("/tabs/profile/tasks");
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
        <TouchableOpacity onPress={markAllAsRead}>
          <Ionicons name="checkmark-done-outline" size={22} color={C.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.accent} />
          <ThemedText style={{ color: C.subtext, marginTop: 8 }}>
            Loading notifications...
          </ThemedText>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={64} color={C.accent} />
          <ThemedText type="title" style={[styles.title, { color: C.text }]}>
            No Notifications
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: C.subtext }]}>
            You’re all caught up!
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
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", flex: 1, textAlign: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { marginTop: 10 },
  subtitle: { marginTop: 6, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
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
