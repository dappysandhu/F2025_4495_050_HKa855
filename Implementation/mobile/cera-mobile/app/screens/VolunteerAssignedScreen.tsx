import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import IncidentCard from "@/components/IncidentCard";
import BackHeader from "@/components/ui/BackHeader";

export default function VolunteerAssignedScreen() {
  
  const scheme = useColorScheme() ?? "light";
  const C = Colors[scheme];

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Get token for authorization
  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Load assigned incidents for volunteer
  const load = async () => {
    setLoading(true);
    try {
      const config = await getAuthConfig();
      const res = await api.get("/incidents/assigned/me", config);
      setIncidents(res.data || []);
    } catch (err) {
      console.error("Error fetching assigned incidents:", err);
      Alert.alert("Error", "Unable to fetch assigned incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="My Assigned Tasks" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />
        }
      >
        <Text style={[styles.title, { color: C.text }]}>Assigned Incidents</Text>

        {incidents.length === 0 ? (
          <Text style={[styles.empty, { color: C.subtext }]}>
            No incidents assigned yet.
          </Text>
        ) : (
          incidents.map((incident) => (
            <IncidentCard key={incident._id} incident={incident} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  empty: { textAlign: "center", marginTop: 20, fontSize: 15 },
});
