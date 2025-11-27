import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { useColorScheme } from "react-native";
import BackHeader from "@/components/ui/BackHeader";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";

type Volunteer = {
  _id: string;
  username: string;
  certified?: boolean;
  skills?: string[];
  location: { type: "Point"; coordinates: [number, number] };
};

export default function RequestVolunteerHelpScreen() {
  const scheme = useColorScheme() || "light";
  const C = Colors[scheme as "light" | "dark"];

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Enable location access.");
          return;
        }

        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;

        setUserLoc({ lat: latitude, lng: longitude });
        fetchVolunteers(latitude, longitude);
      } catch (err) {
        Alert.alert("Error", "Unable to get location.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchVolunteers = async (lat: number, lng: number) => {
    try {
      const res = await api.get("/users/nearby", {
        params: { lat, lng, maxKm: 10 },
      });
      setVolunteers(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // -----------------------------------------
  // OPEN VOLUNTEER LOCATION IN MAPS
  // -----------------------------------------
  const openVolunteerLocation = (item: Volunteer) => {
    if (!item.location?.coordinates) {
      Alert.alert("Location unavailable");
      return;
    }

    const [lng, lat] = item.location.coordinates;
    const label = encodeURIComponent(item.username + " Location");

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });

    Linking.openURL(url || `https://www.google.com/maps?q=${lat},${lng}`);
  };

  // -----------------------------------------
  // SEND HELP REQUEST
  // -----------------------------------------
  const sendHelpRequest = async (volunteerId: string) => {
    if (!userLoc) return;

    setSendingId(volunteerId);

    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: userLoc.lat,
        longitude: userLoc.lng,
      });

      const address = `${geo[0].name || ""} ${geo[0].street || ""}, ${
        geo[0].city || ""
      }`;

      await api.post(`/users/${volunteerId}/request-help`, {
        lat: userLoc.lat,
        lng: userLoc.lng,
        address,
      });

      Alert.alert("Success", "Help request sent!");
    } catch (err) {
      Alert.alert("Error", "Unable to send help request.");
    } finally {
      setSendingId(null);
    }
  };

  // -----------------------------------------
  // RENDER VOLUNTEER CARD
  // -----------------------------------------
  const renderVolunteer = ({ item }: { item: Volunteer }) => (
    <View style={[styles.card, { backgroundColor: C.card }]}>

      {/* Volunteer Info */}
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.name, { color: C.text }]}>
          {item.username} {item.certified ? "(Certified)" : ""}
        </ThemedText>

        {(item.skills?.length ?? 0) > 0 && (
          <ThemedText style={{ color: C.subtext }} numberOfLines={1}>
            Skills: {item.skills?.join(", ")}
          </ThemedText>
        )}

        {/* OPEN LOCATION BUTTON */}
        <TouchableOpacity
          onPress={() => openVolunteerLocation(item)}
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
        >
          <Ionicons name="location-outline" size={18} color={C.accent} />
          <ThemedText style={{ color: C.accent, marginLeft: 4, fontSize: 13 }}>
            View Location
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* REQUEST BUTTON */}
      <TouchableOpacity
        disabled={sendingId === item._id}
        onPress={() => sendHelpRequest(item._id)}
        style={[
          styles.helpBtn,
          { backgroundColor: C.accent, opacity: sendingId === item._id ? 0.6 : 1 },
        ]}
      >
        <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
          {sendingId === item._id ? "Sending..." : "Request"}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  // -----------------------------------------
  // MAIN RETURN UI
  // -----------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Nearby Volunteers" />

      {/* 🔥 Top heading like Notifications page */}
      <View style={styles.header}>
        <Ionicons name="people-outline" size={28} color={C.accent} />
        <ThemedText type="title" style={[styles.headerTitle, { color: C.text }]}>
          Nearby Volunteers
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : volunteers.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={{ color: C.text, fontSize: 16 }}>
            No volunteers nearby.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={volunteers}
          keyExtractor={(item) => item._id}
          renderItem={renderVolunteer}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 8,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },

  name: { fontSize: 16, fontWeight: "700" },

  helpBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
