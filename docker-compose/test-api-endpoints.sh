#!/bin/bash

echo "🧪 Testing Hotel Booking System APIs"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "%{http_code}" "$url")
    status_code=${response: -3}
    
    if [[ $status_code == $expected_status ]]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $status_code)"
        return 1
    fi
}

# Test infrastructure
echo -e "${YELLOW}🔍 Testing Infrastructure Services${NC}"
test_endpoint "RabbitMQ Management" "http://localhost:15672" "200"

# Test microservices health endpoints
echo -e "\n${YELLOW}🔍 Testing Microservices Health${NC}"
test_endpoint "User Service Health" "http://localhost:3001/health" "200"
test_endpoint "Hotel Service Health" "http://localhost:3002/health" "200"
test_endpoint "Room Service Health" "http://localhost:3003/health" "200"
test_endpoint "Booking Service Health" "http://localhost:3004/health" "200"
test_endpoint "Payment Service Health" "http://localhost:3005/health" "200"
test_endpoint "Notification Service Health" "http://localhost:3006/health" "200"

# Test API endpoints
echo -e "\n${YELLOW}🔍 Testing API Endpoints${NC}"
test_endpoint "Hotel List API" "http://localhost:3002/api/hotels" "200"
test_endpoint "Room List API" "http://localhost:3003/api/rooms" "200"

# Test database connectivity by checking data
echo -e "\n${YELLOW}🔍 Testing Data Population${NC}"
hotel_count=$(curl -s "http://localhost:3002/api/hotels" | grep -o '"_id"' | wc -l)
if [[ $hotel_count -gt 0 ]]; then
    echo -e "Hotel data: ${GREEN}✅ PASS${NC} ($hotel_count hotels found)"
else
    echo -e "Hotel data: ${RED}❌ FAIL${NC} (No hotels found)"
fi

room_count=$(curl -s "http://localhost:3003/api/rooms" | grep -o '"_id"' | wc -l)
if [[ $room_count -gt 0 ]]; then
    echo -e "Room data: ${GREEN}✅ PASS${NC} ($room_count rooms found)"
else
    echo -e "Room data: ${RED}❌ FAIL${NC} (No rooms found)"
fi

echo ""
echo "🎯 Summary:"
echo "- All databases are running on separate MongoDB instances"
echo "- RabbitMQ is available at: http://localhost:15672"
echo "- Hotel API: http://localhost:3002/api/hotels"
echo "- Room API: http://localhost:3003/api/rooms"
echo ""
echo "🔑 Test Credentials:"
echo "- Admin: admin@hotel.com / password123"
echo "- User: john@example.com / password123"
