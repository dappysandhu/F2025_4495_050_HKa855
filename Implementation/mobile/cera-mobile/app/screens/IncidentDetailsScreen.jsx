import React, { useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export default function IncidentDetailsScreen() {
  const { id } = useLocalSearchParams();
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

  // --- Format helpers ---
  const formatAction = (action) => {
    if (!action) return "Update";
    const map = {
      assigned: "Volunteer Assigned",
      accepted: "Task Accepted",
      declined: "Task Declined",
      in_progress: "Task Started",
      completed: "Task Completed",
      approved: "Incident Approved",
      resolved: "Incident Resolved",
    };
    return map[action] || (typeof action === "string" ? action.replace(/_/g, " ") : action);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString();
  };

  const getActorName = (log) => {
    if (!log || !log.actor) return "Unknown";

    if (typeof log.actor === "object") {
      return (
        log.actor.username ||
        log.actor.name ||
        log.actor.email ||
        "Unknown User"
      );
    }
    return log.actor; // fallback
  };

  const getTargetName = (log) => {
    if (!log || !log.target) return null;
    if (typeof log.target === "object") {
      return (
        log.target.username ||
        log.target.name ||
        log.target.email ||
        "Unknown Target"
      );
    }
    return log.target;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <BackHeader title="Incident Details" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* --- Summary Card --- */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>
            {incident.customType
              ? incident.customType
              : incident.type?.toUpperCase()}
          </Text>

          <Text style={{ color: C.subtext, marginTop: 6 }}>
            Status: <Text style={{ color: C.accent }}>{incident.status}</Text>
          </Text>

          <Text style={{ color: C.subtext }}>
            Severity: {incident.severity}
          </Text>

          <Text style={{ color: C.subtext }}>
            Reporter: {incident.reporter?.username || "Unknown"}
          </Text>

          {incident.location?.name && (
            <Text style={{ color: C.subtext, marginTop: 6 }}>
              Location: {incident.location.name}
            </Text>
          )}

          <Text style={{ color: C.subtext, marginTop: 6 }}>
            Created At: {formatDate(incident.createdAt)}
          </Text>
        </View>

        {/* --- Timeline Title --- */}
        <Text style={[styles.section, { color: C.text }]}>Timeline</Text>

        {/* --- Timeline List --- */}
        {incident.logs?.length > 0 ? (
          incident.logs.map((log, index) => (
            <View key={index} style={styles.timelineRow}>
              {/* green dot */}
              <View style={styles.timelineDot} />

              {/* log content */}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.logTitle, { color: C.text }]}>
                  {formatAction(log.action)}
                </Text>

                {log.message && (
                  <Text style={{ color: C.subtext, marginTop: 3 }}>
                    {log.message}
                  </Text>
                )}

                <Text style={[styles.logTime, { color: C.subtext }]}>
                  {formatDate(log.timestamp)}
                </Text>

                {/* Actor */}
                {log.actor && (
                  <Text style={[styles.actorText, { color: C.subtext }]}>
                    Actor: {getActorName(log)}
                  </Text>
                )}

                {/* Target */}
                {log.target && (
                  <Text style={[styles.actorText, { color: C.subtext }]}>
                    Target: {getTargetName(log)}
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: C.subtext, marginTop: 10 }}>
            No timeline activity available.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
  },

  section: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 10,
  },

  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginTop: 6,
  },

  logTitle: { fontSize: 16, fontWeight: "700" },
  logTime: { fontSize: 12, marginTop: 4 },
  actorText: { fontSize: 12, marginTop: 2 },
});
