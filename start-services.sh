#!/bin/bash

# Start all microservices for the hotel booking system

echo "Starting Hotel Booking System Services..."
echo "========================================"

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    echo "Starting $service_name on port $port..."
    cd "$service_path"
    
    # Set environment variables
    export NODE_ENV=development
    export PORT=$port
    export MONGODB_URI="mongodb://localhost:$((27016 + port - 3000))/$(echo $service_name | tr '[:upper:]' '[:lower:]' | sed 's/-//g')db"
    export RABBITMQ_URL="amqp://localhost:5672"
    export JWT_SECRET="your-jwt-secret-key-for-development"
    
    # Start the service in background
    node index.js > "../logs/${service_name}.log" 2>&1 &
    local pid=$!
    echo "$service_name started with PID $pid"
    echo $pid > "../logs/${service_name}.pid"
    
    cd - > /dev/null
}

# Create logs directory
mkdir -p logs

# Start services
start_service "user-service" "services/user-service" 3001
sleep 2
start_service "hotel-service" "services/hotel-service" 3002
sleep 2
start_service "room-service" "services/room-service" 3003
sleep 2
start_service "payment-service" "services/payment-service" 3005
sleep 2
start_service "notification-service" "services/notification-service" 3006
sleep 2
start_service "booking-service" "services/booking-service" 3004

echo ""
echo "All services started!"
echo ""
echo "Service URLs:"
echo "- User Service: http://localhost:3001"
echo "- Hotel Service: http://localhost:3002"
echo "- Room Service: http://localhost:3003"
echo "- Booking Service: http://localhost:3004"
echo "- Payment Service: http://localhost:3005"
echo "- Notification Service: http://localhost:3006"
echo ""
echo "Frontend: http://localhost:3000"
echo ""
echo "To stop services, run: ./stop-services.sh"
echo "To view logs: tail -f logs/[service-name].log"
echo ""
echo "Wait a few seconds for services to initialize, then run:"
echo "node test-data.js"

