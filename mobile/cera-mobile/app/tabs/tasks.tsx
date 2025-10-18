import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView,
} from "react-native";
import * as Location from "expo-location";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/config";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

export default function TasksScreen() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme || "light"];

  const fetchNearby = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location access is needed to find incidents.");
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const lng = pos.coords.longitude;
      const lat = pos.coords.latitude;

      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/incidents/nearby?lng=${lng}&lat=${lat}&maxKm=25&unassigned=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIncidents(res.data);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load nearby incidents");
    } finally {
      setLoading(false);
    }
  };

  const acceptIncident = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/incidents/${id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Accepted", `You are assigned to incident: ${res.data.incident.type}`);
      fetchNearby();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.message || "Could not accept task");
    }
  };

  useEffect(() => {
    fetchNearby();
  }, []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#C04A2B" />
        <ThemedText style={{ marginTop: 10 }}>Finding nearby incidents...</ThemedText>
      </SafeAreaView>
    );
  }

  // Empty / Dummy screen
  if (incidents.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <Ionicons name="map-outline" size={64} color="#C04A2B" />
        <ThemedText type="title" style={{ marginTop: 10, color: "#fff" }}>
          No Nearby Incidents
        </ThemedText>
        <ThemedText style={{ color: "#aaa", textAlign: "center", marginTop: 5 }}>
          There are currently no unassigned incidents near your location.
        </ThemedText>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchNearby}>
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Main list
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <FlatList
        data={incidents}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={32} color="#C04A2B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText type="defaultSemiBold" style={{ color: "#fff", fontSize: 16 }}>
                {item.type?.toUpperCase() || "Unknown Type"}
              </ThemedText>
              <ThemedText style={{ color: "#aaa", marginTop: 5 }}>
                {item.description || "No description provided."}
              </ThemedText>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => acceptIncident(item._id)}
              >
                <ThemedText style={styles.btnText}>Accept Task</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  card: {
    backgroundColor: "#2E2E2E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  btn: {
    backgroundColor: "#C04A2B",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  refreshBtn: {
    backgroundColor: "#C04A2B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshText: { color: "#fff", fontWeight: "600" },
});
