import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import BackHeader from "@/components/ui/BackHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { router } from "expo-router";

export default function CoordinatorTrackingScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const res = await api.get("/incidents");
      setIncidents(res.data || []);
    } catch (e) {
      console.log("Tracking load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <BackHeader title="Incident Tracking" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {incidents.map((incident) => (
            <TouchableOpacity
              key={incident._id}
              style={[styles.card, { backgroundColor: C.card }]}
              onPress={() =>
                router.push({
                  pathname: "/incident/[id]",
                  params: { id: incident._id },
                })
              }
            >
              <Text style={[styles.title, { color: C.text }]}>
                {incident.customType || incident.type}
              </Text>

              <Text style={[styles.text, { color: C.subtext }]}>
                Status: {incident.status}
              </Text>

              <Text style={[styles.text, { color: C.subtext }]}>
                Reported: {new Date(incident.createdAt).toLocaleString()}
              </Text>

              {incident.assignedVolunteers?.length > 0 && (
                <Text style={[styles.text, { color: C.subtext }]}>
                  Assigned Volunteers: {incident.assignedVolunteers.length}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700" },
  text: { marginTop: 6, fontSize: 13 },
});
