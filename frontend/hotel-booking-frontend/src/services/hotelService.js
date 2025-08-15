import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_HOTEL_API_BASE_URL || 'http://localhost:3002';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const hotelService = {
  async getHotels(params = {}) {
    const response = await api.get('/api/hotels', { params });
    return response.data;
  },

  async getHotelById(hotelId) {
    const response = await api.get(`/api/hotels/${hotelId}`);
    return response.data;
  },

  async searchHotels(params = {}) {
    const response = await api.get('/api/hotels/search', { params });
    return response.data;
  }
};

