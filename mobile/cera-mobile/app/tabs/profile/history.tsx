import React from "react";
import { SafeAreaView, StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export default function MyReportsScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme || "light"];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={64} color={C.accent} />
        <ThemedText type="title" style={[styles.title, { color: C.text }]}>
          My Reports
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: C.subtext }]}>
          You haven't reported any incidents yet.
        </ThemedText>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: C.accent }]}
        >
          <ThemedText style={[styles.refreshText, { color: "#fff" }]}>
            Refresh
          </ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { marginTop: 10 },
  subtitle: { marginTop: 6, textAlign: "center" },
  refreshBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshText: { fontWeight: "600" },
});
