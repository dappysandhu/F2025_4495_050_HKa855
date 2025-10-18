import { Stack } from "expo-router";
import React from "react";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
