import React, { useState, useEffect } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { API_BASE_URL } from "@/constants/config";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";
import BackHeader from "@/components/ui/BackHeader";
import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";


export default function ContactInfoScreen() {
    const scheme = useColorScheme() || "dark";
    const C = Colors[scheme];
    const router = useRouter();


    // MAIN PROFILE DATA
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(""); // disabled
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [city, setCity] = useState("");
    const [postal, setPostal] = useState("");

    // EMERGENCY CONTACTS
    const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);

    // Load user profile
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await axios.get(`${API_BASE_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const u = res.data;

            setName(`${u.firstName || ""} ${u.lastName || ""}`.trim());
            setEmail(u.email || "");

            setPhone(u.phone || "");
            setAddress1(u.address1 || "");
            setAddress2(u.address2 || "");
            setCity(u.city || "");
            setPostal(u.postal || "");

            setEmergencyContacts(u.emergencyContacts || []);
        } catch (error) {
            Alert.alert("Error", "Unable to load contact info.");
        } finally {
            setLoading(false);
        }
    };

    // add / update / remove emergency contacts
    const addEmergencyContact = () => {
        setEmergencyContacts([
            ...emergencyContacts,
            { name: "", relation: "", phone: "" },
        ]);
    };

    const updateEmergencyContact = (index: number, key: string, value: string) => {
        const updated = [...emergencyContacts];
        updated[index][key] = value;
        setEmergencyContacts(updated);
    };

    const removeEmergencyContact = (index: number) => {
        const updated = emergencyContacts.filter((_, i) => i !== index);
        setEmergencyContacts(updated);
    };

    // save changes
    const save = async () => {
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem("token");

            await axios.patch(
                `${API_BASE_URL}/users/me`,
                {
                    username: name,
                    email: email,
                    phone,
                    address1,
                    address2,
                    city,
                    postal,
                    emergencyContacts,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // reload the updated data locally
            await loadData();

            Alert.alert("Saved", "Contact information updated!");

            // navigate back so ProfileScreen refreshes
            setTimeout(() => router.back(), 200);

        } catch (error) {
            Alert.alert("Error", "Could not save changes.");
        } finally {
            setSaving(false);
        }
    };



    // ui
    if (loading) {
        return (
            <SafeAreaView style={[styles.center, { backgroundColor: C.background }]}>
                <ActivityIndicator size="large" color={C.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
            <BackHeader title="Contact Information" />

            <ThemedText style={[styles.sectionTitle, { color: C.text, fontSize: 16, marginBottom: 8,backgroundColor: C.background, marginLeft: 20, marginTop: 20 }]}>
                Hi <ThemedText style={{ fontWeight: "700", fontSize: 16 }}>{name}</ThemedText>, keep your contact information up to date.
            </ThemedText>
            <ScrollView contentContainerStyle={{ padding: 16 }}>



                {/* <View
          style={[
            styles.input,
            { borderColor: C.icon, backgroundColor: C.card + "55" },
          ]}
        >
          <ThemedText style={{ color: C.text }}>{name}</ThemedText>
        </View> */}

                {/* PERSONAL INFO SECTION */}
                <ThemedText style={[styles.sectionTitle, { color: C.subtext, marginTop: -10 }]}>
                    Personal Information
                </ThemedText>

                <TextInput
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={[styles.input, { color: C.text, borderColor: C.icon }]}
                    placeholderTextColor={C.subtext}
                />

                {/* Email readonly */}
                {/* <View
          style={[
            styles.input,
            { borderColor: C.icon, backgroundColor: C.card + "55" },
          ]}
        >
          <ThemedText style={{ color: C.subtext }}>{email}</ThemedText>
        </View> */}

                <TextInput
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    style={[styles.input, { color: C.text, borderColor: C.icon }]}
                    placeholderTextColor={C.subtext}
                />

                <TextInput
                    placeholder="Address Line 1"
                    value={address1}
                    onChangeText={setAddress1}
                    style={[styles.input, { color: C.text, borderColor: C.icon }]}
                    placeholderTextColor={C.subtext}
                />

                <TextInput
                    placeholder="Address Line 2"
                    value={address2}
                    onChangeText={setAddress2}
                    style={[styles.input, { color: C.text, borderColor: C.icon }]}
                    placeholderTextColor={C.subtext}
                />

                <TextInput
                    placeholder="City"
                    value={city}
                    onChangeText={setCity}
                    style={[styles.input, { color: C.text, borderColor: C.icon }]}
                    placeholderTextColor={C.subtext}
                />

                <TextInput
                    placeholder="Postal Code"
                    value={postal}
                    onChangeText={setPostal}
                    style={[styles.input, { color: C.text, borderColor: C.icon }]}
                    placeholderTextColor={C.subtext}
                />

                {/*emergency contacts */}
                <ThemedText style={[styles.sectionTitle, { color: C.subtext }]}>
                    Emergency Contacts
                </ThemedText>

                {emergencyContacts.map((c, index) => (
                    <View key={index} style={[styles.card, { backgroundColor: C.card }]}>
                        <TextInput
                            placeholder="Contact Name"
                            value={c.name}
                            onChangeText={(v) =>
                                updateEmergencyContact(index, "name", v)
                            }
                            style={[styles.inputSmall, { color: C.text, borderColor: C.icon }]}
                            placeholderTextColor={C.subtext}
                        />

                        <TextInput
                            placeholder="Relationship"
                            value={c.relation}
                            onChangeText={(v) =>
                                updateEmergencyContact(index, "relation", v)
                            }
                            style={[styles.inputSmall, { color: C.text, borderColor: C.icon }]}
                            placeholderTextColor={C.subtext}
                        />

                        <TextInput
                            placeholder="Phone Number"
                            value={c.phone}
                            onChangeText={(v) =>
                                updateEmergencyContact(index, "phone", v)
                            }
                            keyboardType="phone-pad"
                            style={[styles.inputSmall, { color: C.text, borderColor: C.icon }]}
                            placeholderTextColor={C.subtext}
                        />

                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => removeEmergencyContact(index)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* ADD CONTACT BUTTON */}
                <TouchableOpacity
                    style={[styles.addBtn, { borderColor: C.accent }]}
                    onPress={addEmergencyContact}
                >
                    <Ionicons name="add-circle-outline" size={22} color={C.accent} />
                    <ThemedText style={{ color: C.accent, marginLeft: 6 }}>
                        Add Emergency Contact
                    </ThemedText>
                </TouchableOpacity>

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
    container: { flex: 1 },

    sectionTitle: {
        fontSize: 14,
        marginTop: 14,
        marginBottom: 6,
        fontWeight: "600",
    },

    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
    },

    inputSmall: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },

    card: {
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },

    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 10,
        justifyContent: "center",
    },

    removeBtn: {
        alignSelf: "flex-end",
        marginTop: 4,
    },

    saveBtn: {
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },

    saveText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#fff",
    },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
