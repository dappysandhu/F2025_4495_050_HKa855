import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/config";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

export default function ReportIncidentScreen() {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme || "light"];

  const handleReport = async () => {
    if (!type || !description) {
      Alert.alert("Missing Fields", "Please fill out all required fields.");
      return;
    }

    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required to report an incident.");
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const location = {
        type: "Point",
        coordinates: [pos.coords.longitude, pos.coords.latitude],
      };

      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/incidents`,
        { type, description, location },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Incident reported successfully!");
      setType("");
      setDescription("");
      console.log("Reported incident:", res.data);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.response?.data?.message || "Failed to report incident.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <ThemedText type="title" style={styles.header}>
          Report an Incident
        </ThemedText>

        <ThemedText style={styles.label}>Incident Type *</ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: "#2E2E2E", color: "#fff", borderColor: "#555" },
          ]}
          placeholder="e.g., Fire, Medical Emergency, Flood"
          placeholderTextColor="#888"
          value={type}
          onChangeText={setType}
        />

        <ThemedText style={styles.label}>Description *</ThemedText>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: "#2E2E2E", color: "#fff", borderColor: "#555" },
          ]}
          placeholder="Describe the situation briefly..."
          placeholderTextColor="#888"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={22} color="#fff" />
              <ThemedText style={styles.buttonText}>Submit Report</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.tipContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#aaa" />
          <ThemedText style={styles.tipText}>
            Your report will be sent to nearby volunteers and coordinators.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { textAlign: "center", fontSize: 24, marginBottom: 20 },
  label: { color: "#fff", marginBottom: 6, fontSize: 14, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    height: 120,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#C04A2B",
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    justifyContent: "center",
    gap: 6,
  },
  tipText: { color: "#aaa", fontSize: 13, textAlign: "center", maxWidth: 280 },
});
