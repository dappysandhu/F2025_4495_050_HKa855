import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import BackHeader from "@/components/ui/BackHeader";
import { API_BASE_URL } from "@/constants/config";
import { useColorScheme } from "react-native";

export default function FilesScreen() {
  const C = Colors[useColorScheme() || "dark"];
  const router = useRouter();

  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Certificate");

  const categories = ["Certificate", "ID", "Training", "Other"];

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(`${API_BASE_URL}/users/me/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFiles(res.data || []);
    } catch (err) {
      Alert.alert("Error", "Unable to load files");
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "application/*"],
      });

      if (result.canceled) return;

      const file = result.assets[0];

      if (typeof file.size === "number" && file.size > 10 * 1024 * 1024) {
        Alert.alert("Too Large", "Max file size is 10MB");
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);

      formData.append("category", selectedCategory);

      const token = await AsyncStorage.getItem("token");
      setUploading(true);

      const uploadRes = await axios.post(
        `${API_BASE_URL}/users/me/files`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setFiles(uploadRes.data.files);
      Alert.alert("Uploaded", "File uploaded successfully");
    } catch (err) {
      Alert.alert("Error", "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await axios.delete(
        `${API_BASE_URL}/users/me/files/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFiles(res.data.files);
    } catch (err) {
      Alert.alert("Error", "Unable to delete file");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <BackHeader title="My Files" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* CATEGORY SELECTOR */}
          <ThemedText style={[styles.sectionTitle, { color: C.subtext }]}>
            File Category
          </ThemedText>

          <View style={styles.catRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    borderColor: selectedCategory === cat ? C.accent : C.icon,
                    backgroundColor:
                      selectedCategory === cat ? `${C.accent}22` : "transparent",
                  },
                ]}
              >
                <ThemedText style={{ color: C.text }}>{cat}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* If no files */}
          {files.length === 0 && (
            <ThemedText style={{ color: C.subtext, marginTop: 20 }}>
              No files uploaded.
            </ThemedText>
          )}

          {/* File List */}
          {files.map((f) => (
            <TouchableOpacity
              key={f._id}
              style={[styles.fileCard, { backgroundColor: C.card }]}
              onPress={() =>
                router.push({
                  pathname: "/tabs/profile/file_viewer",
                  params: { url: f.url, name: f.name },
                })
              }
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: C.text, fontWeight: "600" }}>
                  {f.name}
                </ThemedText>
                <ThemedText style={{ color: C.subtext, fontSize: 12 }}>
                  {f.category} • {(f.size / 1024).toFixed(1)} KB
                </ThemedText>
              </View>

              <TouchableOpacity onPress={() => deleteFile(f._id)}>
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* Upload Button */}
          <TouchableOpacity
            style={[styles.uploadBtn, { borderColor: C.accent }]}
            onPress={pickFile}
          >
            {uploading ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={22} color={C.accent} />
                <ThemedText style={{ marginLeft: 8, color: C.accent }}>
                  Upload File
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600",
  },

  catRow: {
    flexDirection: "row",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },

  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  fileCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 20,
  },
});
