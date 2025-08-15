#!/bin/bash

echo "🚀 Hotel Booking System - Complete Reinitialization"
echo "===================================================="

echo ""
echo "Step 1: Stopping all services..."
bash stop-services.sh

echo ""
echo "Step 2: Cleaning up databases..."
node cleanup-databases.js

echo ""
echo "Step 3: Starting all services..."
bash start-all-services.sh

echo ""
echo "Step 4: Waiting for services to initialize..."
sleep 10

echo ""
echo "Step 5: Creating test data..."
node test-data.js

echo ""
echo "Step 6: Creating admin user..."
node create-admin.js

echo ""
echo "🎉 Reinitialization complete!"
echo ""
echo "✅ You can now:"
echo "   - Login as admin: admin@hotelBooking.com / admin123"
echo "   - Login as test user: john@example.com / password123"
echo "   - Login as test user: jane@example.com / password123"
echo "   - Browse hotels and make bookings"
echo ""
echo "🌐 Services running on:"
echo "   - User Service: http://localhost:3001"
echo "   - Hotel Service: http://localhost:3002" 
echo "   - Room Service: http://localhost:3003"
echo "   - Booking Service: http://localhost:3004"
echo "   - Payment Service: http://localhost:3005"
echo "   - Notification Service: http://localhost:3006"
