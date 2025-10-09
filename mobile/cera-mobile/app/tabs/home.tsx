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

  // Render different states safely
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

  // Resident Dashboard UI
  const ResidentDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.card, styles.redCard]}>
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

        <TouchableOpacity style={styles.card}>
          <Ionicons name="notifications-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Notifications
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Volunteer Dashboard UI
  const VolunteerDashboard = () => (
    <View style={styles.gridContainer}>
      <TouchableOpacity style={[styles.card, styles.redCard]}>
        <Ionicons name="list-outline" size={40} color="#fff" />
        <ThemedText type="defaultSemiBold" style={styles.cardTextLight}>
          View Assigned Tasks
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.card}>
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

        <TouchableOpacity style={styles.card}>
          <Ionicons name="notifications-outline" size={32} color="#C04A2B" />
          <ThemedText type="defaultSemiBold" style={styles.cardText}>
            Notifications
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

        {user.role === "resident" ? <ResidentDashboard /> : <VolunteerDashboard />}
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
