import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushNotification } from "./sendPushNotification.js";

/**
 * Sends a push notification and saves it in MongoDB.
 * Works for all user roles.
 */
export async function notifyUser(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(` notifyUser: User not found → ${userId}`);
      return;
    }

    // Save in DB for in-app notifications tab
    const note = await Notification.create({
      user: userId,
      title,
      body,
      read: false,
      metadata: data,
    });

    // Collect Expo push tokens (single or multiple)
    let tokens = [];
    if (user.expoPushToken) tokens.push(user.expoPushToken);
    if (Array.isArray(user.pushTokens)) {
      user.pushTokens.forEach((t) => {
        if (t?.token) tokens.push(t.token);
      });
    }

    // Send the notification
    if (tokens.length > 0) {
      for (const token of tokens) {
        await sendPushNotification(token, title, body, data);
      }
      console.log(`Push sent to ${user.username || user.email}`);
    } else {
      console.log(` No Expo token for ${user.username || user.email}`);
    }

    return note;
  } catch (err) {
    console.error(" notifyUser error:", err);
  }
}
