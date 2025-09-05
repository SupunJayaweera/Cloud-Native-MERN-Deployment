import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { hotelService } from "../services/hotelService";
import { roomService } from "../services/roomService";
import {
  MapPinIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const HotelDetails = () => {
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    fetchHotelDetails();
    fetchRooms();
  }, [hotelId]);

  const fetchHotelDetails = async () => {
    try {
      const response = await hotelService.getHotelById(hotelId);
      setHotel(response.hotel);
    } catch (error) {
      setError("Failed to fetch hotel details. Please try again.");
      console.error("Hotel details fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const response = await roomService.getRoomsByHotel(hotelId, {
        available: true,
      });
      setRooms(response.rooms);
    } catch (error) {
      console.error("Rooms fetch error:", error);
    } finally {
      setRoomsLoading(false);
    }
  };

  const formatRoomType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Hotel Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "The hotel you are looking for does not exist."}
          </p>
          <Link
            to="/hotels"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hotel Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          {/* Hotel Images */}
          <div className="h-64 md:h-96 bg-gray-200 relative">
            {hotel.images && hotel.images.length > 0 ? (
              <img
                src={hotel.images[0]}
                alt={hotel.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-xl">No Image Available</span>
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-md shadow">
              <div className="flex items-center">
                <StarIcon className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-lg font-medium">
                  {hotel.rating && hotel.rating > 0
                    ? hotel.rating.toFixed(1)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Hotel Info */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {hotel.name || "Hotel Name"}
                </h1>
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  <span>{hotel.address || "Address not available"}</span>
                </div>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              {hotel.description || "No description available"}
            </p>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">{hotel.phone || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">{hotel.email || "N/A"}</span>
              </div>
            </div>

            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Available Rooms */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Available Rooms
          </h2>

          {roomsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Room Image */}
                  <div className="h-32 bg-gray-200 rounded-lg mb-4 relative">
                    {room.images && room.images.length > 0 ? (
                      <img
                        src={room.images[0]}
                        alt={`Room ${room.roomNumber || "Unknown"}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 rounded-lg">
                        Room {room.roomNumber}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatRoomType(room.type || "standard")}
                      </h3>
                      <span className="text-sm text-gray-600">
                        #{room.roomNumber || "N/A"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Capacity: {room.capacity || 1} guest
                      {(room.capacity || 1) > 1 ? "s" : ""}
                    </p>

                    {room.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {room.description}
                      </p>
                    )}

                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.slice(0, 2).map((amenity, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                          >
                            {amenity}
                          </span>
                        ))}
                        {room.amenities.length > 2 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            +{room.amenities.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          ${room.pricePerNight || 0}
                        </span>
                        <span className="text-sm text-gray-600">/night</span>
                      </div>
                      <Link
                        to={`/booking/${room._id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No rooms available at this time.</p>
            </div>
          )}
        </div>

        {/* Back to Hotels */}
        <div className="mt-8 text-center">
          <Link
            to="/hotels"
            className="inline-block bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Hotels
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;
