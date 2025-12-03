import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { useRouter } from "expo-router";
import BackHeader from "@/components/ui/BackHeader";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AllVolunteersScreen() {
  const scheme = useColorScheme() || "light";
  const C = Colors[scheme];
  const router = useRouter();

  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [skill, setSkill] = useState("");
  const [certifiedOnly, setCertifiedOnly] = useState(false);

  // sorting
  const [sortBy, setSortBy] = useState("name"); // name | status | certified

  // pagination
  const [page, setPage] = useState(1);
  const limit = 10; // number of volunteers per page
  const [hasMore, setHasMore] = useState(false);

  const statuses = ["active", "busy", "away", "offline"];

  const getAuthConfig = async () => {
    const token = await AsyncStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const load = async () => {
  setLoading(true);

  try {
    const config = await getAuthConfig();

    const params: any = {
      page,
      limit,
      sort: sortBy,
    };

    if (search) params.search = search;
    if (status) params.status = status;
    if (certifiedOnly) params.certified = "true";
    if (skill) params.skill = skill;

    const res = await api.request({
      method: "GET",
      url: "/users",
      headers: config.headers,
      params,
    });

    console.log("API RESPONSE:", res.data);

    // CASE 1 — backend returns array only
    if (Array.isArray(res.data)) {
      setVolunteers(res.data);
      setHasMore(false);
      return;
    }

    // CASE 2 — backend returns paginated object
    setVolunteers(res.data.data || []);
    setHasMore(res.data.hasMore || false);

  } catch (err) {
    console.error("Failed to load volunteers:", err);
    setVolunteers([]);
    setHasMore(false);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    load();
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const onCardPress = (v: any) => {
    router.push({
      pathname: "/screens/VolunteerDetailScreen",
      params: { volunteer: JSON.stringify(v) },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]}>
      <BackHeader title="Volunteers" />

      {/* Search Box */}
      <TextInput
        placeholder="Search volunteers..."
        placeholderTextColor={C.subtext}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={applyFilters}
        style={[
          styles.searchBox,
          { backgroundColor: C.card, color: C.text, borderColor: C.border },
        ]}
      />

      {/* Fixed-height filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8 }}
        contentContainerStyle={{ height: 45, alignItems: "center" }}
      >
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => {
              setStatus(s === status ? "" : s);
              setTimeout(applyFilters, 10);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: status === s ? C.accent : C.card,
                height: 36,
              },
            ]}
          >
            <Text
              style={{
                color: status === s ? "#fff" : C.text,
                fontWeight: "600",
              }}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Certified toggle */}
      <TouchableOpacity
        onPress={() => {
          setCertifiedOnly(!certifiedOnly);
          setTimeout(applyFilters, 10);
        }}
        style={[
          styles.certToggle,
          {
            backgroundColor: certifiedOnly ? C.accent : C.card,
            height: 36,
          },
        ]}
      >
        <Text style={{ color: certifiedOnly ? "#fff" : C.text }}>
          Certified Only
        </Text>
      </TouchableOpacity>

      {/* Sorting */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          height: 45,
          alignItems: "center",
          marginTop: 10,
          marginLeft: 16,
        }}
      >
        {[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
          { key: "certified", label: "Certified" },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => {
              setSortBy(opt.key);
              setTimeout(applyFilters, 10);
            }}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === opt.key ? C.accent : C.card,
                height: 36,
              },
            ]}
          >
            <Text
              style={{
                color: sortBy === opt.key ? "#fff" : C.text,
                fontWeight: "600",
              }}
            >
              Sort by {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Volunteer List */}
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
      >
        {volunteers.length === 0 && !loading ? (
          <Text style={[styles.empty, { color: C.subtext }]}>
            No volunteers found.
          </Text>
        ) : (
          volunteers.map((v) => (
            <TouchableOpacity
              key={v._id}
              style={[styles.card, { backgroundColor: C.card }]}
              onPress={() => onCardPress(v)}
            >
              <View style={styles.row}>
                <Image
                  source={
                    v.avatarUrl
                      ? { uri: v.avatarUrl }
                      : require("../../assets/images/default-avatar.jpg")
                  }
                  style={styles.avatar}
                />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]}>
                    {v.firstName || v.lastName
                      ? `${v.firstName} ${v.lastName}`
                      : v.username}
                  </Text>

                  <Text style={[styles.info, { color: C.subtext }]}>
                    {v.city || "Unknown location"}
                  </Text>

                  <View style={styles.skillRow}>
                    {(v.skills || []).slice(0, 3).map((s, i) => (
                      <View key={i} style={styles.skillTag}>
                        <Text
                          style={[
                            styles.skillText,
                            { color: C.accent, fontWeight: "600" },
                          ]}
                        >
                          {s}
                        </Text>
                      </View>
                    ))}
                    {v.skills?.length > 3 && (
                      <Text style={[styles.moreSkills, { color: C.accent }]}>
                        +{v.skills.length - 3}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.statusWrapper}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(v.status) },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Pagination */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            style={[styles.pageBtn, { opacity: page <= 1 ? 0.4 : 1 }]}
          >
            <Text style={{ color: "#fff" }}>Prev</Text>
          </TouchableOpacity>

          <Text style={{ color: C.text, fontSize: 16, paddingTop: 5 }}>
            Page {page}
          </Text>

          <TouchableOpacity
            disabled={!hasMore}
            onPress={() => setPage((p) => p + 1)}
            style={[styles.pageBtn, { opacity: hasMore ? 1 : 0.4 }]}
          >
            <Text style={{ color: "#fff" }}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Status color
const getStatusColor = (s: string): string => {
  switch (s) {
    case "active":
      return "#2ecc71";
    case "busy":
      return "#e67e22";
    case "away":
      return "#3498db";
    default:
      return "#7f8c8d";
  }
};

// STYLES
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  searchBox: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 6,
  },

  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },

  certToggle: {
    marginLeft: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    width: 130,
    alignItems: "center",
  },

  empty: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 40,
  },

  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  row: { flexDirection: "row", alignItems: "center" },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginRight: 14,
  },

  name: { fontSize: 18, fontWeight: "700" },

  info: { marginTop: 2 },

  skillRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },

  skillTag: {
    backgroundColor: "rgba(200,80,50,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  skillText: { fontSize: 12 },

  moreSkills: { fontSize: 12 },

  statusWrapper: { paddingLeft: 10 },

  statusDot: { width: 14, height: 14, borderRadius: 7 },

  pageBtn: {
    backgroundColor: "#444",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
