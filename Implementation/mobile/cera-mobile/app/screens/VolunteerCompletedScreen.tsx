import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/constants/config";
import IncidentCard from "@/components/IncidentCard";
import BackHeader from "@/components/ui/BackHeader";

export default function VolunteerCompletedScreen() {
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scheme = useColorScheme() || "light";
  const C = Colors[scheme as "light" | "dark"];

  const loadCompleted = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // Fetch completed tasks for logged-in volunteer
      const res = await axios.get(`${API_BASE_URL}/incidents/volunteer/completed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompletedTasks(res.data);
    } catch (err: any) {
      console.error("Failed to load completed tasks:", err.message);
      Alert.alert("Error", "Failed to load completed tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompleted();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCompleted();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Completed Tasks" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <ThemedText style={{ marginTop: 8 }}>Loading completed tasks...</ThemedText>
        </View>
      ) : completedTasks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-outline" size={40} color={C.subtext} />
          <ThemedText style={{ marginTop: 8, color: C.subtext }}>
            No completed tasks yet.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 16 }}
        >
          {completedTasks.map((incident) => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              role="volunteer"
              volunteerAssignmentStatus="completed"
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
