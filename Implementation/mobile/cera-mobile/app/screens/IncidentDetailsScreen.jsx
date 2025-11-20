import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export default function IncidentDetailsScreen() {
  const { id } = useSearchParams();
  const router = useRouter();
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const loadIncident = async () => {
    try {
      const config = await getAuthConfig();
      const res = await api.get(`/incidents/${id}`, config);
      setIncident(res.data);
    } catch (err) {
      console.error("Incident load error:", err?.response?.data);
      alert("Unable to load incident details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  if (loading)
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );

  if (!incident) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <BackHeader title="Incident Details" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Summary */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>
            {incident.type.toUpperCase()}
          </Text>
          <Text style={{ color: C.subtext, marginTop: 4 }}>
            Status: {incident.status}
          </Text>
          <Text style={{ color: C.subtext }}>
            Severity: {incident.severity}
          </Text>
          <Text style={{ color: C.subtext }}>
            Reporter: {incident.reporter?.username || "Unknown"}
          </Text>
        </View>

        {/* Timeline */}
        <Text style={[styles.section, { color: C.text }]}>Timeline</Text>

        <View style={{ marginTop: 10 }}>
          {incident.logs.map((log, index) => (
            <View key={index} style={styles.timelineRow}>
              <View style={styles.timelineDot} />

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.logTitle, { color: C.text }]}>
                  {formatAction(log.action)}
                </Text>

                {log.message && (
                  <Text style={{ color: C.subtext, marginTop: 3 }}>
                    {log.message}
                  </Text>
                )}

                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleString()}
                </Text>

                {log.actor && (
                  <Text style={styles.actorText}>
                    Actor: {log.actor.username}
                  </Text>
                )}

                {log.target && (
                  <Text style={styles.actorText}>
                    Target: {log.target.username}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const formatAction = (action) => {
  switch (action) {
    case "assigned":
      return "Volunteer Assigned";
    case "accepted":
      return "Task Accepted";
    case "declined":
      return "Task Declined";
    case "approved":
      return "Incident Approved";
    case "resolved":
      return "Incident Resolved";
    case "in_progress":
      return "Task In Progress";
    default:
      return action;
  }
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  section: { fontSize: 20, fontWeight: "700", marginTop: 20 },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginTop: 5,
  },
  logTitle: { fontSize: 16, fontWeight: "700" },
  logTime: { fontSize: 12, color: "#888", marginTop: 4 },
  actorText: { fontSize: 12, color: "#aaa", marginTop: 2 },
});
