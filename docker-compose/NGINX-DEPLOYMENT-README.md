# Cloud-Native MERN Hotel Booking System - Nginx Reverse Proxy Deployment

## Overview

This deployment uses **Nginx as a reverse proxy** to route all requests through a single entry point. This approach provides:

- ✅ **Single access point**: Everything accessible through one port (80 or 3000)
- ✅ **CORS handling**: Nginx manages cross-origin requests
- ✅ **Load balancing**: Built-in upstream load balancing
- ✅ **Security**: Rate limiting and security headers
- ✅ **Production-ready**: Optimized for production deployments

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git installed

### Deployment Steps

1. **Clone the repository:**

```bash
git clone <repository-url>
cd Cloud-Native-MERN-Deployment/docker-compose
```

2. **Start all services:**

```bash
docker-compose up -d
```

3. **Wait for services to start (2-3 minutes):**

```bash
# Check status
docker-compose ps
```

4. **Access the application:**
   - **Frontend**: http://localhost (port 80) OR http://localhost:3000
   - **All API calls**: Automatically routed through nginx

## How It Works

### Architecture

```
Internet/Browser
       ↓
   Nginx Proxy (Port 80/3000)
       ↓
   ┌─────────────────────────────────────┐
   │  Frontend (React)  ←→  API Services │
   │                                     │
   │  /              →  frontend:3000    │
   │  /api/users/    →  user-service     │
   │  /api/hotels/   →  hotel-service    │
   │  /api/rooms/    →  room-service     │
   │  /api/bookings/ →  booking-service  │
   │  /api/sagas/    →  booking-service  │
   └─────────────────────────────────────┘
```

### URL Routing

| Request Path      | Proxied To           | Purpose                          |
| ----------------- | -------------------- | -------------------------------- |
| `/`               | frontend:3000        | React application                |
| `/api/users/*`    | user-service:3001    | User authentication & management |
| `/api/hotels/*`   | hotel-service:3002   | Hotel information                |
| `/api/rooms/*`    | room-service:3003    | Room management                  |
| `/api/bookings/*` | booking-service:3004 | Booking operations               |
| `/api/sagas/*`    | booking-service:3004 | Saga transaction management      |
| `/health`         | nginx                | Nginx health check               |

## Access Points

### For Users:

- **Application**: http://localhost or http://localhost:3000
- **Health Check**: http://localhost/health

### For Development/Debugging:

- **Direct Service Access**: Still available on original ports
  - User Service: http://localhost:3001
  - Hotel Service: http://localhost:3002
  - Room Service: http://localhost:3003
  - Booking Service: http://localhost:3004
  - Payment Service: http://localhost:3005
  - Notification Service: http://localhost:3006
- **RabbitMQ Management**: http://localhost:15672

## Test Credentials

The system comes with pre-loaded test data:

- **Admin**: admin@hotel.com / password123
- **User 1**: john@example.com / password123
- **User 2**: jane@example.com / password123

## Configuration Files

### Key Files:

- `docker-compose.yml` - Service orchestration
- `nginx.conf` - Nginx reverse proxy configuration
- `init-docker-test-data.js` - Test data initialization

### Environment Variables (Frontend):

```bash
VITE_API_BASE_URL=/api/users          # User service
VITE_HOTEL_API_BASE_URL=/api/hotels   # Hotel service
VITE_ROOM_API_BASE_URL=/api/rooms     # Room service
VITE_BOOKING_API_BASE_URL=/api/bookings # Booking service
```

## Nginx Features

### Security Headers

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Rate Limiting

- API endpoints: 10 requests/second
- Auth endpoints: 5 requests/second
- Burst handling with nodelay

### CORS Support

- Automatic CORS headers for API routes
- Preflight request handling
- Cross-origin resource sharing enabled

### Static Asset Optimization

- Gzip compression
- Cache headers for static files
- Optimized for SPA routing

## Troubleshooting

### Check Service Health

```bash
# Check all containers
docker-compose ps

# Check nginx specifically
curl http://localhost/health

# Check individual service health
curl http://localhost:3001/health  # User service
curl http://localhost:3002/health  # Hotel service
# etc.
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs nginx-proxy
docker-compose logs frontend
docker-compose logs user-service
```

### Common Issues

1. **503 Service Unavailable**

   - Wait 2-3 minutes for all services to start
   - Check individual service health endpoints

2. **Frontend loads but API calls fail**

   - Check nginx logs: `docker-compose logs nginx-proxy`
   - Verify service health: `docker-compose ps`

3. **Services not starting**
   - Check for port conflicts: `docker-compose down`
   - Restart with: `docker-compose up -d`

### Complete Reset

```bash
# Stop and remove everything
docker-compose down -v

# Restart fresh
docker-compose up -d --build
```

## Production Considerations

### For Production Deployment:

1. **Use HTTPS**:

   - Add SSL certificates to nginx
   - Update nginx.conf for HTTPS redirects

2. **Environment Variables**:

   - Change default passwords
   - Use proper MongoDB credentials
   - Set strong JWT secrets

3. **Resource Limits**:

   - Add memory and CPU limits to docker-compose.yml
   - Configure nginx worker processes

4. **Monitoring**:

   - Add health check endpoints
   - Set up logging aggregation
   - Monitor nginx metrics

5. **Security**:
   - Configure firewall rules
   - Use non-root users in containers
   - Regular security updates

## Benefits of This Approach

1. **Simplified Deployment**: Single docker-compose command
2. **No IP Configuration**: Works on any machine without configuration
3. **Production Ready**: Nginx provides production-grade reverse proxy
4. **Scalable**: Easy to add load balancing and multiple instances
5. **Secure**: Built-in security headers and rate limiting
6. **Maintainable**: Clean separation of concerns

## Comparison with Previous Approach

| Aspect         | Environment Variables      | Nginx Reverse Proxy     |
| -------------- | -------------------------- | ----------------------- |
| Configuration  | Requires IP/hostname setup | Zero configuration      |
| Cross-Origin   | Manual CORS handling       | Automatic CORS          |
| Load Balancing | Not supported              | Built-in                |
| Security       | Basic                      | Production-grade        |
| Maintenance    | IP changes require updates | Self-contained          |
| Scalability    | Limited                    | Easy horizontal scaling |

This nginx reverse proxy approach is the **recommended production deployment method** for the Cloud-Native MERN Hotel Booking System.
