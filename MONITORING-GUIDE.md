# 📊 **Hotel Booking System - Comprehensive Monitoring Guide**

## 🚀 **Quick Access Dashboard**

| **Service**           | **URL**                | **Credentials** | **Purpose**                  |
| --------------------- | ---------------------- | --------------- | ---------------------------- |
| **Main Application**  | http://YOUR_VM_IP:3000 | N/A             | Hotel booking frontend       |
| **Prometheus**        | http://YOUR_VM_IP:9090 | N/A             | Metrics collection & queries |
| **Grafana Dashboard** | http://YOUR_VM_IP:3007 | admin/admin     | Visualization & monitoring   |
| **cAdvisor**          | http://YOUR_VM_IP:8081 | N/A             | Container resource usage     |

## 📈 **Available Dashboards**

### **1. Application Services Dashboard**

**URL**: `http://YOUR_VM_IP:3007/d/hotel-app-services`

**Monitors**:

- ✅ CPU usage per microservice
- ✅ Memory consumption per service
- ✅ Service health status (UP/DOWN)
- ✅ Real-time performance metrics

**Services Tracked**:

- user-service
- hotel-service
- room-service
- booking-service
- payment-service
- notification-service

### **2. Database Monitoring Dashboard**

**URL**: `http://YOUR_VM_IP:3007/d/hotel-databases`

**Monitors**:

- ✅ MongoDB CPU usage (all 6 databases)
- ✅ Memory usage per database
- ✅ Network I/O per database
- ✅ Database connectivity status

**Databases Tracked**:

- user-db
- hotel-db
- room-db
- booking-db
- payment-db
- notification-db

### **3. Infrastructure Overview Dashboard**

**URL**: `http://YOUR_VM_IP:3007/d/hotel-infrastructure`

**Monitors**:

- ✅ System CPU usage
- ✅ System memory usage
- ✅ Network I/O
- ✅ Disk I/O
- ✅ Total services up/down count
- ✅ Total containers running

### **4. Container Monitoring Dashboard**

**URL**: `http://YOUR_VM_IP:3007/d/containers-dashboard`

**Monitors**:

- ✅ Individual container resources
- ✅ Container restart counts
- ✅ Container uptime
- ✅ Resource limits vs usage

## 🔍 **Key Metrics to Monitor**

### **Application Health Indicators**

```promql
# Service availability
up{job=~".*-service"}

# CPU usage per service
rate(container_cpu_usage_seconds_total{name=~".*-service"}[5m]) * 100

# Memory usage per service
container_memory_usage_bytes{name=~".*-service"}

# Request rate (if available)
rate(http_requests_total[5m])
```

### **Database Performance**

```promql
# Database CPU
rate(container_cpu_usage_seconds_total{name=~".*-db"}[5m]) * 100

# Database memory
container_memory_usage_bytes{name=~".*-db"}

# Database network I/O
rate(container_network_receive_bytes_total{name=~".*-db"}[5m])
rate(container_network_transmit_bytes_total{name=~".*-db"}[5m])
```

### **System Resources**

```promql
# System CPU usage
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# System memory usage
((node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes) * 100

# Disk usage
100 - ((node_filesystem_avail_bytes * 100) / node_filesystem_size_bytes)
```

## 🚨 **Setting Up Alerts**

### **Critical Alerts** (Recommended)

1. **Service Down Alert**

```promql
up{job=~".*-service"} == 0
```

2. **High CPU Usage**

```promql
rate(container_cpu_usage_seconds_total[5m]) * 100 > 80
```

3. **High Memory Usage**

```promql
(container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100 > 90
```

4. **Database Connection Issues**

```promql
up{job=~".*-db"} == 0
```

### **To Set Up Alerts in Grafana**:

1. Go to **Alerting** → **Alert Rules**
2. Click **"New Rule"**
3. Configure query using above PromQL
4. Set thresholds and notification channels

## 📱 **Dashboard Usage Guide**

### **Accessing Dashboards**:

1. Open Grafana: `http://YOUR_VM_IP:3007`
2. Login with **admin/admin**
3. Navigate to **"Hotel Booking System"** folder
4. Select desired dashboard

### **Time Range Selection**:

- **Last 5 minutes**: Real-time monitoring
- **Last 1 hour**: Recent performance trends
- **Last 24 hours**: Daily patterns
- **Custom range**: Historical analysis

### **Refresh Intervals**:

- **5s**: Real-time critical monitoring
- **30s**: Standard monitoring
- **1m**: General overview

## 🔧 **Troubleshooting**

### **Common Issues**:

1. **Dashboard Not Loading**:

   ```bash
   # Check Grafana status
   docker logs grafana

   # Restart Grafana
   docker restart grafana
   ```

2. **No Data in Dashboards**:

   ```bash
   # Check Prometheus status
   curl http://YOUR_VM_IP:9090/-/healthy

   # Check targets
   curl http://YOUR_VM_IP:9090/api/v1/targets
   ```

3. **Missing Metrics**:

   ```bash
   # Check cAdvisor
   curl http://YOUR_VM_IP:8081/metrics

   # Check node-exporter
   curl http://YOUR_VM_IP:9100/metrics
   ```

### **Service Health Check Commands**:

```bash
# Check all containers
docker ps

# Check specific service logs
docker logs user-service
docker logs hotel-service

# Check monitoring stack
docker logs prometheus
docker logs grafana
docker logs cadvisor
```

## 📊 **Custom Queries**

### **Application Metrics**:

```promql
# Top CPU consuming services
topk(5, rate(container_cpu_usage_seconds_total{name=~".*-service"}[5m]) * 100)

# Memory usage ranking
topk(5, container_memory_usage_bytes{name=~".*-service"})

# Service restart count
increase(container_start_time_seconds{name=~".*-service"}[24h])
```

### **Business Metrics** (if implemented):

```promql
# Booking requests per minute
rate(booking_requests_total[1m])

# Payment transaction rate
rate(payment_transactions_total[1m])

# User registration rate
rate(user_registrations_total[1m])
```

## 🎯 **Performance Optimization**

### **Resource Monitoring**:

1. Monitor CPU usage < 70%
2. Memory usage < 80%
3. Disk usage < 85%
4. Network latency < 100ms

### **Scaling Decisions**:

- **CPU > 80%**: Consider horizontal scaling
- **Memory > 90%**: Increase memory limits
- **High request latency**: Add load balancing
- **Database slow**: Optimize queries or scale DB

## 📈 **Monitoring Best Practices**

1. **Set up alerts for critical metrics**
2. **Review dashboards daily**
3. **Monitor trends over time**
4. **Document incidents and resolutions**
5. **Regularly update monitoring thresholds**
6. **Test alert notifications**

---

🎉 **Your monitoring stack is now fully configured and ready for production use!**
