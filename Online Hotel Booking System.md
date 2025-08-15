# Online Hotel Booking System

A cloud-native microservices-based hotel booking system built with Node.js, MongoDB, React-Vite, and RabbitMQ, implementing the Saga EDA (Event-Driven Architecture) pattern for distributed transactions.

## 🏗️ Architecture Overview

This system demonstrates modern cloud computing principles including:

- **Microservices Architecture**: 6 independent services with clear separation of concerns
- **Event-Driven Communication**: Asynchronous messaging using RabbitMQ
- **Saga Pattern**: Distributed transaction management with compensation
- **Scalability**: Each service can be scaled independently
- **High Availability**: Fault-tolerant design with graceful failure handling
- **Security**: JWT-based authentication and input validation

### Services

1. **User Service** (Port 3001) - User authentication and profile management
2. **Hotel Service** (Port 3002) - Hotel information and management
3. **Room Service** (Port 3003) - Room details and availability
4. **Booking Service** (Port 3004) - Reservation management and Saga orchestration
5. **Payment Service** (Port 3005) - Payment processing and refunds
6. **Notification Service** (Port 3006) - Email/SMS notifications

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (separate instance per service)
- **Message Broker**: RabbitMQ
- **Authentication**: JWT tokens
- **Security**: Helmet, CORS, bcrypt

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Routing**: React Router
- **HTTP Client**: Axios
- **Date Handling**: date-fns

### DevOps
- **Containerization**: Docker & Docker Compose
- **Process Management**: PM2 (production)
- **Logging**: Morgan + custom logging
- **Health Checks**: Built-in health endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- RabbitMQ (local or cloud)
- Git

### Local Development

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

3. **Start MongoDB and RabbitMQ**
   ```bash
   # Using Docker (recommended)
   docker run -d --name mongodb -p 27017:27017 mongo:7.0
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management
   
   # Or install locally and start services
   ```

4. **Start all services**
   ```bash
   npm run start
   ```

5. **Create test data**
   ```bash
   # Wait for services to initialize (about 10 seconds), then:
   npm run test-data
   ```

6. **Start the frontend**
   ```bash
   npm run frontend
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

### Using Docker Compose

1. **Start all services with Docker**
   ```bash
   npm run docker:up
   ```

2. **View logs**
   ```bash
   npm run docker:logs
   ```

3. **Stop services**
   ```bash
   npm run docker:down
   ```

## 📋 Available Scripts

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

## 🔧 Configuration

### Environment Variables

Each service supports the following environment variables:

```bash
NODE_ENV=development|production
PORT=3001                    # Service port
MONGODB_URI=mongodb://...    # MongoDB connection string
RABBITMQ_URL=amqp://...     # RabbitMQ connection string
JWT_SECRET=your-secret      # JWT signing secret
```

### Service-Specific Configuration

- **Payment Service**: `STRIPE_SECRET_KEY` for payment processing
- **Notification Service**: SMTP settings for email notifications
- **Frontend**: `VITE_API_BASE_URL` for API endpoint

## 🏛️ System Architecture

### Microservices Communication

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

### Saga Pattern Implementation

The booking process follows a choreography-based saga:

1. **Booking Initiated** → Reserve Room
2. **Room Reserved** → Process Payment
3. **Payment Completed** → Confirm Booking
4. **Booking Confirmed** → Send Notification

**Compensation Flow** (if any step fails):
- Release room reservation
- Refund payment
- Cancel booking
- Send failure notification

### Event Flow

```
User Action → Booking Service → Room Service → Payment Service → Notification Service
     ↓              ↓               ↓              ↓                    ↓
   Request      Saga Start     Room Reserved   Payment Done      Email Sent
```

## 🔒 Security Features

- **Authentication**: JWT-based user authentication
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive request validation
- **Password Security**: bcrypt hashing with salt
- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: Protection against abuse
- **SQL Injection**: MongoDB prevents SQL injection
- **XSS Protection**: Helmet.js security headers

## 📊 Monitoring & Observability

### Health Checks

Each service exposes a health endpoint:
```bash
GET /health
```

### Logging

- **Development**: Console logging with Morgan
- **Production**: File-based logging with rotation
- **Error Tracking**: Centralized error handling

### Metrics

- Service response times
- Database connection status
- Message queue health
- Business metrics (bookings, revenue)

## 🧪 Testing

### Test Data

The system includes sample data:
- 2 test users (john@example.com, jane@example.com)
- 3 hotels with various room types
- Different pricing and amenities

### Testing Strategy

1. **Unit Tests**: Individual service logic
2. **Integration Tests**: Service-to-service communication
3. **End-to-End Tests**: Complete user workflows
4. **Load Tests**: Performance under stress

## 🚀 Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=mongodb://prod-cluster/...
   export RABBITMQ_URL=amqp://prod-rabbitmq/...
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Cloud Deployment Options

- **AWS**: ECS, EKS, or Elastic Beanstalk
- **Google Cloud**: GKE or Cloud Run
- **Azure**: AKS or Container Instances
- **Kubernetes**: Any Kubernetes cluster

### Scaling Considerations

- **Horizontal Scaling**: Add more service instances
- **Database Scaling**: MongoDB sharding or replica sets
- **Message Queue**: RabbitMQ clustering
- **Load Balancing**: Nginx or cloud load balancers

## 🔧 Troubleshooting

### Common Issues

1. **Services not starting**
   - Check MongoDB and RabbitMQ are running
   - Verify port availability
   - Check logs in `logs/` directory

2. **Database connection errors**
   - Verify MongoDB URI
   - Check network connectivity
   - Ensure database exists

3. **Message queue issues**
   - Check RabbitMQ status
   - Verify connection URL
   - Check queue declarations

### Debug Commands

```bash
# Check service status
curl http://localhost:3001/health

# View service logs
tail -f logs/user-service.log

# Check running processes
ps aux | grep node

# Check port usage
netstat -tulpn | grep :3001
```

## 📈 Performance Optimization

### Database Optimization
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization

### Caching Strategy
- Redis for session storage
- Application-level caching
- CDN for static assets

### Message Queue Optimization
- Message persistence configuration
- Queue durability settings
- Consumer acknowledgment patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines

- Follow ESLint configuration
- Write comprehensive tests
- Update documentation
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built as part of a cloud computing assignment
- Demonstrates modern microservices patterns
- Educational purpose with production-ready code

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Check the troubleshooting section
- Review the architecture documentation

---

**Note**: This is an educational project demonstrating microservices architecture, event-driven design, and modern cloud-native development practices.

