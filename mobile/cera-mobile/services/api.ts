import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "@/constants/config";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;


api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  console.log("Outgoing request:", config.url);
  console.log("Token found:", token ? "YES" : "NO");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
