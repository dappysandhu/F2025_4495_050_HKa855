import React, { useEffect, useState, useMemo } from "react";
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
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import Card from "./ui/Card";
import Button from "./ui/Button";
import * as Linking from "expo-linking";
import { useActionSheet } from "@expo/react-native-action-sheet"; 
type Assignment = {
  volunteer:
    | { _id: string; username?: string; email?: string; role?: string; name?: string }
    | string;
  status: "pending" | "accepted" | "declined" | "in_progress" | "completed";
  assignedAt?: string;
  respondedAt?: string;
};

type LogEntry = {
  action: string;
  message?: string;
  actor?: any;
  timestamp?: string;
  target?: any;
};

type Props = {
  incident: {
    _id: string;
    reporterName?: string;
    reporter?: { username?: string };
    status?: string;
    severity?: string;
    photoUrl?: string;
    description?: string;
    createdAt?: string;
    location?: { name?: string; coordinates?: [number, number] };
    assignedVolunteers?: Assignment[];
    logs?: LogEntry[];
  };
  role?: "volunteer" | "coordinator" | "resident";
  volunteerAssignmentStatus?:
    | "pending"
    | "accepted"
    | "declined"
    | "in_progress"
    | "completed"
    | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onApprove?: () => void;
  onDispatch?: () => void;
  onContactCoordinator?: () => void;
  loading?: boolean;
};

export default function IncidentCardDetailed({
  incident,
  role,
  volunteerAssignmentStatus = null,
  onAccept,
  onDecline,
  onApprove,
  onDispatch,
  onContactCoordinator,
  loading = false,
}: Props) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [distance, setDistance] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  const coords = incident?.location?.coordinates as [number, number] | undefined; // [lng, lat]
  const address = incident?.location?.name || "";

  const createdAt = useMemo(() => {
    if (!incident?.createdAt) return "";
    const d = new Date(incident.createdAt);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [incident?.createdAt]);

  // ---- helpers for logs ----
  const getUserDisplay = (u: any): string => {
    if (!u) return "";
    return u.username || u.name || u.email || "";
  };

  const formatAction = (action?: string) => {
    if (!action) return "updated";
    return action.replaceAll("_", " ");
  };

  const formatWhen = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  };

  // --- Distance from current device location ---
  useEffect(() => {
    const calc = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({});
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
      } catch {}
    };
    calc();
  }, [incident?._id]);

  // Added ActionSheet hook
  const { showActionSheetWithOptions } = useActionSheet();

  //  Full map-opening logic with coordinate check + fallback
  const openMapsSelector = async () => {
    // --- Show error if coordinates missing ---
    if (!coords || coords.length !== 2) {
      Alert.alert("Location Error", "This incident does not have valid coordinates.");
      return;
    }

    //  Adjust based on how your DB stores coordinates
    const [lng, lat] = coords; // if MongoDB: [lng, lat]; swap if needed

    try {
      showActionSheetWithOptions(
        {
          options: ["Google Maps", "Apple Maps", "Waze", "Cancel"],
          cancelButtonIndex: 3,
        },
        async (index) => {
          let url = "";

          if (index === 0) {
          
            url = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
          } else if (index === 1) {
         
            url = `maps://?daddr=${lat},${lng}&dirflg=d`;
          } else if (index === 2) {
           
            url = `waze://?ll=${lat},${lng}&navigate=yes`;
          }

          // --- Added fallback logic ---
          if (url) {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              await Linking.openURL(url);
            } else {
              //Fallback to Google Maps in browser
              const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
              await Linking.openURL(webUrl);
            }
          }
        }
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Unable to open map.");
    }
  };

  if (loading || !incident) {
    return (
      <Card style={[styles(C).skeleton]}>
        <ActivityIndicator color={C.accent} />
        <Text style={[styles(C).meta, { marginTop: 6 }]}>Loading incident...</Text>
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

  const status = incident?.status || "pending";
  const statusColor =
    status === "resolved"
      ? "#10B981"
      : status === "in_progress" || status === "assigned"
      ? "#3B82F6"
      : status === "approved"
      ? "#8B5CF6"
      : "#F59E0B";

  const reporterName = incident?.reporterName || incident?.reporter?.username || "Unknown Reporter";

  return (
    <Card style={[styles(C).card]}>
      {/* HEADER */}
      <View style={styles(C).header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles(C).meta}>Reported by {reporterName}</Text>
          {!!createdAt && <Text style={styles(C).meta}>Reported at {createdAt}</Text>}
        </View>
      </View>

      {/* IMAGE */}
      {incident.photoUrl && (
        <View style={styles(C).imageWrap}>
          {imageLoading && (
            <View style={styles(C).imageLoader}>
              <ActivityIndicator color={C.accent} />
            </View>
          )}
          <Image
            source={{ uri: incident.photoUrl }}
            style={styles(C).image}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
        </View>
      )}

      {/* DESCRIPTION */}
      <Section title="Description">
        <Text style={styles(C).body}>{incident.description || "No description provided."}</Text>
      </Section>

      {/* STATUS & SEVERITY */}
      <Section title="Incident Status">
        <View style={styles(C).chipRow}>
          <Chip label={status.toUpperCase()} fg={statusColor} />
          <Chip label={`Severity: ${severity}`} fg={severityColor} />
        </View>
      </Section>

      {/* LOCATION */}
      <Section title="Location">
        {!!address && <InfoRow icon="location-outline" text={address} color={C.subtext} />}
        {distance !== null && (
          <InfoRow icon="walk-outline" text={`${distance.toFixed(1)} km away`} color={C.subtext} />
        )}

        {/* Navigate button */}
        <TouchableOpacity
          onPress={openMapsSelector}
          style={{
            marginTop: 10,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: `${C.accent}22`,
            borderColor: C.accent,
            borderWidth: 1,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Ionicons name="navigate-outline" size={16} color={C.accent} />
          <Text style={{ color: C.accent, fontWeight: "600", fontSize: 13 }}>Navigate</Text>
        </TouchableOpacity>
      </Section>
    </Card>
  );
}

function Chip({ label, fg }: { label: string; fg: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: `${fg}22`,
      }}
    >
      <Text style={{ color: fg, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          color: C.subtext,
          fontSize: 12,
          fontWeight: "800",
          marginBottom: 8,
          letterSpacing: 0.4,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, text, color }: { icon: any; text: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color, fontSize: 13 }} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = (C: any) =>
  StyleSheet.create({
    card: { 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 16, 
      backgroundColor: C.card },
    skeleton: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      alignItems: "center",
      backgroundColor: C.cardAlt,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    meta: { 
      fontSize: 12, 
      color: C.subtext
     },
    imageWrap: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 12,
      position: "relative",
      backgroundColor: "#00000022",
    },
    imageLoader: {
       ...StyleSheet.absoluteFillObject, 
       justifyContent: "center", 
       alignItems: "center"
       },
    image: {
       width: "100%",
       height: "100%"
       },
    body: {
       fontSize: 14, 
       lineHeight: 20, 
       color: C.text
       },
    chipRow: {
       flexDirection: "row", 
       flexWrap: "wrap", 
       gap: 8 
      },
  });
