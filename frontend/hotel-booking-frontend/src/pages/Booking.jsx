import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roomService } from '../services/roomService';
import { bookingService } from '../services/bookingService';
import { CalendarIcon, UserGroupIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const Booking = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingData, setBookingData] = useState({
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    specialRequests: ''
  });
  const [guestDetails, setGuestDetails] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [numberOfNights, setNumberOfNights] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchRoomDetails();
  }, [roomId, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setGuestDetails({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  useEffect(() => {
    calculateTotal();
  }, [bookingData.checkInDate, bookingData.checkOutDate, room]);

  const fetchRoomDetails = async () => {
    try {
      const response = await roomService.getRoomById(roomId);
      setRoom(response.room);
    } catch (error) {
      setError('Failed to fetch room details. Please try again.');
      console.error('Room details fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (bookingData.checkInDate && bookingData.checkOutDate && room) {
      const checkIn = new Date(bookingData.checkInDate);
      const checkOut = new Date(bookingData.checkOutDate);
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (nights > 0) {
        setNumberOfNights(nights);
        setTotalAmount(nights * room.pricePerNight);
      } else {
        setNumberOfNights(0);
        setTotalAmount(0);
      }
    }
  };

  const handleBookingDataChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value
    });
  };

  const handleGuestDetailsChange = (e) => {
    setGuestDetails({
      ...guestDetails,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!bookingData.checkInDate || !bookingData.checkOutDate) {
      setError('Please select check-in and check-out dates.');
      return false;
    }

    const checkIn = new Date(bookingData.checkInDate);
    const checkOut = new Date(bookingData.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      setError('Check-in date cannot be in the past.');
      return false;
    }

    if (checkOut <= checkIn) {
      setError('Check-out date must be after check-in date.');
      return false;
    }

    if (!guestDetails.firstName || !guestDetails.lastName || !guestDetails.email) {
      setError('Please fill in all required guest details.');
      return false;
    }

    if (bookingData.numberOfGuests > room.capacity) {
      setError(`This room can accommodate maximum ${room.capacity} guests.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setBookingLoading(true);

    try {
      const bookingPayload = {
        userId: user._id,
        hotelId: room.hotelId,
        roomId: room._id,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        numberOfGuests: parseInt(bookingData.numberOfGuests),
        totalAmount,
        guestDetails,
        specialRequests: bookingData.specialRequests
      };

      const response = await bookingService.createBooking(bookingPayload, token);
      
      // Redirect to bookings page with success message
      navigate('/bookings', { 
        state: { 
          message: 'Booking initiated successfully! You will receive a confirmation email shortly.',
          bookingId: response.booking._id 
        }
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatRoomType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Room Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/hotels')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Hotels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Your Booking</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Booking Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Date
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="checkInDate"
                        value={bookingData.checkInDate}
                        onChange={handleBookingDataChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Date
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="checkOutDate"
                        value={bookingData.checkOutDate}
                        onChange={handleBookingDataChange}
                        min={bookingData.checkInDate || new Date().toISOString().split('T')[0]}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Guests
                    </label>
                    <div className="relative">
                      <UserGroupIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <select
                        name="numberOfGuests"
                        value={bookingData.numberOfGuests}
                        onChange={handleBookingDataChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {[...Array(room?.capacity || 1)].map((_, index) => (
                          <option key={index + 1} value={index + 1}>
                            {index + 1} Guest{index > 0 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    name="specialRequests"
                    value={bookingData.specialRequests}
                    onChange={handleBookingDataChange}
                    rows={3}
                    placeholder="Any special requests or preferences..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Guest Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Guest Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={guestDetails.firstName}
                      onChange={handleGuestDetailsChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={guestDetails.lastName}
                      onChange={handleGuestDetailsChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={guestDetails.email}
                      onChange={handleGuestDetailsChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={guestDetails.phone}
                      onChange={handleGuestDetailsChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={bookingLoading || totalAmount === 0}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {bookingLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="h-5 w-5 mr-2" />
                    Complete Booking
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
              
              {room && (
                <>
                  <div className="space-y-3 mb-6">
                    <div>
                      <h3 className="font-medium text-gray-900">{formatRoomType(room.type)}</h3>
                      <p className="text-sm text-gray-600">Room #{room.roomNumber}</p>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Capacity: {room.capacity} guest{room.capacity > 1 ? 's' : ''}</p>
                      <p>Price per night: ${room.pricePerNight}</p>
                    </div>
                  </div>

                  {numberOfNights > 0 && (
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Number of nights:</span>
                        <span>{numberOfNights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Price per night:</span>
                        <span>${room.pricePerNight}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Number of guests:</span>
                        <span>{bookingData.numberOfGuests}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total Amount:</span>
                        <span>${totalAmount}</span>
                      </div>
                    </div>
                  )}

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-2">Room Amenities</h4>
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.map((amenity, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;

