import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import api from "@/services/api";
import IncidentCard from "@/components/IncidentCard";
import BackHeader from "@/components/ui/BackHeader";

export default function ProfileMyTasksScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  /** Load token + user and then incidents */
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      setUser(parsedUser);

      if (!token) {
        Alert.alert("Error", "No authentication token found.");
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const res = await api.get("/incidents/assigned/me");
      const data = Array.isArray(res.data) ? res.data : [];
      setTasks(data);
    } catch (err) {
      console.error("Error fetching assigned tasks:", err);
      Alert.alert("Error", "Unable to fetch your assigned tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  /** Accept / Decline actions */
  const handleAccept = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return Alert.alert("Error", "No authentication token.");

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      await api.post(`/incidents/${id}/accept`);
      Alert.alert("Accepted", "You have accepted the task.");
      fetchTasks();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not accept the task.");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return Alert.alert("Error", "No authentication token.");

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      await api.post(`/incidents/${id}/decline`);
      Alert.alert("Declined", "You have declined the task.");
      fetchTasks();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not decline the task.");
    }
  };

  /** Volunteer marks task as completed */
  const handleComplete = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return Alert.alert("Error", "No authentication token.");
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      await api.post(`/incidents/${id}/complete`);
      Alert.alert("Completed", "You have marked this task as completed.");
      fetchTasks();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not mark the task as completed.");
    }
  };

  /** UI conditions */
  const showEmpty = !loading && tasks.length === 0;

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.text, marginTop: 10 }}>Loading tasks...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="My Tasks" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchTasks} tintColor={C.accent} />
        }
      >
        <ThemedText type="title" style={[styles.title, { color: C.text }]}>
          My Tasks
        </ThemedText>

        {tasks.map((incident) => {
          const me = incident.assignedVolunteers?.find((v: any) => {
            const vId = typeof v.volunteer === "object" ? v.volunteer?._id : v.volunteer;
            return vId === user?._id;
          });

          const assignmentStatus = me?.status?.toLowerCase() || "pending";
          const canOpenDetails = ["accepted", "in_progress", "completed"].includes(assignmentStatus);

          return (
            <TouchableOpacity
              key={incident._id}
              activeOpacity={0.9}
              disabled={!canOpenDetails}
              onPress={() =>
                canOpenDetails &&
                router.push({
                  pathname: "/incident/[id]",
                  params: { id: incident._id },
                })
              }
            >
              <IncidentCard
                incident={incident}
                role="volunteer"
                volunteerAssignmentStatus={assignmentStatus}
                onAccept={() => handleAccept(incident._id)}
                onDecline={() => handleDecline(incident._id)}
                onComplete={() => handleComplete(incident._id)}
              />
            </TouchableOpacity>
          );
        })}

        {showEmpty && (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-outline" size={64} color={C.accent} />
            <ThemedText style={[styles.subtitle, { color: C.subtext }]}>
              No tasks assigned to you yet.
            </ThemedText>
            <TouchableOpacity
              onPress={fetchTasks}
              style={[styles.refreshBtn, { backgroundColor: C.accent }]}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
  },
  refreshBtn: {
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
  },
  refreshText: {
    color: "#fff",
    fontWeight: "700",
  },
});
