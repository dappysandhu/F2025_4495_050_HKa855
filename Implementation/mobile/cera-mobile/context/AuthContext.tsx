import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/services/api";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

type User = {
  _id: string;
  username: string;
  email: string;
  role: "resident" | "volunteer" | "coordinator";
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stored session at startup
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("user"),
        ]);

        if (storedToken) {
          api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
          setToken(storedToken);
        }

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          if (storedToken && parsedUser?._id) {
            await registerPushToken(parsedUser._id);
          }
        }

        console.log("AuthContext loaded:", {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
        });
      } catch (err) {
        console.error("Error loading session:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStoredSession();

    // Safety fallback if AsyncStorage hangs
    const timeout = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(timeout);
  }, []);

  // Login handler
  const login = async (newToken: string, userData?: User) => {
    try {
      await AsyncStorage.setItem("token", newToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      setToken(newToken);

      if (userData) {
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);

        if (userData._id) await registerPushToken(userData._id);
      } else {
        await refreshUser();
      }

      console.log("Login successful");
    } catch (err) {
      console.error("Login save error:", err);
    }
  };

  // Refresh user from backend
  const refreshUser = async () => {
    try {
      const res = await api.get("/users/me");
      const fetchedUser = res.data;
      setUser(fetchedUser);
      await AsyncStorage.setItem("user", JSON.stringify(fetchedUser));
      console.log("User refreshed:", fetchedUser.username);
    } catch (err) {
      console.error("Failed to refresh user info:", err);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "user"]);
      setUser(null);
      setToken(null);
      delete api.defaults.headers.common["Authorization"];
      console.log("User logged out");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Push notification registration
  const registerPushToken = async (userId: string) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Push notification permission not granted");
        return;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        "e80c575b-6c82-4093-83f4-eec29ceb4841";

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenData.data;
      console.log("Expo Push Token:", pushToken);

      await api.post("/users/me/push-token", { token: pushToken });
    } catch (err) {
      console.error("Push registration failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
