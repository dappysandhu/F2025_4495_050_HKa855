import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import BackHeader from "@/components/ui/BackHeader"; // ✅ App Bar

export default function AllVolunteersScreen() {
  const scheme = useColorScheme() || "light";
  const C = Colors[scheme as "dark" | "light"];
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const load = async () => {
    setLoading(true);
    try {
      const config = await getAuthConfig();
      const res = await api.get("/users?role=volunteer&approved=true", config);
      setVolunteers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load volunteers:", err);
      Alert.alert("Error", "Unable to fetch approved volunteers.");
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      {/* ✅ App Bar */}
      <BackHeader title="Back" />

      {/* ✅ Page Title below App Bar */}
      <Text style={[styles.pageTitle, { color: C.text }]}>Approved Volunteers</Text>

      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: C.background }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {(!volunteers || volunteers.length === 0) && !loading ? (
          <Text style={[styles.empty, { color: C.subtext }]}>
            No approved volunteers yet.
          </Text>
        ) : (
          volunteers.map((v) => (
            <View key={v._id} style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.name, { color: C.text }]}>{v.username}</Text>
              <Text style={[styles.info, { color: C.subtext }]}>
                Email: {v.email}
              </Text>

              {v.skills && v.skills.length > 0 ? (
                <View style={styles.skillContainer}>
                  {v.skills.map((skill: string, idx: number) => (
                    <View key={idx} style={styles.skillTag}>
                      <Text style={[styles.skillText, { color: C.accent }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.info, { color: C.subtext }]}>
                  No skills listed
                </Text>
              )}
            </View>
          ))
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 16 },

 
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },

  empty: {
    textAlign: "center",
    fontSize: 15,
    marginTop: 20,
    opacity: 0.7,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  name: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  info: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
  skillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  skillTag: {
    backgroundColor: "rgba(192, 74, 43, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  skillText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
