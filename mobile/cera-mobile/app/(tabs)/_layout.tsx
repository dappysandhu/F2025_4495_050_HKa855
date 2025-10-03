import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  return (
    <Stack
      initialRouteName="login" 
      screenOptions={{ headerShown: false }}
    />
  );
}
