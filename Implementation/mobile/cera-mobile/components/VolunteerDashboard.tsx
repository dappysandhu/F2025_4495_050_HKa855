import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function VolunteerDashboard({ user }: any) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.greet}>Hey {user.username}, ready to help?</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/tabs/incidents" as any)}
      >
        <Text style={styles.btnText}>View Nearby Incidents</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/tabs/tasks" as any)}
      >
        <Text style={styles.btnText}>My Assigned Tasks</Text>
      </TouchableOpacity>

      {/* NO LIVE LOCATION — only button navigation */}
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: user.available ? "green" : "#C04A2B" },
        ]}
        onPress={() => router.push("/screens/UpdateAvailability" as any)}
      >
        <Text style={styles.btnText}>
          {user.available ? "Available (On-duty)" : "Unavailable (Off-duty)"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  greet: { fontSize: 22, fontWeight: "600", marginBottom: 12, textAlign: "center" },
  btn: {
    backgroundColor: "#C04A2B",
    padding: 16,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
