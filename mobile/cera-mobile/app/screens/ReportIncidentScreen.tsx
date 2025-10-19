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

const { width } = Dimensions.get("window");

export default function ReportIncidentScreen() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];
  const router = useRouter();

  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; aspectRatio: number } | null>(null);
  const [loc, setLoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState("");
  const [affected, setAffected] = useState("");

  const predefinedTypes = [
    "Fire",
    "Medical Emergency",
    "Flood",
    "Earthquake",
    "Accident",
    "Crime",
    "Others",
  ];

  // upload photo
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to capture an image.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: true,
    });

    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      const aspectRatio = asset.width && asset.height ? asset.width / asset.height : 16 / 9;
      setPhoto({
        uri: `data:${asset.mimeType};base64,${asset.base64}`,
        aspectRatio,
      });
    }
  };

  // get location
  const getLocation = async () => {
    try {
      Toast.show({
        type: "info",
        text1: "Requesting Location...",
        text2: "Please allow access when prompted.",
        position: "bottom",
        visibilityTime: 2000,
      });

      let { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const res = await Location.requestForegroundPermissionsAsync();
        status = res.status;
        canAskAgain = res.canAskAgain;
      }

      if (status !== "granted") {
        if (!canAskAgain) {
          Alert.alert(
            "Permission Required",
            "Location permission permanently denied. Please enable it in system settings."
          );
        } else {
          Alert.alert(
            "Permission Needed",
            "Please grant location access so we can capture your position."
          );
        }
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      let name: string | undefined;
      try {
        const rev = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        name = [rev[0]?.name, rev[0]?.city].filter(Boolean).join(", ");
      } catch {}

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
      Alert.alert(
        "Error",
        error?.message?.includes("denied")
          ? "Please allow location access from app settings."
          : "Unable to fetch location. Try again outdoors."
      );
    }
  };

  // Submit incident
 const submit = async () => {
  const incidentType = type === "Others" ? "other" : type.toLowerCase();
    const customTypeValue = type === "Others" ? customType.trim() : "";

  if (!incidentType)
    return Alert.alert("Missing info", "Please select or enter an incident type.");
  if (!description.trim())
    return Alert.alert("Missing info", "Please enter a description.");
  if (!loc?.coordinates)
    return Alert.alert("Missing location", "Please set your location before submitting.");
  if (!photo)
    return Alert.alert("Missing photo", "Please capture a photo before submitting.");

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("type", incidentType);
formData.append("customType", customTypeValue);
    formData.append("description", description);
    formData.append("severity", severity);
    formData.append("affected", affected.toString());
    formData.append("location", JSON.stringify(loc));

    const isBase64 = photo.uri.startsWith("data:");

    formData.append(
      "photos",
      {
        uri: isBase64 ? photo.uri : photo.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any
    );

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
    setPhoto(null);
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


  const removePhoto = () => setPhoto(null);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: C.background }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: C.text }]}>Report an Incident</Text>

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
              <Button title={photo ? "Retake Photo" : "Capture Photo"} onPress={takePhoto} />
              <Button
                title={loc ? "Location Set" : "Use My Location"}
                variant={loc ? "primary" : "outline"}
                onPress={getLocation}
              />
            </View>

            {/* Photo preview */}
            {photo && (
              <View style={{ marginTop: 16 }}>
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[
                      styles.fullPhoto,
                      { aspectRatio: photo.aspectRatio || 16 / 9 },
                    ]}
                    resizeMode="contain"
                  />
                  <TouchableOpacity style={styles.closeIcon} onPress={removePhoto}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16, justifyContent: "space-between" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
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
});
