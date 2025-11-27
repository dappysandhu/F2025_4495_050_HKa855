import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader";
import Button from "@/components/ui/Button";
import IncidentCardDetailed from "@/components/IncidentCardDetailed";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type Incident = {
  _id: string;
  type: string;
  customType?: string;
  description?: string;
  severity?: "Low" | "Medium" | "High";
  status?: "pending" | "approved" | "assigned" | "in_progress" | "resolved";
  reporter?: any;
  reporterName?: string;
  assignedVolunteers?: any[];
  location: { type: "Point"; coordinates: [number, number]; name?: string };
  photos?: string[];
  createdAt?: string;
  logs?: any[];
};

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/incidents/${id}`);
      setIncident(res.data);
    } catch {
      Alert.alert("Error", "Failed to load incident.");
    } finally {
      setLoading(false);
    }
  };

  const contactCoordinator = async () => {
    try {
      setContacting(true);
      await api.post(`/incidents/${id}/contact-coordinators`, {
        // message: "Volunteer requesting guidance on this incident.",
      });
      Alert.alert("Sent", "Coordinator(s) have been notified.");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to send.");
    } finally {
      setContacting(false);
    }
  };

  const typeGradient = (t?: string): readonly [string, string, ...string[]] => {
    const k = (t || "").toLowerCase();
    if (k === "fire") return ["#EF4444", "#B91C1C"] as const;
    if (k === "medical") return ["#3B82F6", "#1E40AF"] as const;
    if (k === "flood") return ["#06B6D4", "#0E7490"] as const;
    if (k === "earthquake") return ["#F59E0B", "#B45309"] as const;
    if (k === "crime") return ["#6B7280", "#111827"] as const;
    return ["#4B5563", "#1F2937"] as const;
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <BackHeader title="Incident Details" />

      <View style={styles.heroWrap}>
        <LinearGradient colors={typeGradient(incident?.type)} style={styles.heroBar} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {incident?.customType
              ? incident.customType
              : incident?.type
              ? incident.type.charAt(0).toUpperCase() + incident.type.slice(1)
              : ""}
          </Text>
          {!!incident?.location?.name && (
            <View style={styles.heroLocRow}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.heroLoc} numberOfLines={1}>
                {incident.location.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : !incident ? (
        <View style={styles.center} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}
          >
            <IncidentCardDetailed incident={incident} onContactCoordinator={contactCoordinator} />
          </ScrollView>

          {/* <View style={[styles.sticky, { backgroundColor: C.background }]}>
            <Button
              title={contacting ? "Contacting..." : "Contact Coordinator"}
              disabled={contacting}
              onPress={contactCoordinator}
            />
          </View> */}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
     flex: 1
     },
  center: {
     flex: 1,
     justifyContent: "center", 
     alignItems: "center" 
    },

  heroWrap: {
     width: "100%", 
     height: 68, 
     position: "relative"
     },
  heroBar: {
     width: "100%", 
     height: "100%" 
    },
  heroContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 10,
  },
  heroTitle: {
     color: "#fff", 
     fontSize: 18, 
     fontWeight: "800"
     },
  heroLocRow: { 
    marginTop: 2, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6 
  },
  heroLoc: { 
    color: "#fff", 
    fontSize: 12
   },

  content: { 
    padding: 16
   },

  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.select({ ios: 20, android: 12 }),
    paddingHorizontal: 16,
  },
});
