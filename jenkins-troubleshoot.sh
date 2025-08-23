#!/bin/bash

# Jenkins Pipeline Troubleshooting Script
echo "🔧 Jenkins Pipeline Troubleshooting Helper"
echo "==========================================="

# Function to check Docker status
check_docker() {
    echo "📦 Checking Docker status..."
    if ! docker --version; then
        echo "❌ Docker is not installed or not running"
        return 1
    fi
    
    if ! docker compose version; then
        echo "❌ Docker Compose is not available"
        return 1
    fi
    
    echo "✅ Docker and Docker Compose are ready"
    return 0
}

# Function to test network connectivity
test_connectivity() {
    echo "🌐 Testing network connectivity..."
    
    echo "Testing NPM registry..."
    if curl -I --connect-timeout 10 --max-time 20 https://registry.npmjs.org/; then
        echo "✅ NPM registry accessible"
    else
        echo "❌ NPM registry not accessible"
    fi
    
    echo "Testing Docker registry..."
    if curl -I --connect-timeout 10 --max-time 20 https://registry-1.docker.io/; then
        echo "✅ Docker registry accessible"
    else
        echo "❌ Docker registry not accessible"
    fi
}

# Function to clean Docker resources
clean_docker() {
    echo "🧹 Cleaning Docker resources..."
    
    echo "Stopping containers..."
    docker compose down 2>/dev/null || true
    
    echo "Removing unused containers..."
    docker container prune -f
    
    echo "Removing unused images..."
    docker image prune -f
    
    echo "Removing unused volumes..."
    docker volume prune -f
    
    echo "✅ Docker cleanup completed"
}

# Function to build services individually for testing
build_services() {
    echo "🔨 Building services individually..."
    
    cd docker-compose || exit 1
    
    services=("user-service" "hotel-service" "room-service" "payment-service" "notification-service" "booking-service")
    
    for service in "${services[@]}"; do
        echo "Building $service..."
        if docker compose build --no-cache "$service"; then
            echo "✅ $service built successfully"
        else
            echo "❌ $service build failed"
            echo "Trying with cache..."
            if docker compose build "$service"; then
                echo "✅ $service built with cache"
            else
                echo "❌ $service build completely failed"
            fi
        fi
        echo "---"
    done
    
    echo "Building frontend..."
    if docker compose build --no-cache frontend; then
        echo "✅ Frontend built successfully"
    else
        echo "❌ Frontend build failed, trying alternatives..."
        
        echo "Trying with cache..."
        if docker compose build frontend; then
            echo "✅ Frontend built with cache"
        else
            echo "Cleaning and retrying..."
            docker system prune -f --volumes
            if docker compose build frontend; then
                echo "✅ Frontend built after cleanup"
            else
                echo "❌ Frontend build completely failed"
            fi
        fi
    fi
}

# Function to check running services
check_services() {
    echo "📊 Checking running services..."
    
    cd docker-compose || exit 1
    
    echo "Docker Compose status:"
    docker compose ps
    
    echo ""
    echo "All running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "Testing service endpoints:"
    curl -f http://localhost:3000/ && echo "✅ Frontend accessible" || echo "❌ Frontend not accessible"
    curl -f http://localhost:3001/health && echo "✅ User service accessible" || echo "❌ User service not accessible"
    curl -f http://localhost:3002/health && echo "✅ Hotel service accessible" || echo "❌ Hotel service not accessible"
}

# Main menu
case "${1:-menu}" in
    "docker")
        check_docker
        ;;
    "network")
        test_connectivity
        ;;
    "clean")
        clean_docker
        ;;
    "build")
        build_services
        ;;
    "check")
        check_services
        ;;
    "all")
        check_docker
        test_connectivity
        clean_docker
        build_services
        ;;
    *)
        echo "Usage: $0 {docker|network|clean|build|check|all}"
        echo ""
        echo "Commands:"
        echo "  docker   - Check Docker installation and status"
        echo "  network  - Test network connectivity to registries"
        echo "  clean    - Clean Docker resources"
        echo "  build    - Build all services individually"
        echo "  check    - Check running services status"
        echo "  all      - Run all checks and operations"
        ;;
esac
