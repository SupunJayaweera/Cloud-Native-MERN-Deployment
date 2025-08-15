import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Hotels from "./pages/Hotels";
import HotelDetails from "./pages/HotelDetails";
import Booking from "./pages/Booking";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminHotels from "./pages/AdminHotels";
import AdminRooms from "./pages/AdminRooms";
import HotelForm from "./pages/HotelForm";
import RoomForm from "./pages/RoomForm";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
          <Navbar />
          <main className="w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/hotels" element={<Hotels />} />
              <Route path="/hotels/:hotelId" element={<HotelDetails />} />
              <Route path="/booking/:roomId" element={<Booking />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bookings" element={<Bookings />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/hotels"
                element={
                  <AdminRoute>
                    <AdminHotels />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/hotels/new"
                element={
                  <AdminRoute>
                    <HotelForm />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/hotels/edit/:hotelId"
                element={
                  <AdminRoute>
                    <HotelForm />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/rooms"
                element={
                  <AdminRoute>
                    <AdminRooms />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/rooms/new"
                element={
                  <AdminRoute>
                    <RoomForm />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/rooms/edit/:roomId"
                element={
                  <AdminRoute>
                    <RoomForm />
                  </AdminRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
