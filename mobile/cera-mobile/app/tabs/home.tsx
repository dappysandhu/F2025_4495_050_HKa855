import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/config";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme || "light"];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.log("No token found");
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Fetched user:", response.data);
        setUser(response.data);
      } catch (error: any) {
        console.error("Failed to load user:", error.message);
        Alert.alert("Error", "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Show loading spinner
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#C04A2B" />
        <ThemedText style={{ marginTop: 10 }}>Loading dashboard...</ThemedText>
      </SafeAreaView>
    );
  }

  // Show error screen
  if (!user) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#C04A2B" />
        <ThemedText style={{ marginTop: 8, textAlign: "center" }}>
          Unable to load user data. Please log in again.
        </ThemedText>
      </SafeAreaView>
    );
  }

  // navigation handlers using router.replace() for tab screens (no stack reset)
  const goToNearbyIncidents = () => router.replace("/tabs/incidents");
  const goToMyTasks = () => router.replace("/tabs/profile/tasks");
  const goToMyNotifications = () => router.replace("/tabs/profile/notifications");
  const goToMyReportIncident = () => router.replace("/tabs/report");

  // Resident Dashboard
  const ResidentDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.card, styles.redCard]} onPress={goToMyReportIncident}>
        <Ionicons name="alert" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>
          Report Emergency
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card}>
          <Ionicons name="people-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Request Volunteer Help
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Ionicons name="location-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            View Nearby Volunteers
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card}>
          <Ionicons name="call-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Emergency Contacts
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={goToMyNotifications}>
          <Ionicons name="notifications-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Notifications
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Volunteer Dashboard
  const VolunteerDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.card, styles.redCard]} onPress={goToMyTasks}>
        <Ionicons name="list-outline" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>
          View Assigned Tasks
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={goToNearbyIncidents}>
          <Ionicons name="map-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Active Incidents
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Ionicons name="checkmark-done-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Completed Tasks
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card}>
          <Ionicons name="person-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Update Availability
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={goToMyNotifications}>
          <Ionicons name="notifications-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Notifications
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );


  // Coordinator Dashboard
  const CoordinatorDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity
        style={[styles.card, styles.redCard]}
        onPress={() => router.push("/screens/CoordinatorQueueScreen")}
      >
        <Ionicons name="people-circle-outline" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>
          Manage Incidents
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card } onPress={() => router.push("/screens/CoordinatorQueueScreen")}>
          <Ionicons name="alert-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Pending Approvals
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Ionicons name="checkmark-done-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Dispatched Tasks
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => router.push("/tabs/profile/notifications")}>
          <Ionicons name="notifications-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Notifications
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Ionicons name="settings-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Coordinator Settings
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ThemedText type="title" style={styles.header}>
          Dashboard
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.greeting}>
          Hi {user?.username ? user.username : "there"}!
        </ThemedText>

        {user.role === "resident" ? (
          <ResidentDashboard />
        ) : user.role === "coordinator" ? (
          <CoordinatorDashboard />
        ) : (
          <VolunteerDashboard />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    textAlign: "center",
    fontSize: 24,
    marginBottom: 8,
  },
  greeting: {
    textAlign: "center",
    marginBottom: 20,
  },
  gridContainer: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  card: {
    width: "45%",
    backgroundColor: "#2E2E2E",
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  redCard: {
    width: "100%",
    backgroundColor: "#C04A2B",
    paddingVertical: 25,
    marginBottom: 20,
  },
  cardText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  cardTextLight: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
});
