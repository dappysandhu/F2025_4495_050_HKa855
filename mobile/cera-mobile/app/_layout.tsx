import React, { useEffect } from "react";
import { Stack } from "expo-router";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

// Configure notification behavior (when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // show a banner when app is open
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // listener runs when user taps a notification (app in background or closed)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification tapped:", response.notification.request.content.data);

        // You can customize this — for now, always go to My Tasks
        router.push("/tabs/profile/tasks");
      }
    );

    // Cleanup listener on unmount
    return () => subscription.remove();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}
