#!/bin/bash

# Environment Configuration Validator
# ===================================

echo "🔍 Validating Environment Configuration..."
echo "========================================="

# Function to check if environment file exists and has required variables
check_env_file() {
    local env_file=$1
    local service_name=$2
    local required_vars=("${@:3}")
    
    echo ""
    echo "📁 Checking $service_name environment..."
    
    if [ ! -f "$env_file" ]; then
        echo "❌ Missing: $env_file"
        return 1
    fi
    
    echo "✅ Found: $env_file"
    
    # Check required variables
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo "✅ All required variables present"
    else
        echo "⚠️  Missing variables: ${missing_vars[*]}"
    fi
}

# Main application
check_env_file ".env" "Main Application" \
    "NODE_ENV" "USER_SERVICE_URL" "HOTEL_SERVICE_URL" "ROOM_SERVICE_URL" \
    "BOOKING_SERVICE_URL" "PAYMENT_SERVICE_URL" "NOTIFICATION_SERVICE_URL" \
    "RABBITMQ_URL" "JWT_SECRET"

# User Service
check_env_file "services/user-service/.env" "User Service" \
    "NODE_ENV" "PORT" "MONGODB_URI" "RABBITMQ_URL" "JWT_SECRET"

# Hotel Service
check_env_file "services/hotel-service/.env" "Hotel Service" \
    "NODE_ENV" "PORT" "MONGODB_URI" "RABBITMQ_URL" "JWT_SECRET"

# Room Service
check_env_file "services/room-service/.env" "Room Service" \
    "NODE_ENV" "PORT" "MONGODB_URI" "RABBITMQ_URL" "JWT_SECRET"

# Booking Service
check_env_file "services/booking-service/.env" "Booking Service" \
    "NODE_ENV" "PORT" "MONGODB_URI" "RABBITMQ_URL" "JWT_SECRET"

# Payment Service
check_env_file "services/payment-service/.env" "Payment Service" \
    "NODE_ENV" "PORT" "MONGODB_URI" "RABBITMQ_URL" "JWT_SECRET"

# Notification Service
check_env_file "services/notification-service/.env" "Notification Service" \
    "NODE_ENV" "PORT" "MONGODB_URI" "RABBITMQ_URL" "JWT_SECRET"

# Frontend
check_env_file "frontend/hotel-booking-frontend/.env" "Frontend" \
    "VITE_USER_SERVICE_URL" "VITE_HOTEL_SERVICE_URL" "VITE_ROOM_SERVICE_URL" \
    "VITE_BOOKING_SERVICE_URL" "VITE_PAYMENT_SERVICE_URL"

echo ""
echo "🔐 Security Recommendations:"
echo "=============================="
echo "⚠️  Change JWT_SECRET in production"
echo "⚠️  Use strong passwords for RabbitMQ and MongoDB"
echo "⚠️  Enable SSL/TLS in production"
echo "⚠️  Use environment-specific configurations"
echo "⚠️  Never commit .env files with real secrets"

echo ""
echo "✅ Environment validation completed!"
