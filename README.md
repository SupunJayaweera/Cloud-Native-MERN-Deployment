# Complete Hotel Booking System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Technology Stack](#technology-stack)
4. [Quick Start Guide](#quick-start-guide)
5. [Deployment Guide](#deployment-guide)
6. [Jenkins CI/CD Setup](#jenkins-cicd-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security Features](#security-features)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)
11. [Contributing](#contributing)

---

## System Overview

A cloud-native microservices-based hotel booking system built with Node.js, MongoDB, React-Vite, and RabbitMQ, implementing the Saga EDA (Event-Driven Architecture) pattern for distributed transactions.

### Key Features

- **Microservices Architecture**: 6 independent services with clear separation of concerns
- **Event-Driven Communication**: Asynchronous messaging using RabbitMQ
- **Saga Pattern**: Distributed transaction management with compensation
- **Scalability**: Each service can be scaled independently
- **High Availability**: Fault-tolerant design with graceful failure handling
- **Security**: JWT-based authentication and input validation
- **Comprehensive Monitoring**: Prometheus, Grafana, and cAdvisor integration
- **CI/CD Pipeline**: Automated testing, building, and deployment with Jenkins

### Services Architecture

1. **User Service** (Port 3001) - User authentication and profile management
2. **Hotel Service** (Port 3002) - Hotel information and management
3. **Room Service** (Port 3003) - Room details and availability
4. **Booking Service** (Port 3004) - Reservation management and Saga orchestration
5. **Payment Service** (Port 3005) - Payment processing and refunds
6. **Notification Service** (Port 3006) - Email/SMS notifications

---

## Architecture Design

### Microservices Communication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │ API Gateway │    │   User      │
│   (React)   │◄──►│  (Optional) │◄──►│  Service    │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Hotel     │    │   Room      │    │  Booking    │
│  Service    │    │  Service    │    │  Service    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Payment    │    │RabbitMQ     │    │Notification │
│  Service    │    │Message      │    │  Service    │
└─────────────┘    │Broker       │    └─────────────┘
                   └─────────────┘
```

### Core Services Identification

#### 1.1 User Service

**Responsibility:** Manages user authentication, authorization, and profile information.

**Data Model:**

- User ID (Primary Key)
- Username, Email, Password Hash
- Personal Information (First Name, Last Name, Contact)
- Roles (Guest, Admin)

#### 1.2 Hotel Service

**Responsibility:** Manages hotel properties, amenities, and basic information.

**Data Model:**

- Hotel ID (Primary Key)
- Hotel Name, Address, City, Country
- Description, Amenities, Contact Information
- Rating, Images

#### 1.3 Room Service

**Responsibility:** Manages individual room details and availability.

**Data Model:**

- Room ID (Primary Key)
- Hotel ID (Foreign Key)
- Room Number, Type, Capacity
- Price per Night, Availability Status
- Description, Amenities

#### 1.4 Booking Service

**Responsibility:** Core booking logic and Saga orchestration.

**Data Model:**

- Booking ID (Primary Key)
- User ID, Room ID (Foreign Keys)
- Check-in/Check-out Dates
- Number of Guests, Total Price
- Booking Status, Payment ID

#### 1.5 Payment Service

**Responsibility:** Payment processing and transaction management.

**Data Model:**

- Payment ID (Primary Key)
- Booking ID, User ID (Foreign Keys)
- Amount, Currency, Payment Method
- Transaction ID, Payment Status
- Timestamp

#### 1.6 Notification Service

**Responsibility:** Multi-channel notification delivery.

**Data Model:**

- Notification ID (Primary Key)
- User ID (Foreign Key)
- Type (Email, SMS), Content
- Timestamp, Status

### Event-Driven Architecture (EDA)

#### Message Broker Communication

Using RabbitMQ as the central nervous system for:

- **Asynchronous Communication**: Non-blocking service interactions
- **Decoupling**: Services operate independently
- **Scalability**: Handle high event volumes
- **Resilience**: Event persistence and recovery

#### Key Events

- `UserCreated`: New user registration
- `HotelAdded`: New hotel listing
- `RoomAvailabilityUpdated`: Room status changes
- `BookingInitiated`: Reservation attempt
- `PaymentProcessed`: Payment completion
- `PaymentFailed`: Payment failure
- `BookingConfirmed`: Successful reservation
- `BookingCancelled`: Reservation cancellation

### Saga Pattern Implementation

#### Booking Process Saga Example

**Participants:** Booking Service (Orchestrator), Room Service, Payment Service, Notification Service

**Success Flow:**

1. **Booking Service** receives `CreateBooking` request
2. Sends `ReserveRoom` command to **Room Service**
3. **Room Service** publishes `RoomReserved` event
4. **Booking Service** sends `ProcessPayment` command to **Payment Service**
5. **Payment Service** publishes `PaymentProcessed` event
6. **Booking Service** confirms booking and publishes `BookingConfirmed`
7. **Notification Service** sends confirmation

**Compensation Flow (Rollback):**

- If `RoomReservationFailed`: Update booking status to Failed
- If `PaymentFailed`: Release room reservation + update booking status
- Send failure notifications for all failure scenarios

---

## Technology Stack

### Backend Technologies

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (separate instance per service)
- **Message Broker**: RabbitMQ
- **Authentication**: JWT tokens
- **Security**: Helmet, CORS, bcrypt
- **Process Management**: PM2 (production)

### Frontend Technologies

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Routing**: React Router
- **HTTP Client**: Axios
- **Date Handling**: date-fns

### DevOps & Infrastructure

- **Containerization**: Docker & Docker Compose
- **CI/CD**: Jenkins Pipeline
- **Monitoring**: Prometheus, Grafana, cAdvisor
- **Logging**: Morgan + custom logging
- **Health Checks**: Built-in health endpoints
- **Security Scanning**: Trivy

---

## Quick Start Guide

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- RabbitMQ (local or cloud)
- Git
- Docker & Docker Compose (recommended)

### Option 1: Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hotel-booking-system
   ```

2. **Install dependencies**

   ```bash
   # Install main dependencies
   npm install

   # Install frontend dependencies
   cd frontend/hotel-booking-frontend
   npm install
   cd ../..

   # Install service dependencies
   for service in services/*; do
     cd "$service" && npm install && cd ../..
   done
   ```

3. **Start infrastructure services**

   ```bash
   # Using Docker (recommended)
   docker run -d --name mongodb -p 27017:27017 mongo:7.0
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management
   ```

4. **Start all microservices**

   ```bash
   npm run start
   ```

5. **Initialize test data**

   ```bash
   # Wait for services to initialize (~10 seconds), then:
   npm run test-data
   ```

6. **Start the frontend**

   ```bash
   npm run frontend
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

### Option 2: Docker Compose Setup

1. **Clone and start with Docker**

   ```bash
   git clone <repository-url>
   cd hotel-booking-system
   npm run docker:up
   ```

2. **Initialize test data**

   ```bash
   # Wait for containers to be ready (~30 seconds), then:
   docker exec -it booking-service node /app/test-data.js
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - RabbitMQ Management: http://localhost:15672

### Available Scripts

```bash
npm run start          # Start all microservices
npm run stop           # Stop all microservices
npm run test-data      # Create sample data
npm run frontend       # Start frontend development server
npm run build          # Build frontend for production
npm run docker:up      # Start with Docker Compose
npm run docker:down    # Stop Docker Compose
npm run docker:logs    # View Docker logs
```

---

## Deployment Guide

### Local Development Deployment

**Prerequisites:**

- Node.js 18+, MongoDB, RabbitMQ

**Steps:**

```bash
# 1. Setup
git clone <repository-url>
cd hotel-booking-system
npm install

# 2. Install dependencies
for service in services/*; do
  cd "$service" && npm install && cd ../..
done
cd frontend/hotel-booking-frontend && npm install && cd ../..

# 3. Start infrastructure
docker run -d --name mongodb -p 27017:27017 mongo:7.0
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management

# 4. Start services
npm run start

# 5. Create test data
sleep 10 && npm run test-data

# 6. Start frontend
npm run frontend
```

### Docker Compose Deployment

**Prerequisites:**

- Docker, Docker Compose

**Steps:**

```bash
# 1. Clone and start
git clone <repository-url>
cd hotel-booking-system
npm run docker:up

# 2. Initialize data
sleep 30
docker exec -it booking-service node /app/test-data.js
```

### Production Deployment

#### Option A: Traditional Server Deployment

**Prerequisites:**

- Ubuntu/CentOS server, Node.js 18+, MongoDB cluster, RabbitMQ cluster, Nginx, PM2

**Server Setup:**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt-get install nginx
```

**Application Deployment:**

```bash
# Clone and build
git clone <repository-url>
cd hotel-booking-system
npm install --production

# Build frontend
cd frontend/hotel-booking-frontend
npm install --production
npm run build
cd ../..
```

**PM2 Ecosystem Configuration:**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "user-service",
      script: "services/user-service/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        MONGODB_URI: "mongodb://mongo-cluster/userdb",
        RABBITMQ_URL: "amqp://rabbitmq-cluster",
        JWT_SECRET: "your-production-secret",
      },
    },
    // ... other services
  ],
};
```

**Start with PM2:**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Nginx Configuration:**

```nginx
upstream backend {
    server localhost:3004;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/hotel-booking-system/frontend/hotel-booking-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option B: Kubernetes Deployment

**Build and Push Images:**

```bash
# Build service images
for service in user hotel room booking payment notification; do
  docker build -t your-registry/${service}-service:latest services/${service}-service/
  docker push your-registry/${service}-service:latest
done

# Build frontend image
docker build -t your-registry/hotel-booking-frontend:latest frontend/hotel-booking-frontend/
docker push your-registry/hotel-booking-frontend:latest
```

**Kubernetes Manifests:**

```yaml
# user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: your-registry/user-service:latest
          ports:
            - containerPort: 3001
          env:
            - name: NODE_ENV
              value: production
            - name: MONGODB_URI
              value: mongodb://mongodb-service:27017/userdb
```

#### Option C: Cloud Platform Deployment

**AWS ECS Example:**

```json
{
  "family": "hotel-booking-services",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "user-service",
      "image": "your-account.dkr.ecr.region.amazonaws.com/user-service:latest",
      "portMappings": [{ "containerPort": 3001, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        {
          "name": "MONGODB_URI",
          "value": "mongodb://documentdb-cluster:27017/userdb"
        }
      ]
    }
  ]
}
```

### Environment Configuration

**Production Environment Variables:**

```bash
# Common Variables
NODE_ENV=production
MONGODB_URI=mongodb://cluster/database
RABBITMQ_URL=amqp://cluster
JWT_SECRET=your-secure-secret

# Payment Service
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Notification Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=app-password

# Frontend
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Jenkins CI/CD Setup

### Prerequisites

**Jenkins Server Requirements:**

- Jenkins server with Docker support
- At least 4GB RAM
- Required plugins: Docker Pipeline, Email Extension, Blue Ocean, Credentials Binding

### Jenkins Configuration

**1. Install Required Plugins:**

```
- Docker Pipeline
- Email Extension Plugin
- Credentials Binding Plugin
- Pipeline: Stage View Plugin
- Blue Ocean (optional)
```

**2. Configure Credentials:**

- **Docker Hub Credentials** (ID: `docker-hub-credentials`)
- **Email Configuration** (SMTP settings)

**3. Create Pipeline Job:**

- Name: `hotel-booking-system-pipeline`
- Pipeline Definition: Pipeline script from SCM
- Repository: Your Git repository URL
- Script Path: `Jenkinsfile`

### Pipeline Stages

**1. Checkout**: Clone repository and get Git commit hash

**2. Environment Setup**: Create `.env` files for all services

**3. Build and Test Services**: Parallel building and testing of all services

**4. Docker Build**: Build all Docker images with versioned tags

**5. Security Scan**: Scan Docker images for vulnerabilities using Trivy

**6. Push to Registry**: Push images to Docker Hub

**7. Deploy to Staging**: Deploy containers and wait for health checks

**8. Health Checks**: Test all service endpoints

**9. Integration Tests**: End-to-end functionality testing

**10. Initialize Test Data**: Populate databases with sample data

**11. Performance Tests**: Basic load testing

**12. Deploy to Production**: Manual approval required for production deployment

### Customization Options

**Add API Tests:**

```groovy
stage('API Tests') {
    steps {
        sh '''
            npm install -g newman
            newman run tests/hotel-booking-api.postman_collection.json
        '''
    }
}
```

**Add Slack Notifications:**

```groovy
post {
    success {
        slackSend(
            channel: '#deployments',
            color: 'good',
            message: "✅ Hotel Booking System deployed successfully! Build #${BUILD_NUMBER}"
        )
    }
}
```

### Security Best Practices

**1. Credentials Management:**

- Use Jenkins credentials store
- Never hardcode secrets in Jenkinsfile
- Rotate credentials regularly

**2. Pipeline Security:**

```groovy
withCredentials([usernamePassword(
    credentialsId: 'docker-hub-credentials',
    usernameVariable: 'DOCKER_USER',
    passwordVariable: 'DOCKER_PASS'
)]) {
    sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'
}
```

---

## Monitoring & Observability

### Monitoring Stack Overview

**Components:**

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboarding
- **cAdvisor**: Container resource monitoring
- **Node Exporter**: System metrics monitoring

### Quick Access Dashboard

| Service               | URL                            | Credentials |
| --------------------- | ------------------------------ | ----------- |
| **Grafana Dashboard** | http://YOUR_VM_IP:3007         | admin/admin |
| **Prometheus**        | http://YOUR_VM_IP:9090         | None        |
| **Container Metrics** | http://YOUR_VM_IP:8081         | None        |
| **System Metrics**    | http://YOUR_VM_IP:9100/metrics | None        |

### Available Dashboards

**1. Application Services Dashboard** (`/d/hotel-app-services`)

- CPU usage per microservice
- Memory consumption per service
- Service health status (UP/DOWN)
- Real-time performance metrics

**2. Database Monitoring Dashboard** (`/d/hotel-databases`)

- MongoDB CPU usage (all 6 databases)
- Memory usage per database
- Network I/O per database
- Database connectivity status

**3. Infrastructure Overview Dashboard** (`/d/hotel-infrastructure`)

- System CPU, memory, disk usage
- Network statistics
- Total services up/down count
- Total containers running

**4. Container Monitoring Dashboard** (`/d/containers-dashboard`)

- Individual container resources
- Container restart counts
- Container uptime
- Resource limits vs usage

### Key Metrics

**Application Health Indicators:**

```promql
# Service availability
up{job=~".*-service"}

# CPU usage per service
rate(container_cpu_usage_seconds_total{name=~".*-service"}[5m]) * 100

# Memory usage per service
container_memory_usage_bytes{name=~".*-service"}
```

**Database Performance:**

```promql
# Database CPU
rate(container_cpu_usage_seconds_total{name=~".*-db"}[5m]) * 100

# Database memory
container_memory_usage_bytes{name=~".*-db"}
```

### Monitored Services

✅ All microservices (user, hotel, room, booking, payment, notification)
✅ MongoDB databases (6 separate instances)
✅ RabbitMQ message broker
✅ Nginx reverse proxy
✅ Docker containers
✅ Host system resources

### Alert Configuration (Ready for Implementation)

**System Alerts:**

- High memory usage (>80%)
- High CPU usage (>80%)
- Disk space low (<10%)
- Service downtime

**Application Alerts:**

- Database connection issues
- High error rates
- Response time degradation

### Customization

**Adding Custom Dashboards:**

1. Create JSON dashboard file in `monitoring/grafana/dashboards/`
2. Restart Grafana: `docker compose restart grafana`

**Adding New Metrics Sources:**

1. Update `monitoring/prometheus.yml`
2. Restart Prometheus: `docker compose restart prometheus`

---

## Security Features

### Authentication & Authorization

- **JWT-based Authentication**: Secure token-based user authentication
- **Role-based Access Control**: Admin and user role differentiation
- **Password Security**: bcrypt hashing with salt
- **Session Management**: Secure token expiration and refresh

### Input Validation & Data Protection

- **Comprehensive Request Validation**: Server-side input sanitization
- **CORS Configuration**: Cross-origin request security
- **SQL Injection Prevention**: MongoDB's natural protection
- **XSS Protection**: Helmet.js security headers

### Infrastructure Security

- **Rate Limiting**: Protection against abuse and DDoS
- **HTTPS/TLS**: Encrypted communication (production)
- **Network Segmentation**: Container isolation
- **Secrets Management**: Environment-based configuration

### Security Checklist for Production

- [ ] Use HTTPS/TLS certificates
- [ ] Implement rate limiting
- [ ] Set up firewall rules
- [ ] Use secrets management service
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Database encryption at rest
- [ ] Network segmentation
- [ ] Input validation on all endpoints
- [ ] CORS configuration

**SSL/TLS Setup with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Performance Optimization

### Database Optimization

**Indexing Strategy:**

```javascript
// Critical indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.bookings.createIndex({ userId: 1, createdAt: -1 });
db.rooms.createIndex({ hotelId: 1, status: 1 });
db.hotels.createIndex({ city: 1, rating: -1 });
```

**Connection Pooling:**

```javascript
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
};
```

### Caching Strategy

**Redis Implementation:**

```javascript
const redis = require("redis");
const client = redis.createClient();

// Cache frequently accessed hotel data
app.get("/api/hotels", async (req, res) => {
  const cached = await client.get("hotels");
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  // Fetch from database and cache with TTL
  const hotels = await Hotel.find();
  await client.setex("hotels", 300, JSON.stringify(hotels)); // 5 min TTL
  res.json(hotels);
});
```

### Message Queue Optimization

**RabbitMQ Configuration:**

```javascript
// Optimized connection settings
const amqp = require("amqplib");
const connection = await amqp.connect(rabbitmqUrl, {
  heartbeat: 60,
  connection_timeout: 60000,
});

// Prefetch for better load distribution
await channel.prefetch(10);
```

### Horizontal Scaling

**Service Scaling:**

```bash
# Docker Compose scaling
docker-compose up --scale user-service=3 --scale booking-service=2

# Kubernetes scaling
kubectl scale deployment user-service --replicas=3
```

**Load Balancing:**

```nginx
upstream backend {
    least_conn;
    server backend1:3004 weight=3;
    server backend2:3004 weight=2;
    server backend3:3004 weight=1;
}
```

### Performance Monitoring

**Application Performance Metrics:**

```javascript
// Add to services for performance tracking
const prometheus = require("prom-client");
const httpRequestDuration = new prometheus.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});
```

---

## Troubleshooting

### Common Deployment Issues

**1. Service Discovery Issues**

```bash
# Check service connectivity
docker exec -it service-name ping other-service-name
kubectl exec -it pod-name -- nslookup service-name
```

**2. Database Connection Issues**

```bash
# Test MongoDB connection
mongo "mongodb://username:password@host:port/database"

# Check connection logs
docker logs mongodb
```

**3. Message Queue Issues**

```bash
# Check RabbitMQ status
rabbitmqctl status
rabbitmqctl list_queues

# View RabbitMQ logs
docker logs rabbitmq
```

**4. Frontend Build Issues**

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Performance Issues

**1. High Memory Usage**

```bash
# Check container memory usage
docker stats

# Analyze memory leaks
node --inspect your-service.js
```

**2. Slow Database Queries**

```javascript
// Enable MongoDB query profiling
db.setProfilingLevel(2, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

**3. Message Queue Backlog**

```bash
# Check queue lengths
rabbitmqctl list_queues name messages

# Purge queues if needed (development only)
rabbitmqctl purge_queue queue_name
```

### Debug Commands

**Service Health Checks:**

```bash
# Check all service health
for port in 3001 3002 3003 3004 3005 3006; do
  curl -f http://localhost:$port/health || echo "Service on port $port is down"
done
```

**Container Debugging:**

```bash
# View container logs
docker logs container-name --tail 100 -f

# Execute commands in container
docker exec -it container-name /bin/bash

# Check resource usage
docker stats container-name
```

**Network Debugging:**

```bash
# Check port availability
netstat -tulpn | grep :3001

# Test network connectivity
telnet localhost 3001
```

### Error Resolution

**Common Error Patterns:**

1. **ECONNREFUSED**: Service not running or wrong port
2. **MongoDB connection timeout**: Database not accessible
3. **RabbitMQ connection error**: Message broker issues
4. **JWT token expired**: Authentication problems
5. **CORS errors**: Frontend-backend communication issues

---

## Contributing

### Development Guidelines

**1. Code Style:**

- Follow ESLint configuration
- Use Prettier for code formatting
- Write descriptive commit messages
- Follow conventional commit format

**2. Testing:**

- Write unit tests for new features
- Add integration tests for API endpoints
- Test error scenarios and edge cases
- Maintain test coverage above 80%

**3. Documentation:**

- Update README for new features
- Document API endpoints
- Add inline code comments
- Update architecture diagrams

**4. Pull Request Process:**

1. Create feature branch from main
2. Make changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback
6. Merge after approval

### Development Setup

**1. Fork and Clone:**

```bash
git clone https://github.com/your-username/hotel-booking-system.git
cd hotel-booking-system
```

**2. Install Dependencies:**

```bash
npm install
# Install dependencies for all services
for service in services/*; do
  cd "$service" && npm install && cd ../..
done
cd frontend/hotel-booking-frontend && npm install && cd ../..
```

**3. Set Up Development Environment:**

```bash
# Start infrastructure
docker run -d --name dev-mongodb -p 27017:27017 mongo:7.0
docker run -d --name dev-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management

# Start services in development mode
npm run dev
```

**4. Run Tests:**

```bash
# Run all tests
npm test

# Run specific service tests
cd services/user-service && npm test
```

### Testing Strategy

**1. Unit Tests:**

- Test individual functions and methods
- Mock external dependencies
- Use Jest testing framework

**2. Integration Tests:**

- Test API endpoints
- Test service-to-service communication
- Test database operations

**3. End-to-End Tests:**

- Test complete user workflows
- Test UI interactions
- Use Cypress or Playwright

**4. Load Tests:**

- Test system performance under load
- Use tools like k6 or JMeter
- Test with realistic data volumes

---

## License & Support

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Support & Contact

**For questions or issues:**

- Create an issue in the repository
- Check the troubleshooting section
- Review the architecture documentation
- Contact the development team

### Acknowledgments

- Built as part of a cloud computing assignment
- Demonstrates modern microservices patterns
- Educational purpose with production-ready code
- Thanks to the open-source community for tools and libraries

---

**Note**: This is a comprehensive educational project demonstrating microservices architecture, event-driven design, and modern cloud-native development practices. All components are designed with production readiness in mind while serving as an excellent learning resource for cloud computing concepts.

## Quick Reference

### Service Ports

- User Service: 3001
- Hotel Service: 3002
- Room Service: 3003
- Booking Service: 3004
- Payment Service: 3005
- Notification Service: 3006
- Frontend: 3000
- Grafana: 3007
- Prometheus: 9090
- RabbitMQ Management: 15672

### Default Credentials

- Grafana: admin/admin
- RabbitMQ: guest/guest
- Test Users: john@example.com / password123, jane@example.com / password123
- Admin User: admin@hotel.com / password123

### Important URLs

- Application: http://localhost:3000
- API Health: http://localhost:300X/health (X = service port)
- Monitoring: http://localhost:3007
- Message Queue: http://localhost:15672
