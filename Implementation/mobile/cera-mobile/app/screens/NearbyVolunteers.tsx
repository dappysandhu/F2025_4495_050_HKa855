import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Circle,
  Region,
} from "react-native-maps";
import MapViewClustering from "react-native-map-clustering";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import BackHeader from "@/components/ui/BackHeader";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// ---------- Types ----------
export type Volunteer = {
  _id: string;
  username: string;
  certified?: boolean;
  skills?: string[];
  location: { type: "Point"; coordinates: [number, number] };
};

// skill filters
const SKILL_FILTERS = [
  "All",
  "Medical",
  "Fire",
  "Rescue",
  "First Aid",
  "Logistics",
];

// default volunteer marker icon
const VOLUNTEER_ICON = require("@/assets/icons/incidents/pointer.png");

// -------- Marker Component --------
const VolunteerMarker = React.memo(
  ({
    vol,
    mapRef,
  }: {
    vol: Volunteer;
    mapRef: React.RefObject<MapView | null>;
  }) => {
    const [lng, lat] = vol.location.coordinates;

    return (
      <Marker
        coordinate={{ latitude: lat, longitude: lng }}
        title={vol.username}
        description={vol.skills?.join(", ") ?? "Volunteer"}
        onPress={() => {
          mapRef.current?.animateCamera(
            {
              center: { latitude: lat, longitude: lng },
              zoom: 16,
            },
            { duration: 450 }
          );
        }}
      >
        <Image
          source={VOLUNTEER_ICON}
          style={{ width: 28, height: 28, resizeMode: "contain" }}
        />
      </Marker>
    );
  }
);

// -------- Screen --------
export default function NearbyVolunteers() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme === "dark" ? "dark" : "light"];

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [region, setRegion] = useState<Region | null>(null);

  const [selectedSkill, setSelectedSkill] = useState("All");
  const [maxKm, setMaxKm] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);

  const mapRef = useRef<MapView | null>(null);

  // bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["10%", "35%", "70%"], []);

  // filtered volunteers
  const filteredVolunteers = useMemo(() => {
    if (selectedSkill === "All") return volunteers;
    return volunteers.filter((v) =>
      v.skills?.some((s) =>
        s.toLowerCase().includes(selectedSkill.toLowerCase())
      )
    );
  }, [volunteers, selectedSkill]);

  // fetch current location
  useEffect(() => {
    (async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Enable location services.");
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
      } catch {
        Alert.alert("Error", "Unable to access location");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // fetch volunteers
  const fetchVolunteers = useCallback(
    async (center: { lat: number; lng: number }, radiusKm: number) => {
      try {
        setFetching(true);

        const res = await api.get("/users/nearby", {
          params: {
            lat: center.lat,
            lng: center.lng,
            maxKm: radiusKm,
          },
        });

        setVolunteers(res.data || []);
      } catch (err) {
        console.error("Nearby volunteers fetch error:", err);
      } finally {
        setFetching(false);
      }
    },
    []
  );

  // fetch volunteers when radius or map center changes
  useEffect(() => {
    if (region)
      fetchVolunteers(
        { lat: region.latitude, lng: region.longitude },
        maxKm
      );
  }, [maxKm, region]);

  //  Auto-refresh volunteers every 5 seconds (LIVE LOCATION UPDATE)
useEffect(() => {
  if (!region) return;

  const interval = setInterval(() => {
    fetchVolunteers(
      { lat: region.latitude, lng: region.longitude },
      maxKm
    );
  }, 5000);

  return () => clearInterval(interval);
}, [region, maxKm]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: C.background }]}
      >
        <BackHeader title="Nearby Volunteers" />

        {loading || !region ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.accent} />
            <Text style={{ color: C.subtext, marginTop: 8 }}>
              Loading map...
            </Text>
          </View>
        ) : (
          <>
            {/* MAP */}
            <MapViewClustering
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              showsUserLocation
              showsMyLocationButton={false}
            >
              <Circle
                center={{
                  latitude: region.latitude,
                  longitude: region.longitude,
                }}
                radius={maxKm * 1000}
                strokeColor="rgba(59,130,246,0.6)"
                fillColor="rgba(59,130,246,0.18)"
              />

              {filteredVolunteers.map((vol) => (
                <VolunteerMarker
                  key={vol._id}
                  vol={vol}
                  mapRef={mapRef}
                />
              ))}
            </MapViewClustering>

            {/* FILTER BUTTON */}
            <View style={styles.fabs}>
              <TouchableOpacity
                onPress={() => setFilterOpen(true)}
                style={[styles.fab, { backgroundColor: C.accent }]}
              >
                <Text style={[styles.fabTxt, { color: "#fff" }]}>
                  Filters
                </Text>
              </TouchableOpacity>
            </View>

            {/* BOTTOM SHEET LIST */}
            <BottomSheet
              ref={sheetRef}
              snapPoints={snapPoints}
              enablePanDownToClose={false}
              backgroundStyle={{ backgroundColor: C.card }}
              handleIndicatorStyle={{ backgroundColor: C.border }}
            >
              <BottomSheetFlatList
                data={filteredVolunteers}
                keyExtractor={(v: Volunteer) => v._id}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingBottom: 30,
                  paddingTop: 8,
                }}
                ListHeaderComponent={() => (
                  <View style={styles.sheetHeader}>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>
                      Nearby Volunteers
                    </Text>
                    {fetching ? (
                      <ActivityIndicator color={C.accent} />
                    ) : (
                      <Text style={{ color: C.subtext }}>
                        {filteredVolunteers.length} results
                      </Text>
                    )}
                  </View>
                )}
                renderItem={({ item }: { item: Volunteer }) => {
                  const [lng, lat] = item.location.coordinates;
                  return (
                    <View
                      style={[styles.row, { borderBottomColor: C.border }]}
                    >
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() =>
                          mapRef.current?.animateCamera({
                            center: { latitude: lat, longitude: lng },
                            zoom: 16,
                          })
                        }
                      >
                        <Text style={[styles.rowTitle, { color: C.text }]}>
                          {item.username}{" "}
                          {item.certified ? "(Certified)" : ""}
                        </Text>

                        {item.skills?.length ? (
                          <Text
                            style={{ color: C.subtext, marginTop: 2 }}
                            numberOfLines={2}
                          >
                            Skills: {item.skills.join(", ")}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </BottomSheet>

            {/* FILTER MODAL */}
            <Modal
              visible={filterOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setFilterOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <View
                  style={[
                    styles.modalCard,
                    { backgroundColor: C.card },
                  ]}
                >
                  <Text
                    style={[styles.modalTitle, { color: C.text }]}
                  >
                    Filters
                  </Text>

                  <Text style={[styles.label, { color: C.text }]}>
                    Skill
                  </Text>

                  <View style={styles.typeWrap}>
                    {SKILL_FILTERS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setSelectedSkill(s)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor:
                              selectedSkill === s
                                ? C.accent
                                : C.card,
                            borderColor:
                              selectedSkill === s
                                ? C.accent
                                : C.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color:
                              selectedSkill === s ? "#fff" : C.text,
                            fontWeight: "600",
                          }}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text
                    style={[
                      styles.label,
                      { color: C.text, marginTop: 10 },
                    ]}
                  >
                    Radius: {maxKm} km
                  </Text>

                  <Slider
                    value={maxKm}
                    onValueChange={setMaxKm}
                    minimumValue={1}
                    maximumValue={50}
                    step={1}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={() => setFilterOpen(false)}
                      style={[
                        styles.actionBtn,
                        { borderColor: C.border },
                      ]}
                    >
                      <Text
                        style={{
                          color: C.text,
                          fontWeight: "700",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setFilterOpen(false)}
                      style={[
                        styles.actionBtn,
                        { backgroundColor: C.accent },
                      ]}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "700",
                        }}
                      >
                        Apply
                      </Text>
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

// -------- Styles --------
const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fabs: { position: "absolute", right: 12, top: 80 },
  fab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
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
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
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
  typeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
