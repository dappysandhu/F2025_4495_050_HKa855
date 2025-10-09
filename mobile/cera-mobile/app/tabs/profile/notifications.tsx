import React from "react";
import { SafeAreaView, StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme || "light"];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.centered}>
        <Ionicons name="notifications-outline" size={64} color="#C04A2B" />
        <ThemedText type="title" style={styles.title}>
          Notifications
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          You have no notifications at the moment.
        </ThemedText>

        <TouchableOpacity style={styles.refreshBtn}>
          <ThemedText style={styles.refreshText}>Check Again</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: "#fff", marginTop: 10 },
  subtitle: { color: "#aaa", marginTop: 6, textAlign: "center" },
  refreshBtn: {
    backgroundColor: "#C04A2B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshText: { color: "#fff", fontWeight: "600" },
});
