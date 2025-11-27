import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import BackHeader from "@/components/ui/BackHeader";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import * as Location from "expo-location";

export default function UpdateAvailability() {
  const scheme = useColorScheme() || "light";
  const C = Colors[scheme];

  const [available, setAvailable] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Not updated yet");

  useEffect(() => {
    loadCurrentStatus();
  }, []);

  const loadCurrentStatus = async () => {
    try {
      const res = await api.get("/users/me");
      setAvailable(res.data.available ?? false);

      if (res.data.locationUpdatedAt) {
        setLastUpdated(new Date(res.data.locationUpdatedAt).toLocaleString());
      }
    } catch (err) {
      console.log("Failed to load:", err);
    }
  };

  const toggleAvailability = async () => {
    try {
      const newState = !available;
      setAvailable(newState);

      await api.patch("/users/me/availability", {
        available: newState,
      });

      Alert.alert(
        "Status Updated",
        newState ? "You are now AVAILABLE for duty." : "You are OFF duty."
      );
    } catch (err) {
      console.log(err);
    }
  };

  const updateLocationNow = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please enable location permission.");
      return;
    }

    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = pos.coords;

    await api.patch("/users/me/location", {
      coordinates: [longitude, latitude],
    });

    const now = new Date().toLocaleString();
    setLastUpdated(now);

    Alert.alert("Location Updated", "Your current location has been saved.");
  } catch (err) {
    console.log(err);
  }
};
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Update Availability" />

      <View style={styles.content}>
        <ThemedText type="title" style={[styles.headerTitle, { color: C.text }]}>
          Volunteer Availability
        </ThemedText>

        <TouchableOpacity
          onPress={toggleAvailability}
          style={[
            styles.mainBtn,
            { backgroundColor: available ? C.success : C.muted },
          ]}
        >
          <Text style={styles.btnText}>
            {available ? "Available (On Duty)" : "Unavailable (Off Duty)"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={updateLocationNow}
          style={[styles.secondaryBtn, { borderColor: C.accent }]}
        >
          <Text style={[styles.secondaryText, { color: C.accent }]}>
            Update My Location Now
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <ThemedText style={{ color: C.subtext }}>Last Updated:</ThemedText>
          <ThemedText style={{ color: C.text, fontWeight: "600" }}>
            {lastUpdated}
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },

  content: {
    marginTop: 20,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 25,
  },

  mainBtn: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: 25,
  },

  secondaryText: {
    fontSize: 15,
    fontWeight: "700",
  },

  infoBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#232222ff",
    marginTop: 10,
  },
});
