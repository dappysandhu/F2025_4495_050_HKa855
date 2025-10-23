import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import api from "@/services/api";
import IncidentCard from "@/components/IncidentCard";
import BackHeader from "@/components/ui/BackHeader";

export default function MyReportsScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Fetch all reports created by this user */
  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/incidents/my");

      // simulate a short delay for smoother skeleton transition
      setTimeout(() => {
        setReports(res.data || []);
        setLoading(false);
      }, 600);
    } catch (error) {
      console.error("Error loading reports:", error);
      Alert.alert("Error", "Failed to fetch your reports.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const showSkeleton = loading && reports.length === 0;
  const showEmpty = !loading && reports.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="My Reports" />
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
      >
        <ThemedText type="title" style={[styles.title, { color: C.text }]}>
          My Reports
        </ThemedText>

        {/* Skeleton when data is loading */}
        {showSkeleton &&
          Array.from({ length: 3 }).map((_, i) => (
            <IncidentCard key={i} loading incident={{}} />
          ))}

        {/* Actual data once loaded */}
        {!loading &&
          reports.length > 0 &&
          reports.map((incident) => (
            <IncidentCard key={incident._id} incident={incident} role="resident" />
          ))}

        {/* Empty state */}
        {showEmpty && (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={64} color={C.accent} />
            <ThemedText style={[styles.subtitle, { color: C.subtext, marginTop: 10 }]}>
              You haven't reported any incidents yet.
            </ThemedText>
            <TouchableOpacity
              onPress={loadReports}
              style={[styles.refreshBtn, { backgroundColor: C.accent }]}
            >
              <ThemedText style={[styles.refreshText, { color: "#fff" }]}>
                Refresh
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Overlay loader only during initial fetch */}
      {loading && reports.length === 0 && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ color: C.text, marginTop: 10 }}>Loading Reports...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  centered: { alignItems: "center", marginTop: 60 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: { fontSize: 15, textAlign: "center" },
  refreshBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshText: { fontWeight: "600" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000090",
    justifyContent: "center",
    alignItems: "center",
  },
});
