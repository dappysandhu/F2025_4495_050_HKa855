import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import Card from "./ui/Card";
import Button from "./ui/Button";
import * as Linking from "expo-linking";
import { useActionSheet } from "@expo/react-native-action-sheet";

const { width, height } = Dimensions.get("window");

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
    photos?: string[];
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


  const [galleryVisible, setGalleryVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const sliderRef = useRef<FlatList<string> | null>(null);

  const images = useMemo(() => {
    const arr: string[] = [];
    if (incident?.photos?.length) arr.push(...incident.photos);
    if (incident?.photoUrl && !arr.includes(incident.photoUrl)) arr.unshift(incident.photoUrl);
    return arr;
  }, [incident]);

  const scrollToActive = (index: number) => {
    setActiveIndex(index);
    sliderRef.current?.scrollToIndex({ index, animated: true });
  };

  const primaryImage = images[0];

  const createdAt = useMemo(() => {
    if (!incident?.createdAt) return "";
    const d = new Date(incident.createdAt);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [incident?.createdAt]);

  const normalizeId = (v: any) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v._id || v.id || "";
  };

  const getUserDisplay = (u: any): string => {
    if (!u) return "";
    return u.username || u.name || u.email || "";
  };

  const resolveActorName = (log: LogEntry): string => {
    if (log.actor && typeof log.actor === "object") {
      const name = getUserDisplay(log.actor);
      if (name) return name;
    }
    const actorId = normalizeId(log.actor);
    if (actorId && Array.isArray(incident.assignedVolunteers)) {
      for (const a of incident.assignedVolunteers) {
        const vol = typeof a.volunteer === "string" ? null : a.volunteer;
        if (vol && normalizeId(vol) === actorId) {
          const name = getUserDisplay(vol);
          if (name) return name;
        }
      }
    }
    return "Someone";
  };

  const formatAction = (action?: string) => action?.replaceAll("_", " ") || "updated";

  const formatWhen = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const coords = incident?.location?.coordinates as [number, number] | undefined;
  const address = incident?.location?.name || "";

  useEffect(() => {
    const calc = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({});
        if (!coords || coords.length !== 2) return;

        const [lng, lat] = coords;
        const R = 6371;
        const dLat = ((lat - pos.coords.latitude) * Math.PI) / 180;
        const dLon = ((lng - pos.coords.longitude) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((pos.coords.latitude * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setDistance(R * c);
      } catch { }
    };
    calc();
  }, [incident?._id]);

  if (loading || !incident) {
    return (
      <Card style={[styles(C).skeleton]}>
        <ActivityIndicator color={C.accent} />
        <Text style={[styles(C).meta, { marginTop: 6 }]}>Loading incident...</Text>
      </Card>
    );
  }

  const severity = (incident?.severity as string) || "Unknown";
  const severityColor =
    severity === "High"
      ? "#FF5252"
      : severity === "Medium"
        ? "#FFB300"
        : severity === "Low"
          ? "#4CAF50"
          : C.subtext;

  const status = (incident?.status as string) || "pending";
  const statusColor =
    status === "resolved"
      ? "#10B981"
      : status === "in_progress" || status === "assigned"
        ? "#3B82F6"
        : status === "approved"
          ? "#8B5CF6"
          : "#F59E0B";

  const reporterName =
    incident?.reporterName || incident?.reporter?.username || "Unknown Reporter";

  const { showActionSheetWithOptions } = useActionSheet();

  const openMapsSelector = () => {
    if (!coords) return;
    const [lng, lat] = coords;
    showActionSheetWithOptions(
      {
        options: ["Google Maps", "Apple Maps", "Waze", "Cancel"],
        cancelButtonIndex: 3,
      },
      async (index) => {
        if (index === 0)
          Linking.openURL(`comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`);
        else if (index === 1) Linking.openURL(`maps://?daddr=${lat},${lng}&dirflg=d`);
        else if (index === 2) Linking.openURL(`waze://?ll=${lat},${lng}&navigate=yes`);
      }
    );
  };

  const assignments: Assignment[] = Array.isArray(incident?.assignedVolunteers)
    ? incident.assignedVolunteers
    : [];

  const showVolunteerActions =
    role === "volunteer" && volunteerAssignmentStatus === "pending";

  const showVolunteerAccepted =
    role === "volunteer" &&
    ["in_progress", "accepted"].includes(volunteerAssignmentStatus || "");

  const showCoordinatorApprove = role === "coordinator" && status === "pending";
  const showCoordinatorDispatch = role === "coordinator" && status === "approved";

  const renderFullScreenGallery = (
    <Modal visible={galleryVisible} animationType="fade" transparent>
      <View style={styles(C).galleryBg}>
        {/* CLOSE BTN */}
        <TouchableOpacity
          onPress={() => setGalleryVisible(false)}
          style={styles(C).closeBtn}
        >
          <Ionicons name="close" size={34} color="#fff" />
        </TouchableOpacity>

        {/* LEFT ARROW */}
        {activeIndex > 0 && (
          <TouchableOpacity
            style={styles(C).leftArrow}
            onPress={() => scrollToActive(activeIndex - 1)}
          >
            <Ionicons name="chevron-back" size={42} color="#fff" />
          </TouchableOpacity>
        )}

        {/* RIGHT ARROW */}
        {activeIndex < images.length - 1 && (
          <TouchableOpacity
            style={styles(C).rightArrow}
            onPress={() => scrollToActive(activeIndex + 1)}
          >
            <Ionicons name="chevron-forward" size={42} color="#fff" />
          </TouchableOpacity>
        )}

        {/* MAIN IMAGES */}
        <FlatList
          ref={sliderRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          initialScrollIndex={activeIndex}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(idx);
          }}
          renderItem={({ item }) => {
            return (
              <View style={styles(C).fullImgWrap}>
                {galleryLoading && (
                  <View style={styles(C).fullImageLoader}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}

                <Image
                  source={{ uri: item }}
                  style={styles(C).fullImg}
                  resizeMode="contain"
                  onLoadStart={() => setGalleryLoading(true)}
                  onLoadEnd={() => setGalleryLoading(false)}
                />
              </View>
            );
          }}


        />

        {/* THUMBNAILS */}
        {images.length > 1 && (
          <View style={styles(C).thumbRow}>
            {images.map((img, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => scrollToActive(i)}
                style={[
                  styles(C).thumbWrap,
                  activeIndex === i && styles(C).thumbActive,
                ]}
              >
                <Image source={{ uri: img }} style={styles(C).thumbImg} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );

  return (
    <Card style={[styles(C).card]}>
      {renderFullScreenGallery}

      {/* HEADER */}
      <View style={styles(C).header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles(C).meta}>Reported by {reporterName}</Text>
          {!!createdAt && <Text style={styles(C).meta}>Reported at {createdAt}</Text>}
        </View>
      </View>

      {/* IMAGE (CLICKABLE) */}
      {primaryImage && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setActiveIndex(0);
            setGalleryVisible(true);
          }}
        >
          <View style={styles(C).imageWrap}>
            {imageLoading && (
              <View style={styles(C).imageLoader}>
                <ActivityIndicator color={C.accent} />
              </View>
            )}

            <Image
              source={{ uri: primaryImage }}
              style={styles(C).image}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />

            {images.length > 1 && (
              <View style={styles(C).viewAllBadge}>
                <Ionicons name="images-outline" size={16} color="#fff" />
                <Text style={styles(C).viewAllText}>
                  View all {images.length} photos
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* DESCRIPTION */}
      <Section title="Description">
        <Text style={styles(C).body}>
          {incident.description || "No description provided."}
        </Text>
      </Section>

      {/* STATUS / SEVERITY */}
      <Section title="Incident Status">
        <View style={styles(C).chipRow}>
          <Chip label={status.toUpperCase()} fg={statusColor} />
          <Chip label={`Severity: ${severity}`} fg={severityColor} />
        </View>
      </Section>

      {/* LOCATION */}
      <Section title="Location">
        {address ? (
          <InfoRow icon="location-outline" text={address} color={C.subtext} />
        ) : null}

        {distance !== null && (
          <InfoRow
            icon="walk-outline"
            text={`${distance.toFixed(1)} km away`}
            color={C.subtext}
          />
        )}

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
          <Text style={{ color: C.accent, fontWeight: "600", fontSize: 13 }}>
            Navigate
          </Text>
        </TouchableOpacity>
      </Section>

      {/* ASSIGNED VOLUNTEERS */}
      {assignments.length > 0 && (
        <Section title="Assigned Volunteers">
          <View style={{ gap: 8 }}>
            {assignments.map((a, idx) => {
              const v = typeof a.volunteer === "string" ? null : a.volunteer;
              const name =
                (v && (v.username || v.name || v.email)) || "Volunteer";
              const st = a.status || "pending";
              const stColor =
                st === "completed"
                  ? "#10B981"
                  : st === "in_progress"
                    ? "#3B82F6"
                    : st === "accepted"
                      ? "#16A34A"
                      : st === "declined"
                        ? "#EF4444"
                        : "#F59E0B";

              return (
                <View key={idx} style={styles(C).assignmentRow}>
                  <Text style={[styles(C).body, { flex: 1 }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Chip label={st.toUpperCase()} fg={stColor} />
                </View>
              );
            })}
          </View>
        </Section>
      )}

      {/* LOGS */}
      {Array.isArray(incident.logs) && incident.logs.length > 0 && (
        <Section title="Recent Activity">
          <View style={{ gap: 6 }}>
            {incident.logs
              .slice(-6)
              .reverse()
              .map((l, i) => {
                return (
                  <Text key={i} style={styles(C).logItem} numberOfLines={2}>
                    {resolveActorName(l)} • {formatAction(l.action)} •{" "}
                    {formatWhen(l.timestamp)}
                  </Text>
                );
              })}
          </View>
        </Section>
      )}

      {/* ACTIONS */}
      {showVolunteerActions && (
        <View style={styles(C).rowGap}>
          <Button title="Accept Task" onPress={onAccept} />
          <Button title="Decline" onPress={onDecline} variant="danger" />
        </View>
      )}

      {showCoordinatorApprove && (
        <View style={{ marginTop: 14 }}>
          <Button title="Approve Incident" onPress={onApprove} />
        </View>
      )}

      {showCoordinatorDispatch && (
        <View style={{ marginTop: 14 }}>
          <Button title="Dispatch Volunteers" onPress={onDispatch} />
        </View>
      )}
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
  const C = Colors[scheme];
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

function InfoRow({
  icon,
  text,
  color,
}: {
  icon: any;
  text: string;
  color: string;
}) {
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
      backgroundColor: C.card,
    },

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

    meta: { fontSize: 12, color: C.subtext },

    // IMAGE
    imageWrap: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 12,
      position: "relative",
      backgroundColor: "#00000022",
    },

    imageLoader: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },

    image: { width: "100%", height: "100%" },

    viewAllBadge: {
      position: "absolute",
      bottom: 12,
      right: 12,
      backgroundColor: "#00000088",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
    },

    viewAllText: { color: "#fff", marginLeft: 6, fontWeight: "600", fontSize: 11 },

    body: { fontSize: 14, lineHeight: 20, color: C.text },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

    rowGap: { flexDirection: "row", gap: 10, marginTop: 10 },

    assignmentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    logItem: { fontSize: 13, color: C.subtext },

    /* FULLSCREEN GALLERY */
    galleryBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
    },

    closeBtn: {
      position: "absolute",
      top: 45,
      right: 20,
      zIndex: 50,
    },

    leftArrow: {
      position: "absolute",
      left: 10,
      top: height / 2 - 20,
      zIndex: 50,
    },

    rightArrow: {
      position: "absolute",
      right: 10,
      top: height / 2 - 20,
      zIndex: 50,
    },

    fullImgWrap: {
      width,
      height,
      justifyContent: "center",
      alignItems: "center",
    },

    fullImg: {
      width: "100%",
      height: "100%",
    },

    fullImageLoader: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 20,
    },

    thumbRow: {
      position: "absolute",
      bottom: 30,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 20,
    },

    thumbWrap: {
      width: 55,
      height: 55,
      borderRadius: 8,
      overflow: "hidden",
      opacity: 0.5,
    },

    thumbActive: {
      opacity: 1,
      borderWidth: 2,
      borderColor: "#fff",
    },

    thumbImg: {
      width: "100%",
      height: "100%",
    },
  });
