import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Circle, Region } from "react-native-maps";
import MapViewClustering from "react-native-map-clustering";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { router } from "expo-router";
import MapHeader from "@/components/ui/MapHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import BackHeader from "@/components/ui/BackHeader";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Types
type Incident = {
  _id: string;
  type: string;
  severity?: "Low" | "Medium" | "High";
  status?: "pending" | "approved" | "assigned" | "in_progress" | "resolved";
  description?: string;
  location: { type: "Point"; coordinates: [number, number]; name?: string };
  createdAt?: string;
};

const TYPE_LABELS = ["All", "Fire", "Medical", "Flood", "Earthquake", "Accident", "Crime", "Rescue", "Other"];

//map incident types to marker icons
const MARKER_ICONS: Record<string, any> = {
  fire: require("@/assets/icons/incidents/fire.png"),
  medical: require("@/assets/icons/incidents/medical.png"),
  flood: require("@/assets/icons/incidents/flood.png"),
  earthquake: require("@/assets/icons/incidents/earthquake.png"),
  accident: require("@/assets/icons/incidents/accident.png"),
  crime: require("@/assets/icons/incidents/crime.png"),
  rescue: require("@/assets/icons/incidents/rescue.png"),
  other: require("@/assets/icons/incidents/other.png"),
};

// Converts visible map region to an approximate radius (meters)
function estimateRadiusMeters(region: Region) {
  // very rough: 1 degree lat ~ 111,320 m
  const latMeters = region.latitudeDelta * 111320;
  // take half of the larger dimension as radius
  return Math.max(latMeters, latMeters * (region.longitudeDelta / region.latitudeDelta)) * 500;
}

const IncidentMarker = React.memo(function IncidentMarker({
  inc,
  pinColorBySeverity,
  getMarkerIcon,
  router,
  mapRef,
}: {
  inc: Incident;
  pinColorBySeverity: (sev?: Incident["severity"]) => string;
  getMarkerIcon: (t: string | undefined) => any;
  router: any;
  mapRef: React.RefObject<MapView | null>;
}) {
  const [tracks, setTracks] = useState(true);
  const icon = getMarkerIcon(inc.type);
  const [lng, lat] = inc.location.coordinates;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      title={`${inc.type}${inc.severity ? ` (${inc.severity})` : ""}`}
      description={inc.description || ""}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
      onPress={() => {
        mapRef.current?.animateCamera(
          {
            center: { latitude: lat, longitude: lng },
            zoom: 16,
          },
          { duration: 500 }
        );

        setTimeout(() => {
          router.push({
            pathname: "/screens/IncidentDetail",
            params: { id: inc._id },
          });
        }, 300);
      }}
    >
      {icon ? (
        <Image
          source={icon}
          onLoadEnd={() => setTracks(false)}
          style={{ width: 28, height: 28, resizeMode: "contain" }}
        />
      ) : (
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: pinColorBySeverity(inc.severity),
          }}
        />
      )}
    </Marker>
  );
});



export default function IncidentsNearby() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [tvChanges, setTvChanges] = useState(true);

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  const [selectedType, setSelectedType] = useState("All");
  const [maxKm, setMaxKm] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["10%", "35%", "70%"], []);

  const typeParam = useMemo(() => {
    if (selectedType === "All") return undefined;
    return selectedType.toLowerCase();
  }, [selectedType]);

  // Ask location once, position camera
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location needed", "Turn on location to view nearby incidents on the map.");
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;
        setUserLoc({ lat: latitude, lng: longitude });
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (e) {
        Alert.alert("Error", "Could not get current location.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchIncidents = useCallback(
    async (center: { lat: number; lng: number }, radiusKm: number) => {
      try {
        setFetching(true);
        const params: Record<string, string | number> = {
          lat: center.lat,
          lng: center.lng,
          maxKm: radiusKm,
          limit: 200,
        };
        if (typeParam) params.type = typeParam;
        const res = await api.get("/incidents/nearby", { params });
        setIncidents(res.data || []);
      } catch (e) {
      } finally {
        setFetching(false);
      }
    },
    [typeParam]
  );

  // Camera idle behavior: debounce calls like Uber
  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    if (!r || !userLoc) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const center = { lat: r.latitude, lng: r.longitude };
      const estMeters = estimateRadiusMeters(r);
      const effectiveKm = Math.max(maxKm, Math.round(estMeters / 1000));
      fetchIncidents(center, effectiveKm);
    }, 350);
  };

  // Initial fetch when region + userLoc known
  useEffect(() => {
    if (region && userLoc) {
      fetchIncidents({ lat: region.latitude, lng: region.longitude }, maxKm);
    }
  }, [region?.latitude, region?.longitude]);

  const recenter = async () => {
    if (!userLoc || !mapRef.current) return;
    mapRef.current.animateCamera({
      center: { latitude: userLoc.lat, longitude: userLoc.lng },
      zoom: 14,
    });
  };

  const pinColorBySeverity = (sev?: Incident["severity"]) => {
    switch (sev) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f59e0b";
      default:
        return "#10b981";
    }
  };

  const getMarkerIcon = (type: string | undefined) => {
    if (!type) return undefined;
    const key = type.trim().toLowerCase();
    return MARKER_ICONS[key];
  };

  const openFilter = () => setFilterOpen(true);
  const applyFilter = () => {
    setFilterOpen(false);
    if (region) fetchIncidents({ lat: region.latitude, lng: region.longitude }, maxKm);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
        <BackHeader title="Nearby Incidents" />
        {loading || !region ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.accent} />
            <Text style={{ color: C.subtext, marginTop: 8 }}>Loading map…</Text>
          </View>
        ) : (
          <>
            {/* Map with clustering */}
            <MapViewClustering
              ref={mapRef as any}
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              onRegionChangeComplete={onRegionChangeComplete}
              showsUserLocation
              showsMyLocationButton={false}
              showsTraffic={trafficEnabled}
              animationEnabled
              spiralEnabled
              radius={60} // cluster radius in px
              tracksViewChanges={false}
              onClusterPress={(cluster, markers = []) => {
                if (!markers.length) return;

                const coords = markers.map((m) => ({
                  latitude: m.location.coordinates[1],
                  longitude: m.location.coordinates[0],
                }));

                mapRef.current?.fitToCoordinates(coords, {
                  edgePadding: { top: 140, right: 140, bottom: 140, left: 140 },
                  animated: true,
                });

                setTimeout(() => {
                  mapRef.current?.animateCamera(
                    {
                      center: coords[Math.floor(coords.length / 2)],
                      zoom: 15.5,
                    },
                    { duration: 650 }
                  );
                }, 350);
              }}
            >
              {/* Optional visual radius around camera center */}
              <Circle
                center={{ latitude: region.latitude, longitude: region.longitude }}
                radius={maxKm * 1000}
                strokeColor="rgba(59,130,246,0.6)"
                fillColor="rgba(59,130,246,0.15)"
              />
              {incidents.map((inc) => {
                const [lng, lat] = inc.location.coordinates;
                if (typeof lat !== "number" || typeof lng !== "number") return null;

                return (
                  <IncidentMarker
                    key={inc._id}
                    inc={inc}
                    pinColorBySeverity={pinColorBySeverity}
                    getMarkerIcon={getMarkerIcon}
                    router={router}
                    mapRef={mapRef}
                  />
                );
              })}

            </MapViewClustering>

            {/* Floating buttons */}
            <View style={styles.fabs}>
              <TouchableOpacity onPress={recenter} style={[styles.fab, { backgroundColor: C.card }]}>
                <Text style={[styles.fabTxt, { color: C.text }]}>Locate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTrafficEnabled((v) => !v)}
                style={[styles.fab, { backgroundColor: C.card }]}
              >
                <Text style={[styles.fabTxt, { color: C.text }]}>{trafficEnabled ? "Traffic On" : "Traffic Off"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openFilter} style={[styles.fab, { backgroundColor: C.accent }]}>
                <Text style={[styles.fabTxt, { color: "#fff" }]}>Filters</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom sheet list */}
            <BottomSheet
              ref={sheetRef}
              snapPoints={snapPoints}
              enablePanDownToClose={false}
              backgroundStyle={{ backgroundColor: C.card }}
              handleIndicatorStyle={{ backgroundColor: C.border }}
            >
              <BottomSheetFlatList
                data={incidents}
                keyExtractor={(i: Incident) => i._id}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30, paddingTop: 8 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                  <View style={styles.sheetHeader}>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Nearby Incidents</Text>
                    {fetching ? (
                      <ActivityIndicator color={C.accent} />
                    ) : (
                      <Text style={{ color: C.subtext }}>{incidents.length} results</Text>
                    )}
                  </View>
                )}
                renderItem={({ item }: { item: Incident }) => {
                  const [lng, lat] = item.location.coordinates;
                  return (
                    <TouchableOpacity
                      style={[styles.row, { borderBottomColor: C.border }]}
                      onPress={() => {
                        mapRef.current?.animateCamera({
                          center: { latitude: lat, longitude: lng },
                          zoom: 16,
                        });
                        router.push({
                          pathname: "/screens/IncidentDetail",
                          params: { id: item._id },
                        });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: C.text }]}>
                          {item.type}{item.severity ? ` (${item.severity})` : ""}
                        </Text>
                        {item.description ? (
                          <Text numberOfLines={2} style={{ color: C.subtext, marginTop: 2 }}>
                            {item.description}
                          </Text>
                        ) : null}
                        {item.status ? (
                          <Text style={{ color: C.subtext, marginTop: 2 }}>Status: {item.status}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </BottomSheet>

            {/* Filters modal */}
            <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
              <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, { backgroundColor: C.card }]}>
                  <Text style={[styles.modalTitle, { color: C.text }]}>Filters</Text>

                  <Text style={[styles.label, { color: C.text }]}>Type</Text>
                  <View style={styles.typeWrap}>
                    {TYPE_LABELS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setSelectedType(t)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: selectedType === t ? C.accent : C.card,
                            borderColor: selectedType === t ? C.accent : C.border,
                          },
                        ]}
                      >
                        <Text style={{ color: selectedType === t ? "#fff" : C.text, fontWeight: "600" }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, { color: C.text, marginTop: 10 }]}>Radius: {maxKm} km</Text>
                  <Slider value={maxKm} onValueChange={setMaxKm} minimumValue={1} maximumValue={50} step={1} />

                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setFilterOpen(false)} style={[styles.actionBtn, { borderColor: C.border }]}>
                      <Text style={{ color: C.text, fontWeight: "700" }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={applyFilter} style={[styles.actionBtn, { backgroundColor: C.accent }]}>
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  fabs: {
    position: "absolute",
    right: 12,
    top: 80,
    gap: 10,
  },
  fab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 3,
  },
  fabTxt: { fontWeight: "800" },
  sheetHeader: {
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  label: { fontWeight: "700", marginTop: 4 },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  typeChip: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  modalActions: { marginTop: 14, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
