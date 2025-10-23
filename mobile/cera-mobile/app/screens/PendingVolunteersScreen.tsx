import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import BackHeader from "@/components/ui/BackHeader"; 
import { router } from "expo-router";

export default function PendingVolunteersScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const load = async () => {
    setLoading(true);
    try {
      const config = await getAuthConfig();
      const res = await api.get("/users/pending", config);
      setVolunteers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load volunteers:", err);
      Alert.alert("Error", "Unable to fetch pending volunteers.");
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  };

  const approveVolunteer = async (id: string) => {
    try {
      const config = await getAuthConfig();
      await api.post(`/users/${id}/approve`, {}, config);
      Alert.alert("Success", "Volunteer approved!");
      load();
    } catch (err) {
      console.error("Approval error:", err);
      Alert.alert("Error", "Failed to approve volunteer.");
    }
  };

  const declineVolunteer = async (id: string) => {
    try {
      const config = await getAuthConfig();
      await api.post(`/users/${id}/decline`, {}, config);
      Alert.alert("Declined", "Volunteer request removed.");
      load();
    } catch (err) {
      console.error("Decline error:", err);
      Alert.alert("Error", "Failed to decline volunteer.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
   
      <BackHeader title="Back" />

   
      <Text style={[styles.pageTitle, { color: C.text }]}>Pending Volunteers</Text>

      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: C.background }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {(!volunteers || volunteers.length === 0) && !loading ? (
          <Text style={[styles.empty, { color: C.subtext }]}>
            No pending volunteer requests.
          </Text>
        ) : (
          volunteers.map((v) => (
            <TouchableOpacity key={v._id}
             style={[styles.card, { backgroundColor: C.card }]}
              onPress={() =>
                 router.push({
      pathname: "/screens/VolunteerDetailScreen",
      params: { volunteer: JSON.stringify(v) },
    })
  }>
              <View style={styles.headerRow}>
                <Ionicons name="person-circle-outline" size={36} color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]}>{v.username}</Text>
                  <Text style={[styles.info, { color: C.subtext }]}>
                    Email: {v.email}
                  </Text>
                  <Text style={[styles.info, { color: C.subtext }]}>
                    {v.skills && v.skills.length > 0
                      ? `Skills: ${v.skills.join(", ")}`
                      : "Skills: None listed"}
                  </Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveBtn]}
                  onPress={() => approveVolunteer(v._id)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.declineBtn]}
                  onPress={() => declineVolunteer(v._id)}
                >
                  <Ionicons name="close-circle" size={18} color="#C04A2B" />
                  <Text style={[styles.btnText, { color: "#C04A2B" }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 16 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  empty: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 20,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  info: {
    fontSize: 13,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    flex: 0.48,
  },
  approveBtn: {
    backgroundColor: "#C04A2B",
  },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: "#C04A2B",
    backgroundColor: "transparent",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
