const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

class AdminService {
  async createHotel(hotelData, token) {
    const response = await fetch(`http://localhost:3002/api/hotels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(hotelData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create hotel");
    }

    return response.json();
  }

  async updateHotel(hotelId, hotelData, token) {
    const response = await fetch(
      `http://localhost:3002/api/hotels/${hotelId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(hotelData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update hotel");
    }

    return response.json();
  }

  async deleteHotel(hotelId, token) {
    const response = await fetch(
      `http://localhost:3002/api/hotels/${hotelId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete hotel");
    }

    return response.json();
  }

  async createRoom(roomData, token) {
    const response = await fetch(`http://localhost:3003/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(roomData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create room");
    }

    return response.json();
  }

  async updateRoom(roomId, roomData, token) {
    const response = await fetch(`http://localhost:3003/api/rooms/${roomId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(roomData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update room");
    }

    return response.json();
  }

  async deleteRoom(roomId, token) {
    const response = await fetch(`http://localhost:3003/api/rooms/${roomId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete room");
    }

    return response.json();
  }

  async getRoomsByHotel(hotelId, token) {
    const response = await fetch(
      `http://localhost:3003/api/rooms/hotel/${hotelId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch rooms");
    }

    return response.json();
  }

  async getRoomById(roomId, token) {
    const response = await fetch(`http://localhost:3003/api/rooms/${roomId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch room");
    }

    return response.json();
  }
}

export const adminService = new AdminService();
