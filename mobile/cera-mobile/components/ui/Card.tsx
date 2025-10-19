import React from "react";
import { View, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export default function Card({ children, style }: any) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark"|"light"];
  return <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
});
