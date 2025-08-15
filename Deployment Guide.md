# Deployment Guide

This document provides comprehensive deployment instructions for the Hotel Booking System.

## 🚀 Deployment Options

### 1. Local Development Deployment

**Prerequisites:**
- Node.js 18+
- MongoDB
- RabbitMQ

**Steps:**
```bash
# 1. Clone and setup
git clone <repository-url>
cd hotel-booking-system
npm install

# 2. Install service dependencies
for service in services/*; do
  cd "$service" && npm install && cd ../..
done

# 3. Install frontend dependencies
cd frontend/hotel-booking-frontend && npm install && cd ../..

# 4. Start infrastructure
docker run -d --name mongodb -p 27017:27017 mongo:7.0
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management

# 5. Start services
npm run start

# 6. Create test data
sleep 10 && npm run test-data

# 7. Start frontend
npm run frontend
```

### 2. Docker Compose Deployment

**Prerequisites:**
- Docker
- Docker Compose

**Steps:**
```bash
# 1. Clone repository
git clone <repository-url>
cd hotel-booking-system

# 2. Start all services
npm run docker:up

# 3. Wait for services to initialize
sleep 30

# 4. Create test data
docker exec -it booking-service node /app/test-data.js

# 5. Access application
# Frontend: http://localhost:3000
# RabbitMQ Management: http://localhost:15672
```

### 3. Production Deployment

#### Option A: Traditional Server Deployment

**Prerequisites:**
- Ubuntu/CentOS server
- Node.js 18+
- MongoDB cluster
- RabbitMQ cluster
- Nginx (load balancer)
- PM2 (process manager)

**Steps:**

1. **Server Setup**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install nginx
```

2. **Application Deployment**
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

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'user-service',
      script: 'services/user-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGODB_URI: 'mongodb://mongo-cluster/userdb',
        RABBITMQ_URL: 'amqp://rabbitmq-cluster',
        JWT_SECRET: 'your-production-secret'
      }
    },
    {
      name: 'hotel-service',
      script: 'services/hotel-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        MONGODB_URI: 'mongodb://mongo-cluster/hoteldb',
        RABBITMQ_URL: 'amqp://rabbitmq-cluster'
      }
    },
    {
      name: 'room-service',
      script: 'services/room-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        MONGODB_URI: 'mongodb://mongo-cluster/roomdb',
        RABBITMQ_URL: 'amqp://rabbitmq-cluster'
      }
    },
    {
      name: 'booking-service',
      script: 'services/booking-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        MONGODB_URI: 'mongodb://mongo-cluster/bookingdb',
        RABBITMQ_URL: 'amqp://rabbitmq-cluster'
      }
    },
    {
      name: 'payment-service',
      script: 'services/payment-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        MONGODB_URI: 'mongodb://mongo-cluster/paymentdb',
        RABBITMQ_URL: 'amqp://rabbitmq-cluster',
        STRIPE_SECRET_KEY: 'sk_live_...'
      }
    },
    {
      name: 'notification-service',
      script: 'services/notification-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        MONGODB_URI: 'mongodb://mongo-cluster/notificationdb',
        RABBITMQ_URL: 'amqp://rabbitmq-cluster',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'your-email@gmail.com',
        SMTP_PASS: 'your-app-password'
      }
    }
  ]
};
EOF

# Start services with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Nginx Configuration**
```bash
# Create Nginx config
sudo cat > /etc/nginx/sites-available/hotel-booking << EOF
upstream backend {
    server localhost:3004;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/hotel-booking-system/frontend/hotel-booking-frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Option B: Kubernetes Deployment

**Prerequisites:**
- Kubernetes cluster
- kubectl configured
- Docker registry access

**Steps:**

1. **Build and Push Images**
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

2. **Deploy Infrastructure**
```yaml
# mongodb-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: admin
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: password123
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
```

3. **Deploy Services**
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
        - name: PORT
          value: "3001"
        - name: MONGODB_URI
          value: mongodb://mongodb-service:27017/userdb
        - name: RABBITMQ_URL
          value: amqp://rabbitmq-service:5672
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 3001
    targetPort: 3001
```

#### Option C: Cloud Platform Deployment

**AWS ECS Deployment:**

1. **Create Task Definitions**
```json
{
  "family": "hotel-booking-services",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "user-service",
      "image": "your-account.dkr.ecr.region.amazonaws.com/user-service:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MONGODB_URI",
          "value": "mongodb://documentdb-cluster:27017/userdb"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hotel-booking",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "user-service"
        }
      }
    }
  ]
}
```

2. **Create ECS Service**
```bash
aws ecs create-service \
  --cluster hotel-booking-cluster \
  --service-name user-service \
  --task-definition hotel-booking-services:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

## 🔧 Environment Configuration

### Production Environment Variables

**Common Variables:**
```bash
NODE_ENV=production
MONGODB_URI=mongodb://cluster/database
RABBITMQ_URL=amqp://cluster
JWT_SECRET=your-secure-secret
```

**Service-Specific Variables:**
```bash
# Payment Service
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Notification Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=app-password
SENDGRID_API_KEY=SG.xxx (alternative)

# Frontend
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 📊 Monitoring & Logging

### Application Monitoring

1. **Health Checks**
```bash
# Add to your monitoring system
curl -f http://service:port/health || exit 1
```

2. **Prometheus Metrics** (Optional)
```javascript
// Add to each service
const prometheus = require('prom-client');
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});
```

3. **Centralized Logging**
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use HTTPS/TLS certificates
- [ ] Implement rate limiting
- [ ] Set up firewall rules
- [ ] Use secrets management
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Database encryption at rest
- [ ] Network segmentation
- [ ] Input validation
- [ ] CORS configuration

### SSL/TLS Setup

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Service Discovery Issues**
```bash
# Check service connectivity
docker exec -it service-name ping other-service-name
kubectl exec -it pod-name -- nslookup service-name
```

2. **Database Connection Issues**
```bash
# Test MongoDB connection
mongo "mongodb://username:password@host:port/database"
```

3. **Message Queue Issues**
```bash
# Check RabbitMQ status
rabbitmqctl status
rabbitmqctl list_queues
```

### Performance Optimization

1. **Database Optimization**
```javascript
// Add indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.bookings.createIndex({ userId: 1, createdAt: -1 });
db.rooms.createIndex({ hotelId: 1, status: 1 });
```

2. **Connection Pooling**
```javascript
// MongoDB connection options
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0
};
```

3. **Caching Strategy**
```javascript
// Redis caching
const redis = require('redis');
const client = redis.createClient();

// Cache hotel data
app.get('/api/hotels', async (req, res) => {
  const cached = await client.get('hotels');
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  // Fetch from database and cache
});
```

## 📈 Scaling Guidelines

### Horizontal Scaling

1. **Service Scaling**
```bash
# Docker Compose
docker-compose up --scale user-service=3 --scale booking-service=2

# Kubernetes
kubectl scale deployment user-service --replicas=3
```

2. **Database Scaling**
```javascript
// MongoDB replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
});
```

3. **Load Balancing**
```nginx
upstream backend {
    least_conn;
    server backend1:3004 weight=3;
    server backend2:3004 weight=2;
    server backend3:3004 weight=1;
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker images
        run: |
          docker build -t ${{ secrets.REGISTRY }}/user-service:${{ github.sha }} services/user-service/
          docker push ${{ secrets.REGISTRY }}/user-service:${{ github.sha }}
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster production --service user-service --force-new-deployment
```

This deployment guide provides comprehensive instructions for deploying the Hotel Booking System in various environments, from local development to production cloud platforms.

