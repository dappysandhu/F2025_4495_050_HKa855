import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import BackHeader from "@/components/ui/BackHeader";
import api from "@/services/api";
import IncidentCard from "@/components/IncidentCard";

export default function CoordinatorDispatchedScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/incidents?status=assigned");
      setIncidents(res.data || []);
    } catch (err) {
      console.error("Failed to load dispatched incidents:", err);
      Alert.alert("Error", "Unable to load dispatched tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Dispatched Tasks" />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />}
      >
        {incidents.length > 0 ? (
          incidents.map((incident) => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              role="coordinator"
              loading={false}
            />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No dispatched tasks found.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
});
