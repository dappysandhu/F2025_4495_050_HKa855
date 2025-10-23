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
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#C04A2B" />
        <ThemedText style={{ marginTop: 10 }}>Loading dashboard...</ThemedText>
      </SafeAreaView>
    );
  }

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

  // Navigation helpers
  const goToNearbyIncidents = () => router.replace("/tabs/incidents");
  const goToMyTasks = () => router.replace("/tabs/profile/tasks");
  const goToMyNotifications = () => router.replace("/tabs/profile/notifications");
  const goToMyReportIncident = () => router.replace("/tabs/report");

  // 🎨 Your color palette
  const pastel = {
    red: "#c24035ff",
    darkRed: "#c86058ff",
    purple: "#a076c4ff",
    teal: "#70b8b8ff",
    green: "#61a980ff",
    gray: "#6d8eb5ff",
    orange: "#e3ab67ff",
  };

  // Coordinator Dashboard
  const CoordinatorDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.fullCard, { backgroundColor: pastel.red }]} onPress={() => router.push("/screens/CoordinatorQueueScreen")}>
        <Ionicons name="people-circle-outline" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Manage Incidents</ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.darkRed, marginRight: 10 }]}
          onPress={() => router.push("/screens/CoordinatorQueueScreen")}
        >
          <Ionicons name="alert-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Pending Approvals</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.orange, marginLeft: 10 }]}>
          <Ionicons name="checkmark-done-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Dispatched Tasks</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.purple, marginRight: 10 }]}
          onPress={() => router.push("/screens/PendingVolunteersScreen")}
        >
          <Ionicons name="hourglass-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Pending Volunteers</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.teal, marginLeft: 10 }]}
          onPress={() => router.push("/screens/AllVolunteersScreen")}
        >
          <Ionicons name="people-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>All Volunteers</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.coloredCard, { backgroundColor: pastel.green, marginRight: 10 }]}
          onPress={() => router.push("/tabs/profile/notifications")}
        >
          <Ionicons name="notifications-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Notifications</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.gray, marginLeft: 10 }]}>
          <Ionicons name="settings-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Coordinator Settings</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Resident Dashboard
  const ResidentDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.fullCard, { backgroundColor: pastel.red }]} onPress={goToMyReportIncident}>
        <Ionicons name="alert" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Report Emergency</ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.teal, marginRight: 10 }]}>
          <Ionicons name="people-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Request Volunteer Help</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.purple, marginLeft: 10 }]}>
          <Ionicons name="location-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>View Nearby Volunteers</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.green, marginRight: 10 }]}>
          <Ionicons name="call-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Emergency Contacts</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.gray, marginLeft: 10 }]} onPress={goToMyNotifications}>
          <Ionicons name="notifications-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Notifications</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Volunteer Dashboard
  const VolunteerDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.fullCard, { backgroundColor: pastel.red }]} onPress={() => router.push("/screens/VolunteerAssignedScreen")}>
        <Ionicons name="list-outline" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>View Assigned Tasks</ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.teal, marginRight: 10 }]} onPress={goToNearbyIncidents}>
          <Ionicons name="map-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Active Incidents</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.orange, marginLeft: 10 }]}>
          <Ionicons name="checkmark-done-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Completed Tasks</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.purple, marginRight: 10 }]}>
          <Ionicons name="person-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Update Availability</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.coloredCard, { backgroundColor: pastel.green, marginLeft: 10 }]} onPress={goToMyNotifications}>
          <Ionicons name="notifications-outline" size={32} color="#fff" />
          <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>Notifications</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <ThemedText type="title" style={styles.header}>Dashboard</ThemedText>
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
    fontWeight: "700",
    marginBottom: 8,
  },
  greeting: {
    textAlign: "center",
    marginBottom: 25,
    fontSize: 16,
    opacity: 0.8,
  },
  gridContainer: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  coloredCard: {
    flex: 1,
    paddingVertical: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  fullCard: {
    width: "100%",
    paddingVertical: 30,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  cardTextLight: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
});
