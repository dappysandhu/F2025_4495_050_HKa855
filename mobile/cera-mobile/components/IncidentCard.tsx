import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

type Props = {
  incident: any;
  onAccept?: () => void;
  onDecline?: () => void;
  onApprove?: () => void;
  onDispatch?: () => void;
  role?: "volunteer" | "coordinator" | "resident";
};

export default function IncidentCard({
  incident,
  onAccept,
  onDecline,
  onApprove,
  onDispatch,
  role,
}: Props) {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  // Display-friendly type (handles custom type)
  const getDisplayType = (i: any) =>
    i.type === "other" && i.customType
      ? `${i.customType} (Other)`
      : i.type.charAt(0).toUpperCase() + i.type.slice(1);

  return (
    <Card style={{ marginBottom: 14, padding: 14 }}>
      {/* Type + Status */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.title, { color: C.accent }]}>
          {getDisplayType(incident)}
        </Text>
        <Text style={{ color: C.muted, fontWeight: "600" }}>
          {incident.status?.toUpperCase?.() || "PENDING"}
        </Text>
      </View>

      {/* Photo */}
      {incident.photoUrl || (incident.photos && incident.photos.length > 0) ? (
        <Image
          source={{ uri: incident.photoUrl || incident.photos[0] }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}

      {/* Description */}
      {incident.description ? (
        <Text style={[styles.desc, { color: C.text }]}>
          {incident.description}
        </Text>
      ) : (
        <Text style={[styles.desc, { color: C.muted, fontStyle: "italic" }]}>
          No description provided
        </Text>
      )}

      {/* Severity / Affected */}
      <Text style={[styles.detail, { color: C.subtext }]}>
        Severity: {incident.severity || "Low"}
      </Text>
      <Text style={[styles.detail, { color: C.subtext }]}>
        Affected: {incident.affected || 0} people
      </Text>

      {/* Location */}
      {incident.location?.name && (
        <Text style={[styles.detail, { color: C.subtext }]}>
          {incident.location.name}
        </Text>
      )}

      {/* Reporter Info (for coordinator view) */}
      {role === "coordinator" && incident.reporter?.name && (
        <Text style={[styles.detail, { color: C.subtext }]}>
          Reporter: {incident.reporter.name}
        </Text>
      )}

      {/* Buttons */}
      {role === "volunteer" &&
        (incident.status === "assigned" ||
          incident.status === "dispatched") && (
          <View style={styles.row}>
            <Button title="Accept" onPress={onAccept} />
            <Button title="Decline" variant="outline" onPress={onDecline} />
          </View>
        )}

      {role === "coordinator" && incident.status === "pending" && (
        <View style={styles.row}>
          <Button title="Approve" onPress={onApprove} />
        </View>
      )}

      {role === "coordinator" && incident.status === "approved" && (
        <View style={styles.row}>
          <Button title="Dispatch" onPress={onDispatch} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: "700" },
  desc: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  detail: { fontSize: 13, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  photo: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginVertical: 8,
  },
});
