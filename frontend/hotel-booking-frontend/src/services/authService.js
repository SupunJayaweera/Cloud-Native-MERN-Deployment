import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authService = {
  async login(email, password) {
    const response = await api.post("/api/users/login", { email, password });
    return response.data;
  },

  async register(userData) {
    const response = await api.post("/api/users/register", userData);
    return response.data;
  },

  async getProfile(token) {
    const response = await api.get("/api/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async updateProfile(profileData, token) {
    const response = await api.put("/api/users/profile", profileData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
