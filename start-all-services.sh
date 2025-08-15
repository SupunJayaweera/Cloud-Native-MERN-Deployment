#!/bin/bash

echo "Starting all microservices with environment configuration..."

# Load main environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Kill existing node processes
pkill -f "node index.js" 2>/dev/null || true

# Create logs directory
mkdir -p logs

echo "Starting User Service..."
cd services/user-service
node server.js > ../../logs/user-service.log 2>&1 &
echo $! > ../../logs/user-service.pid
cd ../..

echo "Starting Hotel Service..."
cd services/hotel-service
node server.js > ../../logs/hotel-service.log 2>&1 &
echo $! > ../../logs/hotel-service.pid
cd ../..

echo "Starting Payment Service..."
cd services/payment-service
node server.js > ../../logs/payment-service.log 2>&1 &
echo $! > ../../logs/payment-service.pid
cd ../..

# Wait a moment for core services to start
sleep 3

echo "Starting Room Service..."
cd services/room-service
node server.js > ../../logs/room-service.log 2>&1 &
echo $! > ../../logs/room-service.pid
cd ../..

echo "Starting Booking Service..."
cd services/booking-service
node server.js > ../../logs/booking-service.log 2>&1 &
echo $! > ../../logs/booking-service.pid
cd ../..

echo "Starting Notification Service..."
cd services/notification-service
node server.js > ../../logs/notification-service.log 2>&1 &
echo $! > ../../logs/notification-service.pid
cd ../..

sleep 5

echo "All services started! Check logs in ./logs/ directory"
echo "Services running on:"
echo "  User Service: http://localhost:3001"
echo "  Hotel Service: http://localhost:3002"
echo "  Room Service: http://localhost:3003"
echo "  Booking Service: http://localhost:3004"
echo "  Payment Service: http://localhost:3005"
echo "  Notification Service: http://localhost:3006"
