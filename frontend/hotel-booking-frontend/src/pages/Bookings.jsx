import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingService } from '../services/bookingService';
import { CalendarIcon, MapPinIcon, UserGroupIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Bookings = () => {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check for success message from booking creation
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent showing the message on refresh
      window.history.replaceState({}, document.title);
    }

    fetchBookings();
  }, [isAuthenticated, user]);

  const fetchBookings = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const response = await bookingService.getUserBookings(user._id, {}, token);
      setBookings(response.bookings);
    } catch (error) {
      setError('Failed to fetch bookings. Please try again.');
      console.error('Bookings fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancellingBooking(bookingId);
    try {
      await bookingService.cancelBooking(bookingId, token);
      setSuccessMessage('Booking cancelled successfully. Refund will be processed within 3-5 business days.');
      fetchBookings(); // Refresh the bookings list
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBooking(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const isUpcoming = (checkInDate) => {
    return new Date(checkInDate) > new Date();
  };

  const canCancel = (booking) => {
    return booking.status === 'confirmed' && isUpcoming(booking.checkInDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your hotel reservations</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-6">
            {successMessage}
            <button
              onClick={() => setSuccessMessage('')}
              className="float-right text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
            {error}
            <button
              onClick={() => setError('')}
              className="float-right text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Booking #{booking._id.slice(-8)}
                      </h3>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${booking.totalAmount}</p>
                      <p className="text-sm text-gray-600">Total Amount</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Check-in</p>
                        <p className="text-sm text-gray-600">{formatDate(booking.checkInDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Check-out</p>
                        <p className="text-sm text-gray-600">{formatDate(booking.checkOutDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Guests</p>
                        <p className="text-sm text-gray-600">{booking.numberOfGuests}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Payment</p>
                        <p className="text-sm text-gray-600">
                          {booking.paymentId ? 'Paid' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Guest Details</h4>
                        <p className="text-sm text-gray-600">
                          {booking.guestDetails.firstName} {booking.guestDetails.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{booking.guestDetails.email}</p>
                        {booking.guestDetails.phone && (
                          <p className="text-sm text-gray-600">{booking.guestDetails.phone}</p>
                        )}
                      </div>

                      {booking.specialRequests && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Special Requests</h4>
                          <p className="text-sm text-gray-600">{booking.specialRequests}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Booked on {formatDate(booking.createdAt)}
                      </div>
                      
                      <div className="flex space-x-2">
                        {canCancel(booking) && (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            disabled={cancellingBooking === booking._id}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancellingBooking === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => navigate(`/bookings/${booking._id}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">You haven't made any bookings yet.</p>
            <button
              onClick={() => navigate('/hotels')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Hotels
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;

