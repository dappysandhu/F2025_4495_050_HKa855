import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "@/constants/config";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import BackHeader from "@/components/ui/BackHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function EditProfileScreen() {
  const C = Colors[useColorScheme() || "dark"];

  // states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(new Date()); // <-- new!

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const router = useRouter();

  // fetch profile
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const u = res.data;

      setFirstName(u.firstName || "");
      setLastName(u.lastName || "");

      setBirthDate(u.birthDate ? new Date(u.birthDate) : null);

      setEmail(u.email || "");
      setPhone(u.phone || "");

      setAvatarUrl(u.avatarUrl || null);

      setAddress1(u.address1 || "");
      setAddress2(u.address2 || "");
      setCity(u.city || "");
      setPostal(u.postal || "");

      setSkills(u.skills || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // avatar picker
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return Alert.alert("Permission required", "Enable Photos permission first.");
    }

    const img = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (img.canceled) return;

    const file = img.assets[0];
    const token = await AsyncStorage.getItem("token");

    const formData = new FormData();
    formData.append("avatar", {
      uri: file.uri,
      name: "avatar.jpg",
      type: "image/jpeg",
    } as any);

    try {
      setSaving(true);

      const res = await axios.patch(`${API_BASE_URL}/users/me/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setAvatarUrl(res.data.user.avatarUrl);
      Alert.alert("Success", "Profile photo updated.");
    } catch (err) {
      Alert.alert("Error", "Failed to upload photo.");
    } finally {
      setSaving(false);
    }
  };

  // skills
  const addSkill = () => {
    if (!newSkill.trim()) return;
    setSkills([...skills, newSkill.trim()]);
    setNewSkill("");
  };

  const removeSkill = (s: string) => {
    setSkills(skills.filter((x) => x !== s));
  };

  // save
  const save = async () => {
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem("token");

      await axios.patch(
        `${API_BASE_URL}/users/me`,
        {
          firstName,
          lastName,
          birthDate: birthDate ? birthDate.toISOString() : "",
          phone,
          email,
          address1,
          address2,
          city,
          postal,
          skills,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadProfile();
      Alert.alert("Saved", "Profile updated!");
      setTimeout(() => router.back(), 200);
    } catch (err) {
      Alert.alert("Error", "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // loading
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  // UI
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Edit Profile" />
      <ThemedText style={[styles.sectionHeader, { color: C.text, backgroundColor: C.background, marginLeft: 20, marginTop: 20 }]}>
        Edit Profile
      </ThemedText>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* AVATAR */}
        {/* <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
          <Image
            source={
              avatarUrl
                ? { uri: avatarUrl }
                : require("../../../assets/images/default-avatar.jpg")
            }
            style={styles.avatar}
          />

          {saving && (
            <ActivityIndicator style={StyleSheet.absoluteFill} color={C.accent} />
          )}
        </TouchableOpacity> */}

        <ThemedText style={[styles.sectionTitle, { color: C.subtext, marginTop: -10 }]}>
          Personal Details
        </ThemedText>


        {/* FIRST NAME */}
        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />

        {/* LAST NAME */}
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />

        {/* BIRTHDATE PICKER */}
        <TouchableOpacity
          onPress={() => {
            setTempDate(birthDate || new Date());
            setBirthPickerOpen(true);
          }}
          style={[styles.input, { borderColor: C.icon }]}
        >
          <ThemedText style={{ color: C.text }}>
            {birthDate
              ? birthDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
              : "Select Birthdate"}
          </ThemedText>
        </TouchableOpacity>

        {Platform.OS === "ios" && birthPickerOpen && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <TouchableOpacity onPress={() => setBirthPickerOpen(false)}>
              <ThemedText style={{ color: C.subtext }}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setBirthPickerOpen(false);
                setBirthDate(tempDate);
              }}
            >
              <ThemedText style={{ color: C.accent }}>Confirm</ThemedText>
            </TouchableOpacity>
          </View>
        )}



        {birthPickerOpen && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              if (Platform.OS === "android") {
                setBirthPickerOpen(false);
                if (selectedDate) setBirthDate(selectedDate);
              } else {
                if (selectedDate) setTempDate(selectedDate);
              }
            }}
          />
        )}


        <ThemedText style={[styles.sectionTitle, { color: C.subtext }]}>
          Contact Information
        </ThemedText>

        {/* EMAIL */}
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />


        {/* PHONE */}
        <TextInput
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />

        <ThemedText style={[styles.sectionTitle, { color: C.subtext }]}>
          Address
        </ThemedText>

        {/* ADDRESS */}
        <TextInput
          placeholder="Address Line 1"
          value={address1}
          onChangeText={setAddress1}
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />

        <TextInput
          placeholder="Address Line 2"
          value={address2}
          onChangeText={setAddress2}
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />

        <TextInput
          placeholder="City"
          value={city}
          onChangeText={setCity}
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />

        <TextInput
          placeholder="Postal Code"
          value={postal}
          onChangeText={setPostal}
          style={[styles.input, { borderColor: C.icon, color: C.text }]}
          placeholderTextColor={C.subtext}
        />


        <ThemedText style={[styles.sectionTitle, { color: C.subtext }]}>
          Skills
        </ThemedText>

        {/* SKILLS */}
        <ThemedText style={[styles.label, { color: C.subtext }]}>Skills</ThemedText>

        <View style={styles.skillsContainer}>
          {skills.map((s) => (
            <View key={s} style={[styles.skillChip, { borderColor: C.icon }]}>
              <ThemedText style={{ color: C.text }}>{s}</ThemedText>

              <TouchableOpacity onPress={() => removeSkill(s)}>
                <ThemedText style={{ color: "#ff4444", marginLeft: 8 }}>×</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.addSkillRow}>
          <TextInput
            placeholder="Add Skill"
            value={newSkill}
            onChangeText={setNewSkill}
            style={[styles.inputSmall, { borderColor: C.icon, color: C.text }]}
            placeholderTextColor={C.subtext}
          />

          <TouchableOpacity
            onPress={addSkill}
            style={[styles.addBtn, { backgroundColor: C.accent }]}
          >
            <ThemedText style={{ color: "#fff" }}>Add</ThemedText>
          </TouchableOpacity>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.accent }]}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveText}>Save Changes</ThemedText>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  scroll: { padding: 20 },

  avatarWrap: { alignSelf: "center", marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60 },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },

  label: { marginTop: 10, marginBottom: 6 },

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  skillChip: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
  },

  addSkillRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  inputSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },

  addBtn: { padding: 12, borderRadius: 8 },

  saveBtn: {
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 30,
    alignItems: "center",
  },

  saveText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 14,
    marginTop: 14,
    marginBottom: 6,
    fontWeight: "600",
  },


});
