import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import BackHeader from "@/components/ui/BackHeader";
import api from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VolunteerDetailsScreen() {
  const { volunteer } = useLocalSearchParams();
  const data = JSON.parse(volunteer as string);

  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];
  const router = useRouter();

  const [stats, setStats] = useState<any | null>(null);

  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const config = await getAuthConfig();
      const res = await api.get(`/users/${data._id}/stats`, config);
      setStats(res.data);
    } catch (err) {
      console.log("Stats error:", err);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Volunteer Details" />

      <ScrollView style={[styles.container, { backgroundColor: C.background }]}>

        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={
              data.avatarUrl
                ? { uri: data.avatarUrl }
                : require("../../assets/images/default-avatar.jpg")
            }
            style={styles.avatarLarge}
          />

          <Text style={[styles.name, { color: C.text }]}>
            {data.firstName || data.lastName
              ? `${data.firstName} ${data.lastName}`
              : data.username}
          </Text>

          <Text style={[styles.email, { color: C.subtext }]}>{data.email}</Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(data.status) },
            ]}
          >
            <Text style={styles.statusText}>{data.status}</Text>
          </View>
        </View>

        {/* PERSONAL INFO */}
        <Section title="Personal Information">
          <LabelValue label="Full Name" value={`${data.firstName} ${data.lastName}`} />
          <LabelValue label="Birth Date" value={data.birthDate?.slice(0, 10)} />
        </Section>

        {/* CONTACT */}
        <Section title="Contact Information">
          <LabelValue label="Phone" value={data.phone || "N/A"} />
          <LabelValue
            label="Address"
            value={`${data.address1 || ""}, ${data.city || ""}`}
          />
        </Section>

        {/* SKILLS */}
        <Section title="Skills">
          {data.skills?.length ? (
            data.skills.map((s: string, i: number) => (
              <Text key={i} style={[styles.skillItem, { color: C.text }]}>
                • {s}
              </Text>
            ))
          ) : (
            <Text style={{ color: C.subtext }}>No skills listed.</Text>
          )}
        </Section>

        {/* EMERGENCY CONTACTS */}
        <Section title="Emergency Contacts">
          {data.emergencyContacts?.length ? (
            data.emergencyContacts.map((c: any, i: number) => (
              <View key={i} style={styles.ecCard}>
                <LabelValue label="Name" value={c.name} />
                <LabelValue label="Relation" value={c.relation} />
                <LabelValue label="Phone" value={c.phone} />
              </View>
            ))
          ) : (
            <Text style={{ color: C.subtext }}>No emergency contacts provided.</Text>
          )}
        </Section>

        {/* FILES */}
        <Section title="Certificates & Files">
          {data.files?.length ? (
            data.files.map((f: any) => (
              <TouchableOpacity
                key={f._id}
                style={styles.fileCard}
                onPress={() => Linking.openURL(f.url)}
              >
                <Text style={[styles.fileName, { color: C.text }]}>{f.name}</Text>
                <Text style={[styles.fileType, { color: C.subtext }]}>
                  {f.category}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: C.subtext }}>No files uploaded.</Text>
          )}
        </Section>

        {/* AVAILABILITY */}
        <Section title="Weekly Availability">
          {data.availability?.length ? (
            data.availability.map((a: any, i: number) => (
              <Text key={i} style={{ color: C.text }}>
                {a.day}: {a.from} - {a.to}
              </Text>
            ))
          ) : (
            <Text style={{ color: C.subtext }}>No availability set.</Text>
          )}
        </Section>

        {/* STATS */}
        <Section title="Volunteer Stats">
          <LabelValue label="Total Hours" value={`${stats?.hours || 0} hrs`} />
          <LabelValue label="Completed Tasks" value={stats?.completed || 0} />
          <LabelValue label="Active Tasks" value={stats?.inProgress || 0} />
        </Section>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper components
const Section = ({ title, children }: any) => {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  return (
    <View style={[styles.section, { backgroundColor: C.card }]}>
      <Text style={[styles.sectionTitle, { color: C.accent }]}>{title}</Text>
      {children}
    </View>
  );
};

const LabelValue = ({ label, value }: any) => {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme];

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.label, { color: C.accent }]}>{label}</Text>
      <Text style={[styles.value, { color: C.text }]}>{value || "N/A"}</Text>
    </View>
  );
};

// Status color
const getStatusColor = (s: string) =>
  s === "active"
    ? "#2ecc71"
    : s === "busy"
      ? "#e67e22"
      : s === "away"
        ? "#3498db"
        : "#7f8c8d";

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 20 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: "600" },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarLarge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 10,
  },
  name: { fontSize: 24, fontWeight: "800" },
  email: { fontSize: 15, opacity: 0.7 },

  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  statusText: { color: "#fff", fontWeight: "700" },

  section: {
    padding: 16,
    borderRadius: 12,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  label: { fontSize: 14, fontWeight: "700" },
  value: { fontSize: 15, marginTop: 3 },

  skillItem: { marginBottom: 6, fontSize: 15 },

  ecCard: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  fileCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  fileName: { fontSize: 16, fontWeight: "600" },
  fileType: { fontSize: 13 },
});
