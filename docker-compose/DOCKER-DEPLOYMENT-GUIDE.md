# Docker Deployment Guide for Hotel Booking System

## 🐳 Docker Architecture Overview

This hotel booking system uses a microservices architecture deployed with Docker Compose. Each service runs in its own container with dedicated MongoDB instances for data isolation.

### Services Architecture:

- **6 Microservices**: user-service, hotel-service, room-service, booking-service, payment-service, notification-service
- **6 MongoDB Instances**: Separate databases for each service (ports 27017-27022)
- **1 RabbitMQ Instance**: Message broker for inter-service communication
- **1 React Frontend**: Web application interface

## 📋 Prerequisites

1. **Docker & Docker Compose** installed
2. **Node.js** (for running initialization scripts)
3. **Git** (for cloning the project)

## 🚀 Quick Start Deployment

### Step 1: Navigate to Docker Compose Directory

```bash
cd docker-compose
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

### Step 3: Wait for Services to Initialize

```bash
# Check container status
docker-compose ps

# Watch logs
docker-compose logs -f
```

### Step 4: Initialize Test Data

```bash
# Wait for all databases to be ready (about 2-3 minutes)
node init-docker-test-data.js
```

### Step 5: Verify Deployment

```bash
# Run the test script
./test-docker-deployment.sh
```

## 🔧 Service Configuration

### Environment Files

Each service uses a dedicated `.env.docker` file:

- `../services/user-service/.env.docker`
- `../services/hotel-service/.env.docker`
- `../services/room-service/.env.docker`
- `../services/booking-service/.env.docker`
- `../services/payment-service/.env.docker`
- `../services/notification-service/.env.docker`

### Database Configuration

Each service connects to its own MongoDB instance:

| Service              | Database       | Port  | URI                                                              |
| -------------------- | -------------- | ----- | ---------------------------------------------------------------- |
| user-service         | userdb         | 27017 | mongodb://admin:password123@user-db:27017/userdb                 |
| hotel-service        | hoteldb        | 27018 | mongodb://admin:password123@hotel-db:27017/hoteldb               |
| room-service         | roomdb         | 27019 | mongodb://admin:password123@room-db:27017/roomdb                 |
| booking-service      | bookingdb      | 27020 | mongodb://admin:password123@booking-db:27017/bookingdb           |
| payment-service      | paymentdb      | 27021 | mongodb://admin:password123@payment-db:27017/paymentdb           |
| notification-service | notificationdb | 27022 | mongodb://admin:password123@notification-db:27017/notificationdb |

## 🌐 Service Endpoints

### Microservices

- **User Service**: http://localhost:3001
- **Hotel Service**: http://localhost:3002
- **Room Service**: http://localhost:3003
- **Booking Service**: http://localhost:3004
- **Payment Service**: http://localhost:3005
- **Notification Service**: http://localhost:3006

### Infrastructure

- **Frontend**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (admin/password123)

### Health Checks

Each service provides a health endpoint:

- GET `/health` - Returns service health status

## 🔍 Monitoring & Debugging

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs user-service
docker-compose logs hotel-service

# Follow logs in real-time
docker-compose logs -f user-service
```

### Check Container Status

```bash
# List all containers
docker-compose ps

# Inspect specific container
docker inspect <container_name>
```

### Database Access

```bash
# Connect to user database
docker exec -it user-db mongo -u admin -p password123 --authenticationDatabase admin userdb

# Connect to hotel database
docker exec -it hotel-db mongo -u admin -p password123 --authenticationDatabase admin hoteldb
```

### RabbitMQ Management

- URL: http://localhost:15672
- Username: admin
- Password: password123

## 🛠️ Common Operations

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart user-service
```

### Update Service Code

```bash
# Rebuild and restart specific service
docker-compose up -d --build user-service
```

### Clean Restart

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

### View Resource Usage

```bash
# Container resource usage
docker stats

# System resource usage
docker system df
```

## 🧪 Testing the Deployment

### Automated Testing

```bash
./test-docker-deployment.sh
```

### Manual Testing

1. **Health Checks**:

   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3002/health
   curl http://localhost:3003/health
   curl http://localhost:3004/health
   curl http://localhost:3005/health
   curl http://localhost:3006/health
   ```

2. **User Registration**:

   ```bash
   curl -X POST http://localhost:3001/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
   ```

3. **Hotel Listing**:
   ```bash
   curl http://localhost:3002/api/hotels
   ```

## 🔐 Security Configuration

### Default Credentials

- **MongoDB**: admin/password123
- **RabbitMQ**: admin/password123
- **Test Users**:
  - Admin: admin@hotel.com / password123
  - User: john@example.com / password123

### Production Security

For production deployment, ensure to:

1. Change all default passwords
2. Use environment-specific secrets
3. Enable SSL/TLS
4. Configure proper firewall rules
5. Use Docker secrets for sensitive data

## 📊 Data Management

### Backup Databases

```bash
# Backup user database
docker exec user-db mongodump --uri="mongodb://admin:password123@localhost:27017/userdb?authSource=admin" --out=/backup

# Copy backup from container
docker cp user-db:/backup ./backup-user-db
```

### Restore Databases

```bash
# Restore user database
docker exec user-db mongorestore --uri="mongodb://admin:password123@localhost:27017/userdb?authSource=admin" /backup/userdb
```

## 🚨 Troubleshooting

### Service Won't Start

1. Check logs: `docker-compose logs <service-name>`
2. Verify environment file exists
3. Check port conflicts
4. Ensure dependencies are running

### Database Connection Issues

1. Verify MongoDB container is running
2. Check database credentials
3. Ensure network connectivity
4. Check firewall settings

### RabbitMQ Connection Issues

1. Verify RabbitMQ container is running
2. Check RabbitMQ credentials
3. Access management UI to verify queues
4. Check service logs for connection errors

### Memory Issues

```bash
# Check Docker system resources
docker system df

# Clean up unused resources
docker system prune -a
```

## 📈 Scaling

### Scale Services

```bash
# Scale user service to 3 instances
docker-compose up -d --scale user-service=3

# Scale with load balancer (requires additional configuration)
docker-compose up -d --scale user-service=3 --scale hotel-service=2
```

### Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  user-service:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
```

## 🔄 Updates & Maintenance

### Update Application Code

1. Pull latest code changes
2. Rebuild containers: `docker-compose build`
3. Restart services: `docker-compose up -d`

### Update Dependencies

1. Update package.json files
2. Rebuild containers: `docker-compose build --no-cache`
3. Restart services: `docker-compose up -d`

## 📝 Logs & Monitoring

### Centralized Logging

Consider adding logging solutions like:

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Fluentd
- Grafana + Prometheus

### Application Monitoring

- Health check endpoints are available at `/health`
- Consider adding APM tools like:
  - New Relic
  - DataDog
  - Application Insights

This Docker deployment provides a scalable, maintainable microservices architecture for the hotel booking system with proper service isolation and monitoring capabilities.
