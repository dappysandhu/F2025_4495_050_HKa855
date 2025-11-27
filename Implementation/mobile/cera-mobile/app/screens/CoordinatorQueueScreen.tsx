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

export default function CoordinatorQueueScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [incidents, setIncidents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const filters = ["All", "Pending", "Approved", "Assigned", "In Progress", "Resolved"];

  //  Fetch incidents (includes completed)
  const load = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        api.get("/incidents?status=pending"),
        api.get("/incidents?status=approved"),
        api.get("/incidents?status=assigned"),
        api.get("/incidents?status=in_progress"),
        api.get("/incidents?status=resolved"),
        api.get("/incidents?status=completed"),
      ]);

      const [
        pendingRes,
        approvedRes,
        assignedRes,
        inProgressRes,
        resolvedRes,
        completedRes,
      ] = responses;

      const allIncidents = [
        ...(pendingRes.data || []),
        ...(approvedRes.data || []),
        ...(assignedRes.data || []),
        ...(inProgressRes.data || []),
        ...(resolvedRes.data || []),
        ...(completedRes.data || []), 
      ];

      setIncidents(allIncidents);
      setFiltered(allIncidents);
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

  // Filter incidents by selected status
  useEffect(() => {
    if (statusFilter === "All") {
      setFiltered(incidents);
    } else {
      const normalized = statusFilter.toLowerCase().replace(" ", "_");
      const filteredList = incidents.filter((i) => {
        const st = i.status?.toLowerCase();
        // include completed incidents in resolved filter
        if (normalized === "resolved") return st === "resolved" || st === "completed";
        return st === normalized;
      });
      setFiltered(filteredList);
    }
  }, [statusFilter, incidents]);

  // Approve an incident
  const approve = async (id: string) => {
    try {
      setApprovingId(id);
      await api.post(`/incidents/${id}/approve`);
      Alert.alert("Incident approved successfully.");
      load();
    } catch (err) {
      console.error("Approve failed:", err);
      Alert.alert("Error", "Failed to approve incident.");
    } finally {
      setApprovingId(null);
    }
  };

  //  Open dispatch modal
  const openDispatchModal = async (incident: any) => {
    try {
      setSelectedIncident(incident);
      setSelectedVolunteers([]);
      setModalVisible(true);

     const res = await api.get("/users", {
  params: {
    role: "volunteer",
    approved: true,
    certified: true,
    available: true,   
  },
})
      setVolunteers(res.data || []);

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

  //  Dispatch selected volunteers
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

  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  //  UI Rendering
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Coordinator Dashboard" />


      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[
                styles.filterBtn,
                statusFilter === f && [styles.activeFilterBtn, { backgroundColor: C.accent }],
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === f && styles.activeFilterText,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 🔹 Incidents List */}
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

      {/* 🔹 Volunteer Dispatch Modal */}
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

// 🔹 Styles
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },

  // ✅ Filter Bar Styling (fixed)
  filterContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  filterScrollContent: {
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2c2c2c",
    borderWidth: 1,
    borderColor: "#444",
  },
  activeFilterBtn: {
    backgroundColor: "#D45433",
    borderColor: "#D45433",
  },
  filterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "700",
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
