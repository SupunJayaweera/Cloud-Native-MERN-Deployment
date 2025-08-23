#!/bin/bash

# Local Build Test Script
echo "🧪 Testing Local Build Process"
echo "=============================="

cd docker-compose || exit 1

# Set Docker environment
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

echo "1. Testing connectivity..."
curl -I --connect-timeout 10 --max-time 20 https://registry.npmjs.org/ || echo "NPM registry issue"
curl -I --connect-timeout 10 --max-time 20 https://registry-1.docker.io/ || echo "Docker registry issue"

echo ""
echo "2. Building backend services..."

services=("user-service" "hotel-service" "room-service" "payment-service" "notification-service" "booking-service")

for service in "${services[@]}"; do
    echo "Building $service..."
    start_time=$(date +%s)
    
    if timeout 300 docker compose build --no-cache "$service"; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        echo "✅ $service built in ${duration}s"
    else
        echo "❌ $service build failed or timed out"
        echo "Trying with cache..."
        if timeout 300 docker compose build "$service"; then
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            echo "✅ $service built with cache in ${duration}s"
        else
            echo "❌ $service build completely failed"
            exit 1
        fi
    fi
    echo ""
done

echo "3. Building frontend..."
start_time=$(date +%s)

if timeout 600 docker compose build --no-cache frontend; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo "✅ Frontend built in ${duration}s"
else
    echo "❌ Frontend build failed or timed out"
    echo "Trying with cache..."
    if timeout 600 docker compose build frontend; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        echo "✅ Frontend built with cache in ${duration}s"
    else
        echo "❌ Frontend build failed, cleaning and retrying..."
        docker system prune -f --volumes
        if timeout 600 docker compose build frontend; then
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            echo "✅ Frontend built after cleanup in ${duration}s"
        else
            echo "❌ Frontend build completely failed"
            exit 1
        fi
    fi
fi

echo ""
echo "🎉 All builds completed successfully!"
echo "You can now run: docker compose up -d"
