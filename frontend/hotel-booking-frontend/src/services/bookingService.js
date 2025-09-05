import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_BOOKING_API_BASE_URL &&
  import.meta.env.VITE_BOOKING_API_BASE_URL.trim()
    ? import.meta.env.VITE_BOOKING_API_BASE_URL.trim()
    : "";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const bookingService = {
  async createBooking(bookingData, token) {
    const response = await api.post("/api/bookings", bookingData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getBookingById(bookingId, token) {
    const response = await api.get(`/api/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getUserBookings(userId, params = {}, token) {
    const response = await api.get(`/api/users/${userId}/bookings`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async cancelBooking(bookingId, token) {
    const response = await api.post(
      `/api/bookings/${bookingId}/cancel`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  async getSagaState(sagaId, token) {
    const response = await api.get(`/api/sagas/${sagaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
