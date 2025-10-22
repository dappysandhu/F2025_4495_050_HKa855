import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  RefreshControl,
  Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import * as Location from "expo-location";
import api from "@/services/api";
import IncidentCard from "@/components/IncidentCard";
import Button from "@/components/ui/Button";

export default function MyTasksScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const filters = [
    "All",
    "Fire",
    "Medical",
    "Flood",
    "Pending",
    "Approved",
    "Assigned",
    "Resolved",
  ];

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch both assigned and nearby incidents
  const load = async () => {
    setLoading(true);
    try {
      // Ask location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow location access to fetch nearby incidents."
        );
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { longitude, latitude } = pos.coords;

      // Fetch assigned and nearby incidents together
      const [assignedRes, nearbyRes] = await Promise.all([
        api.get("/incidents/assigned/me"),
        api.get(`/incidents/nearby?lng=${longitude}&lat=${latitude}&unassigned=true&maxKm=15`),
      ]);

      // Merge + deduplicate
      const all = [
        ...assignedRes.data,
        ...nearbyRes.data.filter(
          (n: any) => !assignedRes.data.some((a: any) => a._id === n._id)
        ),
      ];

      setIncidents(all);
    } catch (err) {
      console.error("Error loading tasks:", err);
      Alert.alert("Error", "Failed to fetch incidents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filtering logic
  const filteredIncidents =
    selectedFilter === "All"
      ? incidents
      : incidents.filter(
          (i) =>
            i.type?.toLowerCase() === selectedFilter.toLowerCase() ||
            i.status?.toLowerCase() === selectedFilter.toLowerCase()
        );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { backgroundColor: C.background },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />
        }
      >
        <Text style={[styles.title, { color: C.text }]}>My Tasks</Text>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setSelectedFilter(f)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: selectedFilter === f ? C.accent : C.cardAlt,
                  borderColor: C.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: selectedFilter === f ? "#fff" : C.text },
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task List */}
        {filteredIncidents.length > 0 ? (
          filteredIncidents.map((i) => (
            <IncidentCard key={i._id} incident={i} role="volunteer" />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: C.text }]}>No Incidents Found</Text>
            <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
              You have no assigned tasks or nearby incidents currently.
            </Text>
            <Button title="Refresh" onPress={load} style={{ marginTop: 10 }} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterText: { fontWeight: "600", fontSize: 14 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { textAlign: "center", marginBottom: 16 },
});
