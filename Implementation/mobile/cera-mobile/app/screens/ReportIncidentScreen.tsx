import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader";
import { ThemedText } from "@/components/themed-text";

const { width } = Dimensions.get("window");

export default function ReportIncidentScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const router = useRouter();

  type PickedPhoto = { uri: string; aspectRatio: number; mimeType?: string };

  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [loc, setLoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState("");
  const [affected, setAffected] = useState("");
  const [locLoading, setLocLoading] = useState(false);


  const predefinedTypes = [
    "Fire",
    "Medical Emergency",
    "Flood",
    "Earthquake",
    "Accident",
    "Crime",
    "Others",
  ];
  const mapIncidentType = (label: string) => {
    const key = (label || "").toLowerCase();
    if (key === "medical emergency") return "medical";
    if (key === "others") return "other";
    return key;
  };


  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to capture an image.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: false,
      allowsEditing: false,
    });

    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      const aspectRatio = asset.width && asset.height ? asset.width / asset.height : 16 / 9;


      setPhotos((prev) => [
        ...prev,
        {
          uri: asset.uri,
          aspectRatio,
          mimeType: asset.mimeType || "image/jpeg",
        },
      ]);

    }
  };


  const getLocation = async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please enable location access to set your position.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let name: string | undefined;
      try {
        const rev = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        name = [rev[0]?.name, rev[0]?.city].filter(Boolean).join(", ");
      } catch { }

      setLoc({
        type: "Point",
        coordinates: [pos.coords.longitude, pos.coords.latitude],
        name,
      });

      Toast.show({
        type: "success",
        text1: "Location Captured",
        text2: name ? `📍 ${name}` : "Coordinates fetched successfully.",
        position: "bottom",
      });
    } catch (error: any) {
      console.error("Location fetch error:", error);
      Alert.alert("Error", "Unable to fetch location. Try again outdoors.");
    } finally {
      setLocLoading(false);
    }
  };

const submit = async () => {
  if (loading) return; // prevent duplicate submissions

  const incidentType = mapIncidentType(type);
  const customTypeValue = type === "Others" ? customType.trim() : "";

  if (!incidentType) {
    Alert.alert("Missing info", "Please select an incident type.");
    return;
  }
  if (!description.trim()) {
    Alert.alert("Missing info", "Please enter a description.");
    return;
  }
  if (!loc?.coordinates) {
    Alert.alert("Missing location", "Please set your location.");
    return;
  }
  if (photos.length === 0) {
    Alert.alert("Missing photo", "Please capture a photo before submitting.");
    return;
  }
  if (photos.length > 5) {
    Alert.alert("Limit reached", "You can upload up to 5 photos.");
    return;
  }

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("type", incidentType);
    formData.append("customType", customTypeValue);
    formData.append("description", description.trim());
    formData.append("severity", severity || "Low");
    formData.append("affected", (Number(affected) || 0).toString());
    formData.append("location", JSON.stringify(loc));

    photos.forEach((p, index) => {
      formData.append("photos", {
        uri: p.uri,
        name: `incident_${index}.jpg`,
        type: p.mimeType || "image/jpeg",
      } as any);
    });

    await api.post("/incidents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    Toast.show({
      type: "success",
      text1: "Incident Reported",
      text2: "Your report was submitted successfully!",
      position: "bottom",
    });

    setType("");
    setCustomType("");
    setDescription("");
    setPhotos([]);
    setLoc(null);
    setSeverity("");
    setAffected("");
    setTimeout(() => router.replace("/tabs/home"), 1200);
  } catch (e: any) {
    console.error("Report submit error:", e);
    Alert.alert("Error", e?.response?.data?.message ?? "Could not submit report.");
  } finally {
    setLoading(false);
  }
};


  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Report Incident" />
      <ThemedText type="title" style={styles.title}>Report an Incident</ThemedText>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Card>
            {/* Incident Type */}
            <Text style={[styles.label, { color: C.subtext }]}>Incident Type *</Text>
            <View style={styles.typeContainer}>
              {predefinedTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: type === t ? C.accent : C.cardAlt,
                      borderColor: C.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: type === t ? "#fff" : C.text,
                      fontWeight: "600",
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {type === "Others" && (
              <TextInput
                placeholder="Enter incident type"
                placeholderTextColor={C.muted}
                value={customType}
                onChangeText={setCustomType}
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.cardAlt },
                ]}
              />
            )}

            {/* Description */}
            <Text style={[styles.label, { color: C.subtext, marginTop: 12 }]}>
              Description *
            </Text>
            <TextInput
              placeholder="Describe the situation briefly..."
              placeholderTextColor={C.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              style={[
                styles.textarea,
                { color: C.text, borderColor: C.border, backgroundColor: C.cardAlt },
              ]}
            />

            {/* Severity */}
            <Text style={[styles.label, { color: C.subtext, marginTop: 16 }]}>
              Severity Level *
            </Text>
            <View style={styles.typeContainer}>
              {["Low", "Medium", "High"].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor:
                        severity === s
                          ? s === "High"
                            ? "#ff0000"
                            : s === "Medium"
                              ? "#E6A23C"
                              : "#67C23A"
                          : C.cardAlt,
                      borderColor: C.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: severity === s ? "#fff" : C.text,
                      fontWeight: "600",
                    }}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Affected */}
            <Text style={[styles.label, { color: C.subtext, marginTop: 16 }]}>
              Estimated People Affected
            </Text>
            <TextInput
              placeholder="e.g., 5"
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              value={affected}
              onChangeText={setAffected}
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.cardAlt },
              ]}
            />

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Button
                title={photos.length === 0 ? "Capture Photo" : "Add More Photos"}
                onPress={takePhoto}
              />
              <Button
                title={locLoading ? "Setting..." : loc ? "Location Set" : "Use My Location"}
                variant={loc ? "primary" : "outline"}
                loading={locLoading}
                onPress={getLocation}
              />
            </View>

            {/* Photo preview */}
            {photos.length > 0 && (
              <View style={{ marginTop: 16, gap: 16 }}>
                {photos.map((p, idx) => (
                  <View key={idx} style={styles.photoContainer}>
                    <Image
                      source={{ uri: p.uri }}
                      style={[styles.fullPhoto, { aspectRatio: p.aspectRatio }]}
                      resizeMode="contain"
                    />

                    <TouchableOpacity
                      style={styles.closeIcon}
                      onPress={() =>
                        setPhotos((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {/* Location Info */}
            {loc && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: C.subtext, fontSize: 12 }}>
                  Location:{" "}
                  {loc.name ??
                    `${loc.coordinates[1].toFixed(5)}, ${loc.coordinates[0].toFixed(5)}`}
                </Text>
              </View>
            )}
          </Card>

          {/* Submit */}
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Button
              title="Submit Report"
              onPress={submit}
              loading={loading}
              style={{ marginTop: 24 }}
            />
            <Text
              style={{
                color: C.subtext,
                textAlign: "center",
                marginTop: 10,
                fontSize: 12,
              }}
            >
              Your report will be sent to nearby volunteers and coordinators.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fullscreen loader */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ color: C.text, marginTop: 10 }}>Submitting Report...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 12, marginTop: 12, textAlign: "center" },
  label: { fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 8,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    minHeight: 110,
    textAlignVertical: "top",
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  typeBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  photoContainer: {
    position: "relative",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
  },
  fullPhoto: {
    width: width - 64,
    borderRadius: 12,
  },
  closeIcon: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "#0008",
    borderRadius: 999,
    padding: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000090",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
});
