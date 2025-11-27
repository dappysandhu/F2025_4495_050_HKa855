import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Share,
  FlatList,
  Modal,
  TextInput,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import BackHeader from "@/components/ui/BackHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/services/api";
import * as Location from "expo-location";

export default function EmergencyContacts() {
  const scheme = useColorScheme() || "dark";
  const C = Colors[scheme as "dark" | "light"];

  const [contacts, setContacts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // ------------------ LOAD CONTACTS ------------------
  const loadContacts = async () => {
    try {
      const res = await api.get("/users/me");
      setContacts(res.data.emergencyContacts || []);
    } catch (err) {
      console.log("Load contacts error:", err);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // ------------------ FUNCTIONS ------------------

  const dial = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  const shareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Location permission required");
      return;
    }

    const pos = await Location.getCurrentPositionAsync({});
    const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;

    Share.share({ message: `My location: ${url}` });
  };

  const saveContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await api.post("/users/me/emergency-contacts", {
        name: newName.trim(),
        phone: newPhone.trim(),
      });

      setContacts(res.data.emergencyContacts);
      setNewName("");
      setNewPhone("");
      setModalVisible(false);
    } catch (err) {
      console.log("Save contact error:", err);
    }
  };

  const deleteContact = async (index: number) => {
    try {
      const res = await api.delete(`/users/me/emergency-contacts/${index}`);
      setContacts(res.data.emergencyContacts);
    } catch (err) {
      console.log("Delete contact error:", err);
    }
  };

  // ------------------------ UI ---------------------------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <BackHeader title="Emergency Contacts" />

      <View style={styles.inner}>
        {/* EMERGENCY SERVICES */}
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            Emergency Services
          </Text>

          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: C.cardAlt }]}
            onPress={() => dial("911")}
          >
            <Text style={[styles.callText, { color: C.text }]}>
              🚓 Police (911)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: C.cardAlt }]}
            onPress={() => dial("911")}
          >
            <Text style={[styles.callText, { color: C.text }]}>
              🚑 Ambulance (911)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: C.cardAlt }]}
            onPress={() => dial("911")}
          >
            <Text style={[styles.callText, { color: C.text }]}>
              🚒 Fire Dept (911)
            </Text>
          </TouchableOpacity>
        </Card>

        {/* PERSONAL CONTACTS */}
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            My Emergency Contacts
          </Text>

          <FlatList
            data={contacts}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={[styles.contactItem, { backgroundColor: C.cardAlt }]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => dial(item.phone)}
                >
                  <Text style={{ color: C.text, fontSize: 16 }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: C.subtext }}>{item.phone}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => deleteContact(index)}
                  style={[styles.deleteBtn, { borderColor: C.border }]}
                >
                  <Text style={{ color: C.subtext }}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <Button
            title="Add Contact"
            variant="outline"
            onPress={() => setModalVisible(true)}
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* SHARE LOCATION */}
        <Button
          title="Share My Location"
          onPress={shareLocation}
          style={{ marginTop: 20 }}
        />
      </View>

      {/* ADD CONTACT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              Add Emergency Contact
            </Text>

            <TextInput
              placeholder="Name"
              placeholderTextColor={C.muted}
              value={newName}
              onChangeText={setNewName}
              style={[styles.input, { borderColor: C.border, color: C.text }]}
            />

            <TextInput
              placeholder="Phone Number"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
              style={[styles.input, { borderColor: C.border, color: C.text }]}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Save"
                onPress={saveContact}
                style={{ flex: 1, marginRight: 10 }}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------- STYLES -----------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 16, flexGrow: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  callBtn: {
    padding: 14,
    borderRadius: 10,
    marginVertical: 5,
  },
  callText: { fontSize: 16, fontWeight: "600" },
  contactItem: {
    padding: 14,
    borderRadius: 10,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 10,
  },
});
