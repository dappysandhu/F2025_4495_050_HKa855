import Notification from "../models/Notification.js"
import User from "../models/User.js"
import { sendPushNotification } from "./sendPushNotification.js"
/**
 * Sends a push notification AND stores it in the database.
 * Works for all roles (Resident, Volunteer, Coordinator).
 *
 * @param {string} userId - MongoDB ID of the target user
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {object} data - Optional extra data (e.g. { incidentId })
 */

export async function notifyUser(userId,title,body,data={}){
    try {
    //  Fetch the target user to get their Expo push token
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }
    

    //Save the notification in MongoDB(to appear it in the app tab)
    const note=await Notification.create({
        user:userId,
        title,
        body,
        data,
    })

    // If the user has a registered Expo push token, send system notification
    if (user.expoPushToken) {
      await sendPushNotification(user.expoPushToken, title, body, data);
      console.log(`Push sent to ${user.username || user.email}`);
    } else {
      console.log(` No Expo token for ${user.username || user.email}`);
    }

    return note;
  } catch (err) {
    console.error(" notifyUser error:", err);
  }
}