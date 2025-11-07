import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { useRouter } from "expo-router";

type Props = {
  incident: any;
  role?: "volunteer" | "coordinator" | "resident";
  volunteerAssignmentStatus?: | "pending" | "accepted" | "declined" | "in_progress" | "completed" | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onApprove?: () => void;
  onDispatch?: () => void;
  onComplete?: () => void;
  loading?: boolean;
};

export default function IncidentCard({
  incident,
  role,
  volunteerAssignmentStatus = null,
  onAccept,
  onDecline,
  onApprove,
  onDispatch,
  onComplete,
  loading = false,
}: Props) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const router = useRouter();

  const [distance, setDistance] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Calculate distance from volunteer’s current location
  useEffect(() => {
    const calculateDistance = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({});
        const coords = incident?.location?.coordinates;

        if (!coords || coords.length !== 2) return;

        const [lon, lat] = coords;
        const R = 6371;
        const dLat = ((lat - pos.coords.latitude) * Math.PI) / 180;
        const dLon = ((lon - pos.coords.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((pos.coords.latitude * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setDistance(R * c);
      } catch (err) {
        console.warn("Distance calculation failed:", err);
      }
    };

    calculateDistance();
  }, [incident]);

  if (loading || !incident) {
    return (
      <Card style={[styles.skeleton, { backgroundColor: C.cardAlt }]}>
        <ActivityIndicator color={C.accent} />
        <Text style={{ color: C.subtext, marginTop: 6 }}>Loading incident...</Text>
      </Card>
    );
  }

  const severity = incident?.severity || "Unknown";
  const severityColor =
    severity === "High"
      ? "#FF5252"
      : severity === "Medium"
      ? "#FFB300"
      : severity === "Low"
      ? "#4CAF50"
      : C.subtext;

  const incidentStatus = incident?.status?.toLowerCase() || "pending";
  const reporterName = incident?.reporterName || "Unknown Reporter";

  const showVolunteerActions =
    role === "volunteer" && volunteerAssignmentStatus === "pending";

  const showVolunteerAccepted =
    role === "volunteer" &&
    ["in_progress"].includes(volunteerAssignmentStatus || "");

  const showCoordinatorApprove =
    role === "coordinator" && incidentStatus === "pending";

  const showCoordinatorDispatch =
    role === "coordinator" && incidentStatus === "approved";

  // Function to open location in maps
  const openInMaps = () => {
    const coords = incident?.location?.coordinates;
    if (!coords || coords.length !== 2) {
      Alert.alert("Location not available");
      return;
    }

    const [lon, lat] = coords;
    const label = encodeURIComponent(incident.location.name || "Incident Location");

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
    });

    Linking.openURL(url || `https://www.google.com/maps?q=${lat},${lon}`);
  };

  return (
    <Card style={[styles.card, { backgroundColor: C.card }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="alert-circle-outline" size={20} color={severityColor} />
          <Text style={[styles.title, { color: C.text, marginLeft: 8 }]} numberOfLines={2}>
            {incident?.customType
              ? `${incident.customType}`
              : incident?.type?.charAt(0).toUpperCase() + incident?.type?.slice(1) ||
                "Incident"}
          </Text>
        </View>
        <Text style={[styles.status, { color: C.accent }]}>
          {incidentStatus.toUpperCase()}
        </Text>
      </View>

      {/* Reporter Info */}
      <Text style={[styles.reporter, { color: C.subtext }]}>
        Reported by: {reporterName}
      </Text>

      {/* Image */}
      {incident.photoUrl && (
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator color={C.accent} />
            </View>
          )}
          <Image
            source={{ uri: incident.photoUrl }}
            style={styles.image}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
        </View>
      )}

      {/* Description */}
      {incident.description ? (
        <Text style={[styles.description, { color: C.text }]} numberOfLines={3}>
          {incident.description}
        </Text>
      ) : (
        <Text style={[styles.description, { color: C.subtext }]}>
          No description provided.
        </Text>
      )}

      {/* Location */}
      <View style={styles.infoRow}>
        {incident.location?.name && (
          <TouchableOpacity style={styles.infoItem} onPress={openInMaps}>
            <Ionicons name="location-outline" size={16} color={C.accent} />
            <Text style={[styles.infoText, { color: C.subtext }]} numberOfLines={1}>
              {incident.location.name}
            </Text>
          </TouchableOpacity>
        )}

        {distance !== null && (
          <View style={styles.infoItem}>
            <Ionicons name="navigate-outline" size={16} color={C.accent} />
            <Text style={[styles.infoText, { color: C.subtext }]}>
              {distance.toFixed(1)} km away
            </Text>
          </View>
        )}
      </View>

      {/* Severity */}
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: C.subtext }]}>Severity:</Text>
        <View style={[styles.badge, { backgroundColor: severityColor + "33" }]}>
          <Text style={[styles.badgeText, { color: severityColor }]}>{severity}</Text>
        </View>
      </View>


      {/* Assigned volunteers(only for coordinator) */}
      {role === "coordinator" &&
  incident.assignedVolunteers &&
  incident.assignedVolunteers.length > 0 && (
    <View style={[styles.detailRow, { marginTop: 8, flexWrap: "wrap" }]}>
      <Text style={[styles.detailLabel, { color: C.subtext, marginRight: 6 }]}>
        Assigned Volunteer:
      </Text>
      <Text style={{ color: C.text, fontSize: 13, flexShrink: 1 }}>
        {incident.assignedVolunteers
          .map(
            (v: any) => v.volunteer?.username || v.volunteer?.email || "Unknown"
          )
          .join(", ")}
      </Text>
    </View>
  )}


  
      {/* Volunteer Action Buttons */}
      {showVolunteerActions && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#4CAF50" }]}
            onPress={onAccept}
          >
            <Text style={styles.actionText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#E53935" }]}
            onPress={onDecline}
          >
            <Text style={styles.actionText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}

{/* Volunteer Complete Button */}
      {role === "volunteer" &&
  ["in_progress", "accepted"].includes(volunteerAssignmentStatus || "") && (
    <View style={{ marginTop: 12 }}>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: "#4CAF50" }]}
        onPress={onComplete}
      >
        <Text style={styles.actionText}>Mark as Completed</Text>
      </TouchableOpacity>
    </View>
  )}

      {/* Coordinator Actions */}
      {showCoordinatorApprove && (
        <View style={{ marginTop: 10 }}>
          <Button title="Approve" onPress={onApprove} />
        </View>
      )}
      {showCoordinatorDispatch && (
        <View style={{ marginTop: 10 }}>
          <Button title="Dispatch" onPress={onDispatch} />
        </View>
      )}

      {/* Accepted Volunteer Shortcut */}
      {showVolunteerAccepted && (
        <TouchableOpacity
          style={[styles.assignedBtn, { backgroundColor: C.accent }]}
          onPress={() =>
            Alert.alert(
              "Task Accepted",
              "This task is assigned to you. Open 'My Tasks' to manage progress?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open", onPress: () => router.push("/tabs/profile/tasks") },
              ]
            )
          }
        >
          <Text style={styles.assignedText}>View in My Tasks →</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
  },
  reporter: {
    fontSize: 13,
    marginTop: 4,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000020",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: 13,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    marginLeft: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontWeight: "600",
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  assignedBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  assignedText: {
    color: "#fff",
    fontWeight: "700",
  },
  skeleton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
});
