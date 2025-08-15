#!/bin/bash

echo "🚀 Testing Docker Compose Deployment for Hotel Booking System"
echo "============================================================"

# Function to check if a service is healthy
check_service_health() {
    local service_name=$1
    local port=$2
    echo "Checking $service_name health..."
    
    for i in {1..10}; do
        if curl -f http://localhost:$port/health >/dev/null 2>&1; then
            echo "✅ $service_name is healthy!"
            return 0
        fi
        echo "⏳ Waiting for $service_name... ($i/10)"
        sleep 10
    done
    
    echo "❌ $service_name failed to become healthy"
    return 1
}

# Function to check if a port is listening
check_port() {
    local port=$1
    local service=$2
    if netstat -an | grep ":$port " >/dev/null 2>&1; then
        echo "✅ $service is listening on port $port"
        return 0
    else
        echo "❌ $service is not listening on port $port"
        return 1
    fi
}

# Start Docker Compose
echo "📦 Starting Docker Compose services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Check Docker containers
echo "🔍 Checking container status..."
docker-compose ps

# Check MongoDB instances
echo "📊 Checking MongoDB instances..."
check_port 27017 "user-db"
check_port 27018 "hotel-db" 
check_port 27019 "room-db"
check_port 27020 "booking-db"
check_port 27021 "payment-db"
check_port 27022 "notification-db"

# Check RabbitMQ
echo "🐰 Checking RabbitMQ..."
check_port 5672 "RabbitMQ"
check_port 15672 "RabbitMQ Management"

# Check Microservices Health
echo "🔍 Checking microservices health..."
check_service_health "user-service" 3001
check_service_health "hotel-service" 3002
check_service_health "room-service" 3003
check_service_health "booking-service" 3004
check_service_health "payment-service" 3005
check_service_health "notification-service" 3006

# Check Frontend
echo "🌐 Checking frontend..."
check_port 3000 "Frontend"

# Test API endpoints
echo "🧪 Testing API endpoints..."

# Test user service
echo "Testing user registration..."
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}' \
  && echo "✅ User registration working" || echo "❌ User registration failed"

# Test hotel service
echo "Testing hotel listing..."
curl -f http://localhost:3002/api/hotels \
  && echo "✅ Hotel listing working" || echo "❌ Hotel listing failed"

# Show logs for debugging
echo "📝 Recent logs from services:"
echo "--- User Service ---"
docker-compose logs --tail=10 user-service

echo "--- Hotel Service ---"
docker-compose logs --tail=10 hotel-service

echo "--- RabbitMQ ---"
docker-compose logs --tail=10 rabbitmq

echo "🏁 Docker deployment test completed!"
echo "Access the application at: http://localhost:3000"
echo "RabbitMQ Management UI at: http://localhost:15672 (admin/password123)"
