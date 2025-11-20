import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export default function MapHeader({ title = "Nearby Incidents" }) {
  const router = useRouter();
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  return (
    <View style={[styles.header, { backgroundColor: C.card }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 30 }} /> 
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    borderRadius: 12,
    marginTop: 45,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    elevation: 5,
  },
  backBtn: {
    width: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
});
