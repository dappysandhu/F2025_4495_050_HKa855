import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import {
  StatusBar,
  Platform,
  View,
  useColorScheme,
  Linking,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

// notification behavior
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
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    // ⭐ If notification contains address → open maps
    if (data?.address) {
      const encoded = encodeURIComponent(String(data.address));
      const url =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?q=${encoded}`
          : `geo:0,0?q=${encoded}`;
      Linking.openURL(url);
      return;
    }

    // ⭐ Any other notification → go to tasks
    router.push("/tabs/profile/tasks");
  });

  return () => sub.remove();
}, []);

  const isDark = scheme === "dark";
  const backgroundColor = isDark ? "#000" : "#fff";
  const barStyle = isDark ? "light-content" : "dark-content";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ActionSheetProvider>
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor }}>
              <StatusBar translucent backgroundColor="transparent" barStyle={barStyle} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor,
                    paddingTop:
                      Platform.OS === "android"
                        ? StatusBar.currentHeight || 0
                        : 0,
                  },
                }}
              />
              <Toast />
            </View>
          </SafeAreaProvider>
        </BottomSheetModalProvider>
      </ActionSheetProvider>
    </GestureHandlerRootView>
  );
}
