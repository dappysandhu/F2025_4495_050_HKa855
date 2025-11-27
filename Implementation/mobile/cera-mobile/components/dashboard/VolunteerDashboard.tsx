import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { VictoryChart, VictoryLine } from "victory-native";
import { router } from "expo-router";

export default function VolunteerDashboard({ stats }: any) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  const pastel = {
    red: "#c24035ff",
    darkRed: "#c86058ff",
    purple: "#a076c4ff",
    teal: "#70b8b8ff",
    green: "#61a980ff",
    gray: "#6d8eb5ff",
    orange: "#e3ab67ff",
  };

  // fallback graph data if backend doesn't send any
  const graph = (stats as any)?.graph || {
    last7Days: 0,
    last30Days: 0,
    last90Days: 0,
  };

  const lineData = [
    { x: "7d", y: Number(graph.last7Days) || 0 },
    { x: "30d", y: Number(graph.last30Days) || 0 },
    { x: "90d", y: Number(graph.last90Days) || 0 },
  ];

  return (
    <View style={styles.gridContainer}>
      {/* ✅ only check stats, not stats.graph */}
      {stats && (
        <View style={[styles.statsCard, { backgroundColor: C.card }]}>
          <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
            Your Activity Summary
          </ThemedText>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <ThemedText style={styles.statValue}>
                {(stats.hours ?? 0).toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Hours Worked</ThemedText>
            </View>

            <View style={styles.statBox}>
              <ThemedText style={styles.statValue}>
                {stats.inProgress ?? 0}
              </ThemedText>
              <ThemedText style={styles.statLabel}>In Progress</ThemedText>
            </View>

            <View style={styles.statBox}>
              <ThemedText style={styles.statValue}>
                {stats.completed ?? 0}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Completed</ThemedText>
            </View>
          </View>

          {/* GRAPH */}
          <View style={{ marginTop: 20 }}>
            <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
              Last 3 Months
            </ThemedText>

            <View style={{ alignItems: "center" }}>
              <VictoryChart
                height={160}
                width={330}
                padding={{ top: 20, bottom: 40, left: 45, right: 20 }}
              >
                <VictoryLine
                  data={lineData}
                  interpolation="monotoneX"
                  animate={{ duration: 500 }}
                  style={{
                    data: { stroke: pastel.green, strokeWidth: 3 },
                  }}
                />
              </VictoryChart>
            </View>
          </View>
        </View>
      )}

      {/* Existing Cards */}
      <TouchableOpacity
        style={[styles.fullCard, { backgroundColor: pastel.red }]}
        onPress={() => router.push("/tabs/profile/tasks")}
      >
        <Ionicons name="list-outline" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>
          View Assigned Tasks
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.teal, marginRight: 10 }]}
          onPress={() => router.replace("/tabs/incidents")}
        >
          <Ionicons name="map-outline" size={32} color="#fff" />
          <ThemedText style={styles.cardTextLight}>Active Incidents</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.orange, marginLeft: 10 }]}
          onPress={() => router.push("/screens/VolunteerCompletedScreen")}
        >
          <Ionicons name="checkmark-done-outline" size={32} color="#fff" />
          <ThemedText style={styles.cardTextLight}>Completed Tasks</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.purple, marginRight: 10 }]}
          onPress={() => router.push("/tabs/profile/availability")}
        >
          <Ionicons name="person-outline" size={32} color="#fff" />
          <ThemedText style={styles.cardTextLight}>Update Availability</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.green, marginLeft: 10 }]}
          onPress={() => router.push("/tabs/profile/notifications")}
        >
          <Ionicons name="notifications-outline" size={32} color="#fff" />
          <ThemedText style={styles.cardTextLight}>Notifications</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  gridContainer: { alignItems: "center" },

  statsCard: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    marginBottom: 28,
  },
  statsTitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 4,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  coloredCard: {
    flex: 1,
    paddingVertical: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fullCard: {
    width: "100%",
    paddingVertical: 30,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  cardTextLight: {
    color: "#fff",
    fontSize: 15,
    marginTop: 8,
    fontWeight: "600",
    textAlign: "center",
  },
});
