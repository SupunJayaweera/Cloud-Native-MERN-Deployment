# Docker Deployment Guide

## Quick Start

### Option 1: Automatic Deployment (Recommended)

1. Clone the repository:

```bash
git clone <repository-url>
cd Cloud-Native-MERN-Deployment/docker-compose
```

2. Run the deployment script:

```bash
# Make script executable
chmod +x deploy.sh

# Deploy with auto-detected IP
./deploy.sh

# OR deploy with specific IP address
./deploy.sh 192.168.46.139
```

### Option 2: Manual Deployment

1. Clone the repository:

```bash
git clone <repository-url>
cd Cloud-Native-MERN-Deployment/docker-compose
```

2. Configure environment variables:

```bash
# Edit .env file and set your IP address
echo "API_HOST=http://YOUR_VM_IP_ADDRESS" > .env
# For example: echo "API_HOST=http://192.168.46.139" > .env
```

3. Deploy the application:

```bash
docker-compose up -d --build
```

## Accessing the Application

Once deployed, you can access:

- **Frontend Application**: http://YOUR_IP:3000
- **User Service API**: http://YOUR_IP:3001
- **Hotel Service API**: http://YOUR_IP:3002
- **Room Service API**: http://YOUR_IP:3003
- **Booking Service API**: http://YOUR_IP:3004
- **Payment Service API**: http://YOUR_IP:3005
- **Notification Service API**: http://YOUR_IP:3006
- **RabbitMQ Management**: http://YOUR_IP:15672 (admin/password123)

## Test Credentials

The system comes with pre-loaded test data:

- **Admin User**: admin@hotel.com / password123
- **Regular User 1**: john@example.com / password123
- **Regular User 2**: jane@example.com / password123

## Troubleshooting

### Frontend Can't Connect to APIs

If you see "ERR_CONNECTION_REFUSED" errors:

1. Check that the `.env` file has the correct `API_HOST` value
2. Ensure you're accessing the frontend using the same IP address set in `API_HOST`
3. Restart the services after changing the configuration:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Services Showing as Unhealthy

Wait 1-2 minutes for all services to fully start up. Check status with:

```bash
docker-compose ps
```

### Accessing from Different Machine

If you're accessing the application from a different machine than where Docker is running:

1. Find your VM/server IP address:

   ```bash
   hostname -I
   # or
   ip addr show
   ```

2. Update the `.env` file:

   ```bash
   echo "API_HOST=http://YOUR_VM_IP" > .env
   ```

3. Restart the services:

   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

4. Access the application using the VM IP: http://YOUR_VM_IP:3000

## Environment Configuration

The `.env` file supports the following variables:

- `API_HOST`: Base URL for API services (default: http://localhost)

Example configurations:

```bash
# Local development
API_HOST=http://localhost

# VM deployment
API_HOST=http://192.168.46.139

# Production server
API_HOST=http://your-domain.com
```

## Service Health Checks

All services include health checks. You can monitor them with:

```bash
docker-compose ps
```

Healthy services will show "(healthy)" in the status column.

## Data Initialization

The system automatically initializes with test data including:

- 3 test users (1 admin, 2 regular users)
- 3 hotels with different themes
- 90 rooms across all hotels

## Security Notes

For production deployment:

1. Change default passwords in environment files
2. Use HTTPS instead of HTTP
3. Configure proper firewall rules
4. Use secrets management for sensitive data
