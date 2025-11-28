import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  Platform,
  Modal,
  TouchableOpacity
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader";
import Button from "@/components/ui/Button";
import IncidentCardDetailed from "@/components/IncidentCardDetailed";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  const [incident, setIncident] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  // --- Work Hours Modal ---
  const [modalVisible, setModalVisible] = useState(false);
  const [hours, setHours] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await api.get(`/incidents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIncident(res.data);
    } catch {
      Alert.alert("Error", "Failed to load incident.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // --- ROLE CHECK: Only show button if assigned to this incident ---
  const [userId, setUserId] = useState("");

  useEffect(() => {
    (async () => {
      const profile = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${await AsyncStorage.getItem("token")}` },
      });
      setUserId(profile.data._id);
    })();
  }, []);

  // Find logged-in volunteer record
  const myVolunteerRecord = incident?.assignedVolunteers?.find(
    (v: any) => v?.volunteer?._id === userId
  );

  const isAssigned = !!myVolunteerRecord;

  // Personal status
  const volunteerStatus = myVolunteerRecord?.status || "";

  // Allow logging if volunteer accepted/in_progress/completed
  const canLogHours = ["accepted", "in_progress", "completed"].includes(
    volunteerStatus.toLowerCase()
  );


  // --- Submit Work Hours ---
  const submitHours = async () => {
    if (!hours) return Alert.alert("Error", "Enter hours first");

    try {
      const token = await AsyncStorage.getItem("token");

      await api.post(
        "/users/me/work-log",
        { incidentId: id, hours },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Saved", "Hours logged successfully");
      setHours("");
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to log hours");
    }
  };

  const typeGradient = (t?: string) => {
    const k = (t || "").toLowerCase();
    if (k === "fire") return ["#EF4444", "#B91C1C"] as const;
    if (k === "medical") return ["#3B82F6", "#1E40AF"] as const;
    if (k === "flood") return ["#06B6D4", "#0E7490"] as const;
    if (k === "earthquake") return ["#F59E0B", "#B45309"] as const;
    if (k === "crime") return ["#6B7280", "#111827"] as const;
    return ["#4B5563", "#1F2937"] as const;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <BackHeader title="Incident Details" />

      {/* HERO BAR */}
      <View style={styles.heroWrap}>
        <LinearGradient colors={typeGradient(incident?.type)} style={styles.heroBar} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {incident?.customType ||
              (incident?.type
                ? incident.type.charAt(0).toUpperCase() + incident.type.slice(1)
                : "")}
          </Text>
          {!!incident?.location?.name && (
            <View style={styles.heroLocRow}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.heroLoc} numberOfLines={1}>
                {incident.location.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* MAIN CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : !incident ? (
        <View style={styles.center} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
            showsVerticalScrollIndicator={false}
          >
            <IncidentCardDetailed
              incident={incident}
              onContactCoordinator={() => { }}
            />
          </ScrollView>

          {/*Floating Button (ONLY for assigned volunteers) */}
          {canLogHours && (
            <View style={[styles.fabWrap, { backgroundColor: "transparent" }]}>
              <TouchableOpacity
                style={[styles.fabButton, { backgroundColor: C.accent }]}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="time-outline" size={22} color="#fff" />
                <Text style={styles.fabText}>Log Work Hours</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* --- MODAL FOR ENTERING HOURS --- */}
          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalBg}>
              <View style={[styles.modalBox, { backgroundColor: C.card }]}>
                <Text style={[styles.modalTitle, { color: C.text }]}>
                  Enter Hours Worked
                </Text>

                <TextInput
                  placeholder="Hours (e.g. 1.5 = 1h 30m)"
                  placeholderTextColor={C.subtext}
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="decimal-pad"
                  style={[
                    styles.modalInput,
                    { color: C.text, borderColor: C.subtext },
                  ]}
                />

                <Button title="Save Hours" onPress={submitHours} />

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeModalBtn}
                >
                  <Text style={{ color: C.subtext }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  heroWrap: { width: "100%", height: 68, position: "relative" },
  heroBar: { width: "100%", height: "100%" },
  heroContent: { position: "absolute", left: 16, right: 16, bottom: 10 },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroLocRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 6 },
  heroLoc: { color: "#fff", fontSize: 12 },

  content: { padding: 16 },

  /* Floating button */
  fabWrap: {
    position: "absolute",
    bottom: Platform.select({ ios: 30, android: 20 }),
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 10,
    elevation: 4,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  /* Modal */
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalBox: {
    padding: 18,
    borderRadius: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    fontSize: 15,
  },
  closeModalBtn: {
    marginTop: 12,
    alignSelf: "center",
  },
});
