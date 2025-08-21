# Jenkins CI/CD Setup Guide for Hotel Booking System

## Prerequisites

### 1. Jenkins Server Setup

- Jenkins server with Docker support
- Required plugins:
  - Docker Pipeline
  - Email Extension
  - Blue Ocean (optional, for better UI)
  - Credentials Binding
  - Pipeline Stage View

### 2. System Requirements

- Jenkins server with at least 4GB RAM
- Docker installed on Jenkins server
- Network access to your deployment VM (192.168.46.139)

## Jenkins Configuration

### 1. Install Required Plugins

Navigate to **Manage Jenkins > Manage Plugins** and install:

```
- Docker Pipeline
- Email Extension Plugin
- Credentials Binding Plugin
- Pipeline: Stage View Plugin
- Blue Ocean (optional)
```

### 2. Configure Credentials

Go to **Manage Jenkins > Manage Credentials** and add:

#### Docker Hub Credentials

- **Kind**: Username with password
- **ID**: `docker-hub-credentials`
- **Username**: Your Docker Hub username
- **Password**: Your Docker Hub access token

#### Email Configuration (Optional)

Go to **Manage Jenkins > Configure System > E-mail Notification**:

- **SMTP server**: smtp.gmail.com
- **SMTP port**: 587
- **Use SSL**: Yes
- **Username**: your-email@gmail.com
- **Password**: your-app-password

### 3. Create Pipeline Job

1. **New Item > Pipeline**
2. **Name**: `hotel-booking-system-pipeline`
3. **Pipeline Definition**: Pipeline script from SCM
4. **SCM**: Git
5. **Repository URL**: Your Git repository URL
6. **Branch**: `*/main`
7. **Script Path**: `Jenkinsfile`

## Environment Variables to Configure

Update the following variables in the Jenkinsfile:

```groovy
environment {
    DOCKER_HUB_REPO = 'your-dockerhub-username'  // Change this
    VM_IP = '192.168.46.139'                      // Your VM IP
    // Email addresses in post section
}
```

## Pipeline Stages Explained

### 1. **Checkout**

- Clones the repository
- Gets Git commit hash for tracking

### 2. **Environment Setup**

- Creates frontend `.env` file with correct values
- Generates `.env.docker` files for all microservices
- Ensures all required environment variables are set

### 3. **Build and Test Services**

- Runs in parallel for all services
- Installs dependencies (`npm ci`)
- Runs unit tests (`npm run test`)
- Builds frontend assets

### 4. **Docker Build**

- Builds all Docker images using docker-compose
- Tags images for Docker Hub with version and latest tags
- Logs into Docker Hub registry

### 5. **Security Scan**

- Installs Trivy security scanner
- Scans Docker images for vulnerabilities
- Reports high and critical security issues

### 6. **Push to Registry**

- Pushes all built images to Docker Hub
- Uses versioned tags and latest tags

### 7. **Deploy to Staging**

- Stops existing containers
- Cleans up unused Docker resources
- Deploys new containers using docker-compose
- Waits for all services to be healthy

### 8. **Health Checks**

- Tests all service endpoints
- Verifies nginx proxy is working
- Ensures all APIs are responding

### 9. **Integration Tests**

- Tests user registration functionality
- Tests API endpoints for hotels and rooms
- Verifies end-to-end functionality

### 10. **Initialize Test Data**

- Runs the test data initialization script
- Populates databases with sample data

### 11. **Performance Tests**

- Runs basic load testing
- Can be extended with proper tools like JMeter or k6

### 12. **Deploy to Production** (Manual Approval)

- Only runs on main branch
- Requires manual approval
- Can implement blue-green deployment

## Customization Options

### 1. Add More Tests

```groovy
stage('API Tests') {
    steps {
        sh '''
            # Install Newman (Postman CLI)
            npm install -g newman

            # Run Postman collection
            newman run tests/hotel-booking-api.postman_collection.json
        '''
    }
}
```

### 2. Add Database Migrations

```groovy
stage('Database Migration') {
    steps {
        sh '''
            # Run database migrations
            docker exec user-service npm run migrate
            docker exec hotel-service npm run migrate
        '''
    }
}
```

### 3. Add Slack Notifications

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

### 4. Add SonarQube Code Quality

```groovy
stage('Code Quality') {
    steps {
        script {
            def scannerHome = tool 'SonarQubeScanner'
            withSonarQubeEnv('SonarQube') {
                sh "${scannerHome}/bin/sonar-scanner"
            }
        }
    }
}
```

## Monitoring and Logging

### 1. Pipeline Monitoring

- Jenkins provides built-in pipeline visualization
- Blue Ocean plugin offers enhanced pipeline view
- Stage timing and success/failure tracking

### 2. Application Monitoring

Add application monitoring tools:

```bash
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

### 3. Log Aggregation

```bash
# Add ELK stack for log aggregation
  elasticsearch:
    image: elasticsearch:7.14.0

  logstash:
    image: logstash:7.14.0

  kibana:
    image: kibana:7.14.0
```

## Troubleshooting

### Common Issues

1. **Docker Permission Errors**

   ```bash
   # Add jenkins user to docker group
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   ```

2. **Network Connectivity Issues**

   ```bash
   # Ensure Jenkins can reach deployment VM
   ping 192.168.46.139
   ```

3. **Resource Constraints**

   ```bash
   # Increase Jenkins heap size
   # Edit /etc/default/jenkins
   JAVA_ARGS="-Xmx2048m"
   ```

4. **Pipeline Timeouts**
   ```groovy
   // Increase timeout in pipeline
   timeout(time: 30, unit: 'MINUTES') {
       // Pipeline steps
   }
   ```

## Security Best Practices

1. **Credentials Management**

   - Never hardcode secrets in Jenkinsfile
   - Use Jenkins credentials store
   - Rotate credentials regularly

2. **Pipeline Security**

   ```groovy
   // Use credentials binding
   withCredentials([usernamePassword(
       credentialsId: 'docker-hub-credentials',
       usernameVariable: 'DOCKER_USER',
       passwordVariable: 'DOCKER_PASS'
   )]) {
       sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'
   }
   ```

3. **Network Security**
   - Use HTTPS for Git repositories
   - Secure Jenkins with SSL
   - Implement proper firewall rules

## Performance Optimization

1. **Parallel Execution**

   - Build and test services in parallel
   - Use Jenkins agent pools

2. **Docker Layer Caching**

   ```groovy
   sh 'docker build --cache-from=${DOCKER_HUB_REPO}/${APP_NAME}-frontend:latest .'
   ```

3. **Artifact Caching**
   ```groovy
   // Cache node_modules
   sh 'npm ci --cache .npm --prefer-offline'
   ```

## Next Steps

1. **Set up Jenkins server**
2. **Configure credentials and plugins**
3. **Update Jenkinsfile variables**
4. **Create pipeline job**
5. **Run first build**
6. **Monitor and iterate**

This pipeline provides a complete CI/CD solution for your hotel booking system with automated testing, security scanning, and deployment!
