import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export default function VolunteerDetailsScreen() {
  const { volunteer } = useLocalSearchParams();
  const data = JSON.parse(volunteer as string);
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <Ionicons name="arrow-back" size={24} color={C.accent} />
        <Text style={[styles.backText, { color: C.accent }]}>Back</Text>
      </TouchableOpacity>

      <View style={styles.profileSection}>
        <Ionicons name="person-circle-outline" size={100} color={C.accent} />
        <Text style={[styles.name, { color: C.text }]}>{data.username}</Text>
        <Text style={[styles.email, { color: C.subtext }]}>{data.email}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={[styles.label, { color: C.accent }]}>Phone:</Text>
        <Text style={[styles.value, { color: C.text }]}>{data.phone || "N/A"}</Text>

        <Text style={[styles.label, { color: C.accent }]}>Role:</Text>
        <Text style={[styles.value, { color: C.text }]}>{data.role || "Volunteer"}</Text>

        <Text style={[styles.label, { color: C.accent }]}>Skills:</Text>
        <Text style={[styles.value, { color: C.text }]}>
          {data.skills && data.skills.length > 0
            ? data.skills.join(", ")
            : "No skills listed"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  profileSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 10,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  value: {
    fontSize: 15,
    marginTop: 4,
  },
});
