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
  ActivityIndicator,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import * as Location from "expo-location";
import api from "@/services/api";
import IncidentCard from "@/components/IncidentCard";
import Button from "@/components/ui/Button";
import { useRouter, useNavigation } from "expo-router";
import { useCallback } from "react";
import BackHeader from "@/components/ui/BackHeader";


export default function NearbyTasksScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const navigation = useNavigation();


  const filters = ["All", "Fire", "Medical", "Flood", "Earthquake", "Accident", "Crime", "Other"];

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayLoading, setDisplayLoading] = useState(true);

  const loadIncidents = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow location access to view nearby incidents.");
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { longitude, latitude } = pos.coords;

      const res = await api.get(`/incidents/nearby?lng=${longitude}&lat=${latitude}&maxKm=100`);
      const all = res.data || [];

      setTimeout(() => {
        setIncidents(all);
        setLoading(false);
        setDisplayLoading(false);
      }, 300);
    } catch (err) {
      console.error("Error loading nearby incidents:", err);
      Alert.alert("Error", "Failed to fetch nearby incidents.");
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    await loadIncidents();
  };

  // Auto-fetch on screen focus

useEffect(() => {
  const unsubscribe = navigation.addListener("focus", () => {
    console.log("NearbyTasksScreen focused — reloading incidents...");
    loadIncidents();
  });

  return unsubscribe;
}, [navigation]);


  const filteredIncidents =
    selectedFilter === "All"
      ? incidents
      : incidents.filter((i) =>
          i.type?.toLowerCase().includes(selectedFilter.toLowerCase())
        );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Nearby Incidents" />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <Text style={[styles.title, { color: C.text }]}>Nearby Incidents</Text>

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
              <Text style={[styles.filterText, { color: selectedFilter === f ? "#fff" : C.text }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {displayLoading ? (
          Array.from({ length: 3 }).map((_, i) => <IncidentCard key={i} loading incident={{}} />)
        ) : filteredIncidents.length > 0 ? (
          filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident._id}
              incident={incident}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: C.text }]}>No Nearby Incidents</Text>
            <Text style={[styles.emptySubtitle, { color: C.subtext }]}>
              There are no active incidents near your location.
            </Text>
            <Button title="Refresh" onPress={loadIncidents} style={{ marginTop: 10 }} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ color: C.text, marginTop: 10 }}>Fetching nearby incidents...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 16 },
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000090",
    justifyContent: "center",
    alignItems: "center",
  },
});
