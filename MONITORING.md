# Hotel Booking System - Monitoring Setup

## 📊 Monitoring Stack Overview

This project includes a comprehensive monitoring solution with:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboarding
- **cAdvisor**: Container resource monitoring
- **Node Exporter**: System metrics monitoring

## 🚀 Quick Access

After deployment, access monitoring services at:

| Service               | URL                            | Credentials |
| --------------------- | ------------------------------ | ----------- |
| **Grafana Dashboard** | http://YOUR_VM_IP:3007         | admin/admin |
| **Prometheus**        | http://YOUR_VM_IP:9090         | None        |
| **Container Metrics** | http://YOUR_VM_IP:8081         | None        |
| **System Metrics**    | http://YOUR_VM_IP:9100/metrics | None        |

## 📈 Available Dashboards

### 1. Container Monitoring Dashboard

- CPU usage per container
- Memory consumption
- Network I/O statistics
- Service health status

### 2. System Metrics

- Host CPU, memory, disk usage
- Network statistics
- File system metrics

## 🔧 Configuration Files

```
docker-compose/monitoring/
├── prometheus.yml              # Prometheus configuration
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/        # Auto-configured data sources
│   │   └── dashboards/         # Dashboard provisioning
│   └── dashboards/
│       └── containers-dashboard.json  # Container monitoring dashboard
```

## 🎯 Monitored Services

The monitoring stack automatically collects metrics from:

- ✅ All microservices (user, hotel, room, booking, payment, notification)
- ✅ MongoDB databases
- ✅ RabbitMQ message broker
- ✅ Nginx reverse proxy
- ✅ Docker containers
- ✅ Host system resources

## 📊 Key Metrics

### Application Metrics

- Service health status
- Response time
- Request counts
- Error rates

### Infrastructure Metrics

- Container CPU/Memory usage
- Disk I/O
- Network traffic
- Database connections

### Business Metrics

- User registrations
- Hotel bookings
- Payment transactions
- System uptime

## 🔔 Alerts (Future Enhancement)

The system is prepared for alerting on:

- High memory usage (>80%)
- High CPU usage (>80%)
- Service downtime
- Database connection issues
- Disk space low (<10%)

## 🛠️ Customization

### Adding Custom Dashboards

1. Create JSON dashboard file in `monitoring/grafana/dashboards/`
2. Restart Grafana container: `docker compose restart grafana`

### Adding New Metrics Sources

1. Update `monitoring/prometheus.yml`
2. Restart Prometheus: `docker compose restart prometheus`

### Modifying Alert Rules

1. Create alert rules in `monitoring/prometheus.yml`
2. Configure Grafana notification channels

## 🔍 Troubleshooting

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
docker logs grafana

# Restart Grafana
docker compose restart grafana
```

### Prometheus Not Collecting Metrics

```bash
# Check Prometheus targets
curl http://YOUR_VM_IP:9090/api/v1/targets

# Check Prometheus config
curl http://YOUR_VM_IP:9090/api/v1/status/config
```

### Container Metrics Missing

```bash
# Check cAdvisor status
curl http://YOUR_VM_IP:8081/healthz

# Restart cAdvisor
docker compose restart cadvisor
```

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [cAdvisor GitHub](https://github.com/google/cadvisor)
- [Node Exporter](https://github.com/prometheus/node_exporter)

---

**Note**: Default Grafana credentials are `admin/admin`. Change these in production environments!
