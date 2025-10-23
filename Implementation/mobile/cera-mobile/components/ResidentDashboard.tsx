import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import report from "../app/tabs/report";


export default function ResidentDashboard({ user }: { user: any }) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.greet}>Hello, {user.username} !!</Text>
      <View style={{ height: 8 }} />
      <TouchableOpacity style={styles.btn} onPress={() => router.push("/tabs/report" as any)}>
        <Text style={styles.btnText}>Report New Incident</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => router.push("/tabs/my-reports" as any)}>
        <Text style={styles.btnText}>View My Reports</Text>
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
