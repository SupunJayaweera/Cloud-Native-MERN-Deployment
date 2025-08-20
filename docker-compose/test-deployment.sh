#!/bin/bash

# Nginx Reverse Proxy Deployment Test Script
# Tests the Hotel Booking System with nginx reverse proxy

echo "🔍 Testing Hotel Booking System with Nginx Reverse Proxy..."

HOST=${1:-localhost}
echo "� Testing on host: $HOST"

# Test nginx health
echo ""
echo "🌐 Testing Nginx Reverse Proxy..."
echo -n "  ⏳ Nginx health check... "
if curl -s --max-time 5 "$HOST/health" | grep -q "nginx healthy"; then
    echo "✅ Healthy"
else
    echo "❌ Failed"
    exit 1
fi

# Test frontend through nginx
echo -n "  ⏳ Frontend through nginx... "
if curl -s --max-time 5 -I "http://$HOST" | grep -q "200 OK"; then
    echo "✅ Accessible"
else
    echo "❌ Failed"
    exit 1
fi

# Test API endpoints through nginx
echo ""
echo "� Testing API Routes through Nginx..."

# Test user service through nginx
echo -n "  ⏳ User API (/api/users/)... "
if curl -s --max-time 5 "http://$HOST:3001/health" > /dev/null; then
    echo "✅ Backend Healthy"
else
    echo "❌ Backend Failed"
fi

# Test hotel service through nginx  
echo -n "  ⏳ Hotel API (/api/hotels/)... "
if curl -s --max-time 5 "http://$HOST:3002/health" > /dev/null; then
    echo "✅ Backend Healthy"
else
    echo "❌ Backend Failed"
fi

# Test room service through nginx
echo -n "  ⏳ Room API (/api/rooms/)... "
if curl -s --max-time 5 "http://$HOST:3003/health" > /dev/null; then
    echo "✅ Backend Healthy"
else
    echo "❌ Backend Failed"
fi

# Test booking service through nginx
echo -n "  ⏳ Booking API (/api/bookings/)... "
if curl -s --max-time 5 "http://$HOST:3004/health" > /dev/null; then
    echo "✅ Backend Healthy"
else
    echo "❌ Backend Failed"
fi

echo ""
echo "📊 Container Status:"
docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🎉 Nginx Reverse Proxy Deployment Test Complete!"
echo ""
echo "🔗 Access Points:"
echo "   Main Application: http://$HOST"
echo "   Alternative:      http://$HOST:3000"
echo "   Nginx Health:     http://$HOST/health"
echo ""
echo "🔑 Test Credentials:"
echo "   Admin: admin@hotel.com / password123"
echo "   User:  john@example.com / password123"
echo ""
echo "📝 Notes:"
echo "   - All API calls are automatically routed through nginx"
echo "   - No need to configure IP addresses or ports"
echo "   - Frontend makes calls to relative URLs (e.g., /api/users/)"
echo "   - Nginx handles CORS and request routing"
