import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import IncidentCard from "@/components/IncidentCard";
import api from "@/services/api";
import Button from "@/components/ui/Button";
import BackHeader from "@/components/ui/BackHeader";
import { createIconSetFromFontello } from "@expo/vector-icons";

export default function CoordinatorQueueScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const filters = ["All", "Pending", "Approved", "Assigned", "In Progress", "Resolved"];

  // Fetch incidents
  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.get("/incidents?status=pending"),
        api.get("/incidents?status=approved"),
      ]);
      setPending(p.data || []);
      setApproved(a.data || []);
    } catch (err) {
      console.error("Failed to load incidents:", err);
      Alert.alert("Error", "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Merge both lists for filter usage
  useEffect(() => {
    const combined = [...pending, ...approved];
    if (statusFilter === "All") {
      setFiltered(combined);
    } else {
      setFiltered(
        combined.filter(
          (i) => i.status?.toLowerCase() === statusFilter.toLowerCase().replace(" ", "_")
        )
      );
    }
  }, [pending, approved, statusFilter]);

  // Approve an incident
  const approve = async (id: string) => {
    console.log("Approving incident:", `/incidents/${id}/approve`);
    try {
      setApprovingId(id);
      const incidentToApprove = pending.find((i) => i._id === id);
      if (!incidentToApprove) return;

      await api.post(`/incidents/${id}/approve`);

      setPending((prev) => prev.filter((i) => i._id !== id));
      setApproved((prev) => [{ ...incidentToApprove, status: "approved" }, ...prev]);

      Alert.alert("Incident approved successfully.");
    } catch (err) {
      console.error("Approve failed:", err);
      Alert.alert("Error", "Failed to approve incident.");
    } finally {
      setApprovingId(null);
    }
  };

  // Open dispatch modal
  const openDispatchModal = async (incident: any) => {
    try {
      setSelectedIncident(incident);
      setSelectedVolunteers([]);

      setModalVisible(true);

      // Fetch all volunteers
      const res = await api.get("/users?role=volunteer");
      setVolunteers(res.data || []);

      // Preselect already assigned volunteers for this incident
      const assignedIds =
        incident?.assignedVolunteers?.map((v: any) =>
          typeof v.volunteer === "object" ? v.volunteer._id : v.volunteer
        ) || [];
      setSelectedVolunteers(assignedIds);
    } catch (err) {
      console.error("Failed to load volunteers:", err);
      Alert.alert("Error", "Unable to load volunteer list.");
    }
  };

  // Dispatch selected volunteers
  const dispatch = async () => {
    if (!selectedIncident) return;

    try {
      if (selectedVolunteers.length === 0) {
        Alert.alert("Please select at least one volunteer.");
        return;
      }

      await api.post(`/incidents/${selectedIncident._id}/dispatch`, {
        volunteerIds: selectedVolunteers,
      });

      Alert.alert("Volunteers dispatched successfully.");
      setModalVisible(false);
      setSelectedIncident(null);
      load();
    } catch (err) {
      console.error("Dispatch failed:", err);
      Alert.alert("Error", "Failed to dispatch volunteers.");
    }
  };

  // Toggle volunteer selection
  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Coordinator Dashboard" />

      {/* Filter Section */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setStatusFilter(f)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: statusFilter === f ? C.accent : C.cardAlt,
                borderColor: C.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: statusFilter === f ? "#fff" : C.text },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />
        }
      >
        <Text style={[styles.title, { color: C.text }]}>
          {statusFilter === "All" ? "All Incidents" : `${statusFilter} Incidents`}
        </Text>

        {filtered.length > 0 ? (
          filtered.map((incident) => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              role="coordinator"
              onApprove={() => approve(incident._id)}
              onDispatch={() => openDispatchModal(incident)}
              loading={approvingId === incident._id}
            />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No incidents found for this filter.
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Volunteer Selection Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              Select Volunteers to Dispatch
            </Text>

            <FlatList
              data={volunteers}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.volunteerItem,
                    {
                      backgroundColor: selectedVolunteers.includes(item._id)
                        ? C.accent
                        : C.cardAlt,
                    },
                  ]}
                  onPress={() => toggleVolunteer(item._id)}
                >
                  <Text
                    style={{
                      color: selectedVolunteers.includes(item._id) ? "#fff" : C.text,
                    }}
                  >
                    {item.username || item.email}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: C.muted, textAlign: "center", marginTop: 12 }}>
                  No volunteers available.
                </Text>
              }
            />

            <View style={styles.modalButtons}>
              <Button
                title="Dispatch"
                onPress={dispatch}
                style={{ flex: 1, marginRight: 10 }}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  filterScroll: {
    marginTop: 10,
    marginBottom: 10,
    minHeight: 36,
    maxHeight: 44,
  },
  filterBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 5,
    // marginBottom: 10
  },
  filterText: {
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    width: "85%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  volunteerItem: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 16,
  },
});
