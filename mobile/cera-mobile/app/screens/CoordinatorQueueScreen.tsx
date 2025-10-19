import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import IncidentCard from "@/components/IncidentCard";
import api from "@/services/api";
import Button from "@/components/ui/Button";

export default function CoordinatorQueueScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch incidents
  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.get("/incidents?status=pending"),
        api.get("/incidents?status=approved"),
      ]);
      setPending(p.data);
      setApproved(a.data);
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    await api.patch(`/incidents/${id}/approve`);
    load();
  };

  const dispatch = async (id: string) => {
    await api.patch(`/incidents/${id}/dispatch`);
    load();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />
        }
      >
        <Text style={[styles.title, { color: C.text }]}>Coordinator Dashboard</Text>

        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Button title="Refresh" variant="outline" onPress={load} />
        </View>

        {/* pending section */}
        <Text style={[styles.sectionTitle, { color: C.subtext }]}>
          Pending Approval
        </Text>
        {pending.length > 0 ? (
          pending.map((i) => (
            <IncidentCard
              key={i._id}
              incident={i}
              role="coordinator"
              onApprove={() => approve(i._id)}
            />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No pending incidents for approval.
          </Text>
        )}

        {/* approved section */}
        <Text style={[styles.sectionTitle, { color: C.subtext, marginTop: 20 }]}>
          Approved (Dispatch)
        </Text>
        {approved.length > 0 ? (
          approved.map((i) => (
            <IncidentCard
              key={i._id}
              incident={i}
              role="coordinator"
              onDispatch={() => dispatch(i._id)}
            />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No approved incidents ready for dispatch.
          </Text>
        )}

        <View style={{ height: 40 }} /> {/* bottom padding */}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 8,
  },
});
