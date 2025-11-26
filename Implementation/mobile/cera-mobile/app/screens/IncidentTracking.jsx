import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function IncidentTracking() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fullscreen gallery state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const sliderRef = useRef(null);

  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const loadIncident = async () => {
    try {
      const config = await getAuthConfig();
      const res = await api.get(`/incidents/${id}`, config);
      setIncident(res.data);
    } catch (err) {
      console.error("Incident load error:", err?.response?.data || err?.message);
      alert("Unable to load incident details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  // Collect images
  const images = useMemo(() => {
    const arr = [];
    if (incident?.photos) arr.push(...incident.photos);
    if (incident?.photoUrl && !arr.includes(incident.photoUrl))
      arr.unshift(incident.photoUrl);
    return arr;
  }, [incident]);

  const primaryImage = images[0];

  const scrollToActive = (index) => {
    setActiveIndex(index);
    sliderRef.current?.scrollToIndex({ index, animated: true });
  };

  const formatAction = (action) => {
    if (!action) return "Update";
    const map = {
      assigned: "Volunteer Assigned",
      accepted: "Task Accepted",
      declined: "Task Declined",
      in_progress: "Task In Progress",
      completed: "Task Completed",
      approved: "Incident Approved",
      resolved: "Incident Resolved",
    };
    return map[action] || action.replace(/_/g, " ");
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    const pretty = status.replace(/_/g, " ");
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString();
  };

  const getActorName = (log) => {
    if (!log?.actor) return "Unknown";
    if (typeof log.actor === "object")
      return log.actor.username || log.actor.name || log.actor.email || "Unknown";
    return log.actor;
  };

  const getTargetName = (log) => {
    if (!log?.target) return null;
    if (typeof log.target === "object")
      return log.target.username || log.target.name || log.target.email || "Unknown";
    return log.target;
  };

  // Chip colors
  const statusColor = useMemo(() => {
    const s = (incident?.status || "").toLowerCase();
    const map = {
      pending: "#F59E0B",
      approved: "#6366F1",
      assigned: "#0EA5E9",
      in_progress: "#F97316",
      completed: "#22C55E",
      resolved: "#16A34A",
      declined: "#EF4444",
    };
    return map[s] || C.subtext;
  }, [incident?.status]);

  const severityColor = useMemo(() => {
    const sev = (incident?.severity || "").toLowerCase();
    if (sev === "high") return "#EF4444";
    if (sev === "medium") return "#F59E0B";
    if (sev === "low") return "#22C55E";
    return C.subtext;
  }, [incident?.severity]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  if (!incident) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <BackHeader title="Incident Details" />

      {/* FULLSCREEN IMAGE GALLERY */}
      <Modal visible={galleryVisible} animationType="fade" transparent>
        <View style={styles.galleryBg}>
          {/* Close */}
          <TouchableOpacity
            onPress={() => setGalleryVisible(false)}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={34} color="#fff" />
          </TouchableOpacity>

          {/* Left arrow */}
          {activeIndex > 0 && (
            <TouchableOpacity
              style={styles.leftArrow}
              onPress={() => scrollToActive(activeIndex - 1)}
            >
              <Ionicons name="chevron-back" size={42} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Right arrow */}
          {activeIndex < images.length - 1 && (
            <TouchableOpacity
              style={styles.rightArrow}
              onPress={() => scrollToActive(activeIndex + 1)}
            >
              <Ionicons name="chevron-forward" size={42} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Swipeable images */}
          <FlatList
            ref={sliderRef}
            data={images}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            pagingEnabled
            initialScrollIndex={activeIndex}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.fullImgWrap}>
                {galleryLoading && (
                  <View style={styles.fullImageLoader}>
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}
                <Image
                  source={{ uri: item }}
                  style={styles.fullImg}
                  resizeMode="contain"
                  onLoadStart={() => setGalleryLoading(true)}
                  onLoadEnd={() => setGalleryLoading(false)}
                />
              </View>
            )}
          />

          {/* Thumbnails */}
          {images.length > 1 && (
            <View style={styles.thumbRow}>
              {images.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => scrollToActive(i)}
                  style={[
                    styles.thumbWrap,
                    activeIndex === i && styles.thumbActive,
                  ]}
                >
                  <Image source={{ uri }} style={styles.thumbImg} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* CARD */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
            {incident.customType || incident.type?.toUpperCase()}
          </Text>

          {/* Chips */}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { borderColor: statusColor }]}>
              <Text style={[styles.chipText, { color: statusColor }]}>
                {formatStatus(incident.status)}
              </Text>
            </View>

            {incident.severity && (
              <View style={[styles.chip, { borderColor: severityColor }]}>
                <Text style={[styles.chipText, { color: severityColor }]}>
                  Severity: {incident.severity}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={{ marginTop: 8, gap: 4 }}>
            <Text style={{ color: C.subtext }}>
              Reporter: <Text style={{ color: C.text }}>{incident.reporter?.username}</Text>
            </Text>

            {incident.location?.name && (
              <Text style={{ color: C.subtext }}>
                Location: <Text style={{ color: C.text }}>{incident.location.name}</Text>
              </Text>
            )}

            <Text style={{ color: C.subtext }}>
              Created At: <Text style={{ color: C.text }}>{formatDate(incident.createdAt)}</Text>
            </Text>
          </View>

          {/* Description */}
          {incident.description && (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.sectionLabel, { color: C.subtext }]}>DESCRIPTION</Text>
              <Text style={{ color: C.text, marginTop: 4, lineHeight: 20 }}>
                {incident.description}
              </Text>
            </View>
          )}
        </View>

        {/* IMAGES */}
        {images.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.subtext }]}>PHOTOS</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setActiveIndex(0);
                setGalleryVisible(true);
              }}
            >
              <View style={styles.primaryImageWrap}>
                <Image source={{ uri: primaryImage }} style={styles.primaryImage} resizeMode="cover" />
                {images.length > 1 && (
                  <View style={styles.viewAllBadge}>
                    <Ionicons name="images-outline" size={16} color="#fff" />
                    <Text style={styles.viewAllText}>View all {images.length} photos</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* TIMELINE */}
        <Text style={[styles.timelineTitle, { color: C.text }]}>Timeline</Text>

        {incident.logs?.length > 0 ? (
          <View style={styles.timelineContainer}>
            {incident.logs.map((log, index) => {
              const isLast = index === incident.logs.length - 1;

              const actionColorMap = {
                assigned: "#0EA5E9",
                accepted: "#22C55E",
                declined: "#EF4444",
                in_progress: "#F97316",
                completed: "#22C55E",
                approved: "#6366F1",
                resolved: "#16A34A",
              };
              const color = actionColorMap[(log.action || "").toLowerCase()] || "#6B7280";

              return (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, { backgroundColor: color }]} />
                    {!isLast && <View style={[styles.stepLine, { backgroundColor: color + "55" }]} />}
                  </View>

                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: C.text }]}>
                      {formatAction(log.action)}
                    </Text>

                    {log.message && (
                      <Text style={[styles.stepMessage, { color: C.subtext }]}>{log.message}</Text>
                    )}

                    <Text style={[styles.stepTime, { color: C.subtext }]}>
                      {formatDate(log.timestamp)}
                    </Text>

                    {log.actor && (
                      <Text style={[styles.stepMeta, { color: C.subtext }]}>
                        Actor: {getActorName(log)}
                      </Text>
                    )}

                    {log.target && (
                      <Text style={[styles.stepMeta, { color: C.subtext }]}>
                        Target: {getTargetName(log)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: C.subtext, marginTop: 8 }}>No timeline activity available.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },

  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  // IMAGE CARD
  primaryImageWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },

  primaryImage: {
    width: "100%",
    height: 220,
  },

  viewAllBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#00000088",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
  },

  viewAllText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "600",
  },

  // FULLSCREEN GALLERY
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
    left: 15,
    top: height / 2 - 20,
    zIndex: 40,
  },

  rightArrow: {
    position: "absolute",
    right: 15,
    top: height / 2 - 20,
    zIndex: 40,
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

  // TIMELINE
  timelineTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },

  timelineContainer: {
    paddingLeft: 4,
    paddingRight: 4,
    marginBottom: 24,
  },

  stepRow: {
    flexDirection: "row",
    marginBottom: 28,
  },

  stepIndicator: {
    width: 30,
    alignItems: "center",
    position: "relative",
  },

  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  stepLine: {
    position: "absolute",
    top: 14,
    width: 2,
    height: "100%",
  },

  stepContent: {
    flex: 1,
    paddingLeft: 8,
  },

  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  stepMessage: {
    fontSize: 13,
    marginTop: 4,
  },

  stepTime: {
    fontSize: 12,
    marginTop: 4,
  },

  stepMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
