import React, { useState, useEffect } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import BackHeader from "@/components/ui/BackHeader";
import { API_BASE_URL } from "@/constants/config";
import { useColorScheme } from "react-native";

export default function AvailabilityScreen() {
    const C = Colors[useColorScheme() || "dark"];

    const [weeks, setWeeks] = useState<any[]>([]);
    const [weekLabel, setWeekLabel] = useState("");
    const [weekNumber, setWeekNumber] = useState<number | null>(null);
    const [weekRange, setWeekRange] = useState("");
    const [tempTime, setTempTime] = useState(new Date());


    const [selectedDay, setSelectedDay] = useState("Mon");

    const [fromTime, setFromTime] = useState("");
    const [toTime, setToTime] = useState("");

    const [repeat, setRepeat] = useState(false);

    const [timeMode, setTimeMode] = useState<"from" | "to" | null>(null);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [weekDropdownVisible, setWeekDropdownVisible] = useState(false);


    const onTimeChange = (_: any, selected?: Date) => {
        if (selected) {
            setTempTime(selected);
        }
    };


    useEffect(() => {
        loadWeeks();
    }, []);

    useEffect(() => {
        if (weekNumber) loadExisting();
    }, [selectedDay, weekNumber]);

    // load weeks since approval and reset it at the start of each year
    const loadWeeks = async () => {
        const token = await AsyncStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data.approvedAt) {
            Alert.alert("Error", "You are not approved yet.");
            return;
        }

        const approved = new Date(res.data.approvedAt);
        const today = new Date();

        // --- Calculate current week since approval ---
        const diffDays = Math.floor(
            (today.getTime() - approved.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weeksSinceApproval = Math.floor(diffDays / 7);

        const weeksArr: any[] = [];

        // We will generate 52 weeks (1 year ahead)
        for (let i = 0; i < 52; i++) {
            const weekIndex = weeksSinceApproval + i;

            // Calculate actual start of the week
            const start = new Date(approved);
            start.setDate(approved.getDate() + weekIndex * 7);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            // ----------------------------
            // Week number resets every year
            // ----------------------------
            const startYear = start.getFullYear();
            const janFirst = new Date(startYear, 0, 1);

            // Calculate week number within this YEAR
            const daysFromYearStart = Math.floor(
                (start.getTime() - janFirst.getTime()) / (1000 * 60 * 60 * 24)
            );
            const weekNumber = Math.floor(daysFromYearStart / 7) + 1;

            const label = `Week ${weekNumber} (${start.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            })} - ${end.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            })}, ${startYear})`;

            weeksArr.push({
                weekNumber,
                year: startYear,
                range: `${start.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                })} - ${end.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                })}, ${startYear}`,
                label,
            });
        }

        setWeeks(weeksArr);
    };


    // load existing availability for selected week + day
    const loadExisting = async () => {
        const token = await AsyncStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/users/me/availability`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const list = res.data;

        const existing = list.find(
            (x: any) => x.weekNumber === weekNumber && x.day === selectedDay
        );

        if (existing) {
            setFromTime(existing.from);
            setToTime(existing.to);
            setRepeat(existing.repeatAllWeek);
        } else {
            setFromTime("");
            setToTime("");
            setRepeat(false);
        }
    };

    // save availability
    const save = async () => {
        if (!weekNumber || weekNumber <= 0) {
            Alert.alert("Error", "Please select a valid week.");
            return;
        }

        if (!fromTime || !toTime) {
            Alert.alert("Error", "Please select both start and end times.");
            return;
        }

        const token = await AsyncStorage.getItem("token");

        try {
            await axios.post(
                `${API_BASE_URL}/users/me/availability`,
                {
                    weekNumber,
                    weekRange,
                    day: selectedDay,
                    from: fromTime,
                    to: toTime,
                    repeatAllWeek: repeat,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Alert.alert("Success", "Availability saved!");
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.log("SAVE ERROR:", err.response?.data || err.message);
            } else if (err instanceof Error) {
                console.log("SAVE ERROR:", err.message);
            } else {
                console.log("SAVE ERROR:", err);
            }
            Alert.alert("Error", "Failed to save availability. Check all fields.");
        }
    };


    // format time
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleTimeChange = (_: any, date?: Date) => {
        setShowTimePicker(false);
        if (!date) return;

        const t = formatTime(date);
        if (timeMode === "from") setFromTime(t);
        if (timeMode === "to") setToTime(t);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <BackHeader title="Availability Submission" />
            <ThemedText style={[styles.sectionHeader, { color: C.text, backgroundColor: C.background, marginLeft: 20, marginTop: 20 }]}>
                My Availability
            </ThemedText>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Week */}
                <ThemedText style={[styles.label, { color: C.subtext }]}>Week</ThemedText>

                <TouchableOpacity
                    style={[styles.dropdown, { borderColor: C.icon }]}
                    onPress={() => setWeekDropdownVisible(true)}
                >
                    <ThemedText style={{ color: C.text }}>
                        {weekLabel || "Select a week"}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={C.icon} />
                </TouchableOpacity>

                {/* DAYS */}
                <ThemedText style={[styles.label, { color: C.subtext }]}>Day</ThemedText>

                <View style={styles.daysRow}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <TouchableOpacity
                            key={d}
                            onPress={() => setSelectedDay(d)}
                            style={[
                                styles.dayChip,
                                {
                                    borderColor: selectedDay === d ? C.accent : C.icon,
                                    backgroundColor:
                                        selectedDay === d ? `${C.accent}22` : "transparent",
                                },
                            ]}
                        >
                            <ThemedText style={{ color: C.text }}>{d}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* TIME PICKERS */}
                <View style={styles.timeRow}>
                    <TouchableOpacity
                        style={[styles.timeBox, { borderColor: C.icon }]}
                        onPress={() => {
                            setTimeMode("from");
                            setTempTime(new Date());
                            setShowTimePicker(true);
                        }}

                    >
                        <ThemedText style={{ color: C.text }}>
                            {fromTime || "Available from"}
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.timeBox, { borderColor: C.icon }]}
                        onPress={() => {
                            setTimeMode("to");
                            setTempTime(new Date());
                            setShowTimePicker(true);
                        }}
                    >
                        <ThemedText style={{ color: C.text }}>
                            {toTime || "Available till"}
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* REPEAT */}
                <TouchableOpacity
                    style={styles.repeatRow}
                    onPress={() => setRepeat(!repeat)}
                >
                    <Ionicons
                        name={repeat ? "checkbox" : "square-outline"}
                        size={22}
                        color={C.accent}
                    />
                    <ThemedText style={{ marginLeft: 8, color: C.text }}>
                        Repeat this for all days of the week.
                    </ThemedText>
                </TouchableOpacity>

                {/* SAVE */}
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: C.accent }]}
                    onPress={save}
                >
                    <ThemedText style={styles.saveText}>Save availability</ThemedText>
                </TouchableOpacity>
            </ScrollView>

            {/* WEEK DROPDOWN */}
            <Modal visible={weekDropdownVisible} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={[styles.modalCard, { backgroundColor: C.card }]}>
                        <ScrollView>
                            {weeks.map((w) => (
                                <TouchableOpacity
                                    key={w.weekNumber}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setWeekLabel(w.label);
                                        setWeekNumber(w.weekNumber);
                                        setWeekRange(w.range);
                                        setWeekDropdownVisible(false);
                                    }}
                                >
                                    <ThemedText style={{ color: C.text }}>{w.label}</ThemedText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setWeekDropdownVisible(false)}
                        >
                            <ThemedText style={{ color: C.accent }}>Close</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* TIME PICKER */}
            {showTimePicker && (
                <View style={{ marginTop: 10 }}>
                    <DateTimePicker
                        value={tempTime}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onTimeChange}
                    />

                    {Platform.OS === "ios" && (
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                marginTop: 10,
                                paddingHorizontal: 10,
                            }}
                        >
                            {/* CANCEL */}
                            <TouchableOpacity
                                onPress={() => {
                                    setShowTimePicker(false);
                                    setTempTime(new Date()); // reset
                                }}
                            >
                                <ThemedText style={{ color: C.subtext }}>Cancel</ThemedText>
                            </TouchableOpacity>

                            {/* CONFIRM */}
                            <TouchableOpacity
                                onPress={() => {
                                    const formatted = tempTime.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    });

                                    if (timeMode === "from") setFromTime(formatted);
                                    if (timeMode === "to") setToTime(formatted);

                                    setShowTimePicker(false);
                                }}
                            >
                                <ThemedText style={{ color: C.accent }}>Confirm</ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    label: { marginBottom: 6, fontWeight: "600" },

    dropdown: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },

    daysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },

    dayChip: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },

    timeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 14,
    },

    timeBox: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        width: "48%",
    },

    repeatRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 25,
    },

    saveBtn: {
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: "center",
    },

    saveText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },

    // modal
    modalBg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalCard: {
        width: "100%",
        maxHeight: "60%",
        borderRadius: 12,
        padding: 16,
    },
    modalItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: "#333",
    },
    modalClose: {
        paddingVertical: 14,
        alignItems: "center",
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 12,
    },
});
