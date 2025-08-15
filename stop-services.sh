#!/bin/bash

# Stop all microservices for the hotel booking system

echo "Stopping Hotel Booking System Services..."
echo "========================================="

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping $service_name (PID: $pid)..."
            kill $pid
            rm "$pid_file"
        else
            echo "$service_name was not running"
            rm "$pid_file" 2>/dev/null
        fi
    else
        echo "No PID file found for $service_name"
    fi
}

# Stop all services
stop_service "user-service"
stop_service "hotel-service"
stop_service "room-service"
stop_service "booking-service"
stop_service "payment-service"
stop_service "notification-service"

echo ""
echo "All services stopped!"

# Clean up any remaining Node.js processes on our ports
echo "Cleaning up any remaining processes..."
for port in 3001 3002 3003 3004 3005 3006; do
    pid=$(netstat -ano | findstr :$port | awk '{print $5}' | head -1)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        taskkill //PID $pid //F 2>/dev/null
    fi
done

# Also kill any remaining node processes that might be running our services
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true

# Remove any remaining .pid files
rm -f logs/*.pid
echo "Cleanup complete!"

