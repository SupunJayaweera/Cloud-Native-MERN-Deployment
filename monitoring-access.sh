#!/bin/bash

# Hotel Booking System - Monitoring Access Script
# Usage: ./monitoring-access.sh [VM_IP]

VM_IP=${1:-"192.168.46.139"}  # Default IP, can be overridden

echo "🏨 Hotel Booking System - Monitoring Dashboard"
echo "=============================================="
echo ""
echo "🚀 Application:"
echo "   Main App:      http://$VM_IP:3000"
echo ""
echo "📊 Monitoring:"
echo "   Grafana:       http://$VM_IP:3007 (admin/admin)"
echo "   Prometheus:    http://$VM_IP:9090"
echo "   cAdvisor:      http://$VM_IP:8081"
echo ""
echo "📈 Pre-built Dashboards:"
echo "   App Services:  http://$VM_IP:3007/d/hotel-app-services"
echo "   Databases:     http://$VM_IP:3007/d/hotel-databases"
echo "   Infrastructure: http://$VM_IP:3007/d/hotel-infrastructure"
echo "   Containers:    http://$VM_IP:3007/d/containers-dashboard"
echo ""
echo "🔧 Quick Health Check:"

# Function to check service health
check_service() {
    local url=$1
    local name=$2
    
    if curl -s --connect-timeout 3 $url > /dev/null 2>&1; then
        echo "   ✅ $name - UP"
    else
        echo "   ❌ $name - DOWN"
    fi
}

check_service "http://$VM_IP:3000" "Main Application"
check_service "http://$VM_IP:9090/-/healthy" "Prometheus"
check_service "http://$VM_IP:3007/api/health" "Grafana"
check_service "http://$VM_IP:8081/healthz" "cAdvisor"

echo ""
echo "📝 To open dashboards quickly:"
echo "   - Copy and paste URLs above"
echo "   - Or run: ./monitoring-access.sh YOUR_VM_IP"
echo ""
