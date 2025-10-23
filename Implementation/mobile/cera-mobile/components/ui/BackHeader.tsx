import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface BackHeaderProps {
  title: string;
  color?: string;
  backgroundColor?: string;
  onBack?: () => void;
}

const BackHeader: React.FC<BackHeaderProps> = ({
  title,
  color = "#fff",
  backgroundColor = "#C04A2B",
  onBack,
}) => {
  return (
    <View style={[styles.headerBar, { backgroundColor }]}>
      <TouchableOpacity onPress={onBack || (() => router.back())}>
        <Ionicons name="arrow-back" size={26} color={color} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color }]} numberOfLines={1}>
        {"CERA"}
      </Text>

      {/* Spacer to balance layout */}
      <View style={{ width: 26 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ffffff30",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default BackHeader;
