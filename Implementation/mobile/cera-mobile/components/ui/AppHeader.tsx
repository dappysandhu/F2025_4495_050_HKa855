import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export default function AppHeader({ title = "CERA" }: { title?: string }) {
  const router = useRouter();
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  return (
    <View style={[styles.wrap, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <View style={styles.iconBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: Platform.select({ ios: 12, android: 10 }),
    left: 12,
    right: 12,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  iconBtn: { width: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "800" },
});
