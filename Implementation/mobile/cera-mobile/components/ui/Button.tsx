import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

type Props = {
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: any;
};
export default function Button({ title, onPress, icon, variant="primary", disabled, loading, style }: Props) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark"|"light"];
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: isPrimary ? C.accent : variant==="outline" ? "transparent" : "transparent",
          borderColor: variant==="outline" ? C.border : "transparent",
          borderWidth: variant==="outline" ? 1 : 0
        },
        isDanger && { backgroundColor: C.danger },
        disabled && { opacity: 0.6 },
        style
      ]}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <>
        {icon}
        <Text style={[styles.txt, { color: (isPrimary || isDanger) ? "#fff" : C.text }]}>{title}</Text>
      </>}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, flexDirection: "row", gap: 8 },
  txt: { fontSize: 16, fontWeight: "600" },
});
