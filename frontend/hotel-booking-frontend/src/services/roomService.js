import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_ROOM_API_BASE_URL || 'http://localhost:3003';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const roomService = {
  async getRoomsByHotel(hotelId, params = {}) {
    const response = await api.get(`/api/hotels/${hotelId}/rooms`, { params });
    return response.data;
  },

  async getRoomById(roomId) {
    const response = await api.get(`/api/rooms/${roomId}`);
    return response.data;
  },

  async checkAvailability(roomId, checkIn, checkOut) {
    const response = await api.get(`/api/rooms/${roomId}/availability`, {
      params: { checkIn, checkOut }
    });
    return response.data;
  }
};

