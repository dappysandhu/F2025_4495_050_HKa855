import fetch from "node-fetch";

/**
 * Send a push notification via Expo Push API
 * @param {string} token - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {object} data - Optional custom data (for navigation etc.)
 */
export async function sendPushNotification(token, title, body, data = {}) {
  try {
    const message = {
      to: token,
      sound: "default",
      title,
      body,
      data,
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (result?.data?.status !== "ok") {
      console.warn("Expo push error:", result);
    } else {
      console.log("Push sent to", token);
    }
  } catch (err) {
    console.error("Push notification failed:", err);
  }
}
