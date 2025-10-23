import React, { useEffect } from "react";
import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { StatusBar, Platform, View, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const scheme = useColorScheme() || "light";

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log(
          "Notification tapped:",
          response.notification.request.content.data
        );
        router.push("/tabs/profile/tasks");
      }
    );

    return () => subscription.remove();
  }, []);

  const isDark = scheme === "dark";
  const backgroundColor = isDark ? "#000" : "#fff";
  const barStyle = isDark ? "light-content" : "dark-content";

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor }}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={barStyle}
        />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor,
              paddingTop:
                Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
            },
          }}
        />

        <Toast />
      </View>
    </SafeAreaProvider>
  );
}
