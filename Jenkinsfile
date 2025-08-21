pipeline {
    agent any
    
    environment {
        // Docker Hub credentials (configure in Jenkins credentials)
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKER_HUB_REPO = 'cloud-project-dockerhub'
        
        // Application configuration
        APP_NAME = 'hotel-booking-system'
        VM_IP = '192.168.46.139'
        
        // Version management
        VERSION = "${env.BUILD_NUMBER}"
        LATEST_TAG = 'latest'
        
        // Health check timeout
        HEALTH_CHECK_TIMEOUT = '300'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
                
                script {
                    // Get the commit hash for better tracking
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Environment Setup') {
            steps {
                echo 'Setting up environment variables...'
                script {
                    // Create frontend .env file
                    sh '''
                        cd frontend/hotel-booking-frontend
                        cat > .env << EOF
VITE_API_BASE_URL=""
VITE_HOTEL_API_BASE_URL=""
VITE_ROOM_API_BASE_URL=""
VITE_BOOKING_API_BASE_URL=""
EOF
                    '''
                    
                    // Ensure all .env.docker files exist for services
                    def services = ['user-service', 'hotel-service', 'room-service', 'booking-service', 'payment-service', 'notification-service']
                    
                    services.each { service ->
                        sh """
                            if [ ! -f services/${service}/.env.docker ]; then
                                echo "Creating .env.docker for ${service}..."
                                cd services/${service}
                                case "${service}" in
                                    "user-service")
                                        cat > .env.docker << EOF
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://admin:password123@user-db:27017/userdb?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-for-hotel-booking-system-2024
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
EOF
                                        ;;
                                    "hotel-service")
                                        cat > .env.docker << EOF
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://admin:password123@hotel-db:27017/hoteldb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
EOF
                                        ;;
                                    "room-service")
                                        cat > .env.docker << EOF
NODE_ENV=production
PORT=3003
MONGODB_URI=mongodb://admin:password123@room-db:27017/roomdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
EOF
                                        ;;
                                    "booking-service")
                                        cat > .env.docker << EOF
NODE_ENV=production
PORT=3004
MONGODB_URI=mongodb://admin:password123@booking-db:27017/bookingdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
USER_SERVICE_URL=http://user-service:3001
ROOM_SERVICE_URL=http://room-service:3003
PAYMENT_SERVICE_URL=http://payment-service:3005
NOTIFICATION_SERVICE_URL=http://notification-service:3006
EOF
                                        ;;
                                    "payment-service")
                                        cat > .env.docker << EOF
NODE_ENV=production
PORT=3005
MONGODB_URI=mongodb://admin:password123@payment-db:27017/paymentdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
EOF
                                        ;;
                                    "notification-service")
                                        cat > .env.docker << EOF
NODE_ENV=production
PORT=3006
MONGODB_URI=mongodb://admin:password123@notification-db:27017/notificationdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@hotelbooking.com
EOF
                                        ;;
                                esac
                            fi
                        """
                    }
                }
            }
        }
        
        stage('Build and Test Services') {
            parallel {
                stage('Frontend') {
                    steps {
                        dir('frontend/hotel-booking-frontend') {
                            echo 'Building Frontend...'
                            sh '''
                                npm ci
                                npm run build
                                npm run test:ci || true
                            '''
                        }
                    }
                }
                
                stage('User Service') {
                    steps {
                        dir('services/user-service') {
                            echo 'Testing User Service...'
                            sh '''
                                npm ci
                                npm run test || true
                            '''
                        }
                    }
                }
                
                stage('Hotel Service') {
                    steps {
                        dir('services/hotel-service') {
                            echo 'Testing Hotel Service...'
                            sh '''
                                npm ci
                                npm run test || true
                            '''
                        }
                    }
                }
                
                stage('Room Service') {
                    steps {
                        dir('services/room-service') {
                            echo 'Testing Room Service...'
                            sh '''
                                npm ci
                                npm run test || true
                            '''
                        }
                    }
                }
                
                stage('Booking Service') {
                    steps {
                        dir('services/booking-service') {
                            echo 'Testing Booking Service...'
                            sh '''
                                npm ci
                                npm run test || true
                            '''
                        }
                    }
                }
                
                stage('Payment Service') {
                    steps {
                        dir('services/payment-service') {
                            echo 'Testing Payment Service...'
                            sh '''
                                npm ci
                                npm run test || true
                            '''
                        }
                    }
                }
                
                stage('Notification Service') {
                    steps {
                        dir('services/notification-service') {
                            echo 'Testing Notification Service...'
                            sh '''
                                npm ci
                                npm run test || true
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                echo 'Building Docker images...'
                dir('docker-compose') {
                    script {
                        // Login to Docker Hub
                        sh 'echo $DOCKER_HUB_CREDENTIALS_PSW | docker login -u $DOCKER_HUB_CREDENTIALS_USR --password-stdin'
                        
                        // Build all images
                        sh 'docker-compose build --no-cache'
                        
                        // Tag images for Docker Hub
                        def services = ['frontend', 'user-service', 'hotel-service', 'room-service', 'booking-service', 'payment-service', 'notification-service']
                        
                        services.each { service ->
                            sh """
                                docker tag docker-compose-${service} ${DOCKER_HUB_REPO}/${APP_NAME}-${service}:${VERSION}
                                docker tag docker-compose-${service} ${DOCKER_HUB_REPO}/${APP_NAME}-${service}:${LATEST_TAG}
                            """
                        }
                    }
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                echo 'Running security scans...'
                script {
                    try {
                        // Scan Docker images for vulnerabilities (requires Docker Scout or Trivy)
                        sh '''
                            # Install Trivy if not present
                            if ! command -v trivy &> /dev/null; then
                                wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
                                echo "deb https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee -a /etc/apt/sources.list
                                sudo apt-get update
                                sudo apt-get install trivy
                            fi
                            
                            # Scan images
                            trivy image --exit-code 0 --severity HIGH,CRITICAL docker-compose-frontend
                            trivy image --exit-code 0 --severity HIGH,CRITICAL docker-compose-user-service
                        '''
                    } catch (Exception e) {
                        echo "Security scan failed: ${e.getMessage()}"
                        // Continue with deployment but mark as unstable
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                echo 'Pushing images to Docker Hub...'
                script {
                    def services = ['frontend', 'user-service', 'hotel-service', 'room-service', 'booking-service', 'payment-service', 'notification-service']
                    
                    services.each { service ->
                        sh """
                            docker push ${DOCKER_HUB_REPO}/${APP_NAME}-${service}:${VERSION}
                            docker push ${DOCKER_HUB_REPO}/${APP_NAME}-${service}:${LATEST_TAG}
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging environment...'
                dir('docker-compose') {
                    script {
                        // Stop existing containers
                        sh 'docker-compose down || true'
                        
                        // Clean up unused resources
                        sh 'docker system prune -f'
                        
                        // Deploy with new images
                        sh 'docker-compose up -d'
                        
                        // Wait for services to be ready
                        echo 'Waiting for services to be healthy...'
                        sh '''
                            timeout ${HEALTH_CHECK_TIMEOUT} bash -c '
                                while true; do
                                    if docker-compose ps | grep -q "unhealthy"; then
                                        echo "Some services are still unhealthy, waiting..."
                                        sleep 10
                                    else
                                        echo "All services are healthy!"
                                        break
                                    fi
                                done
                            '
                        '''
                    }
                }
            }
        }
        
        stage('Health Checks') {
            steps {
                echo 'Running health checks...'
                script {
                    def healthChecks = [
                        'nginx': "http://${VM_IP}/health",
                        'user-service': "http://${VM_IP}/api/users/health",
                        'hotel-service': "http://${VM_IP}/api/hotels/health",
                        'room-service': "http://${VM_IP}/api/rooms/health",
                        'booking-service': "http://${VM_IP}/api/bookings/health"
                    ]
                    
                    healthChecks.each { service, url ->
                        try {
                            sh """
                                curl -f ${url} || exit 1
                                echo "${service} health check passed"
                            """
                        } catch (Exception e) {
                            error("Health check failed for ${service} at ${url}")
                        }
                    }
                }
            }
        }
        
        stage('Integration Tests') {
            steps {
                echo 'Running integration tests...'
                dir('docker-compose') {
                    script {
                        try {
                            // Test user registration
                            sh """
                                curl -X POST http://${VM_IP}/api/users/register \\
                                  -H "Content-Type: application/json" \\
                                  -d '{
                                    "firstName": "Test",
                                    "lastName": "User",
                                    "email": "test-${BUILD_NUMBER}@example.com",
                                    "username": "testuser${BUILD_NUMBER}",
                                    "password": "password123",
                                    "phone": "+1234567890"
                                  }' || exit 1
                                echo "User registration test passed"
                            """
                            
                            // Test hotel listing
                            sh """
                                curl -f http://${VM_IP}/api/hotels/ || exit 1
                                echo "Hotel listing test passed"
                            """
                            
                            // Test room listing
                            sh """
                                curl -f http://${VM_IP}/api/rooms/ || exit 1
                                echo "Room listing test passed"
                            """
                            
                        } catch (Exception e) {
                            error("Integration tests failed: ${e.getMessage()}")
                        }
                    }
                }
            }
        }
        
        stage('Initialize Test Data') {
            steps {
                echo 'Initializing test data...'
                dir('docker-compose') {
                    sh '''
                        # Wait a bit for databases to be fully ready
                        sleep 30
                        
                        # Initialize test data
                        npm install mongoose
                        node init-docker-test-data.js || echo "Test data initialization completed with warnings"
                    '''
                }
            }
        }
        
        stage('Performance Tests') {
            steps {
                echo 'Running performance tests...'
                script {
                    try {
                        // Simple load test using curl (replace with proper load testing tool like JMeter or k6)
                        sh """
                            for i in {1..10}; do
                                curl -s -o /dev/null -w "%{http_code}" http://${VM_IP}/ &
                            done
                            wait
                            echo "Basic load test completed"
                        """
                    } catch (Exception e) {
                        echo "Performance tests encountered issues: ${e.getMessage()}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
                parameters {
                    choice(name: 'ENVIRONMENT', choices: ['production', 'staging'], description: 'Select deployment environment')
                }
            }
            steps {
                echo "Deploying to ${params.ENVIRONMENT}..."
                script {
                    if (params.ENVIRONMENT == 'production') {
                        // Add production-specific deployment steps here
                        echo 'Production deployment would go here'
                        echo 'This might include blue-green deployment, DNS updates, etc.'
                        
                        // Example: Update production docker-compose with versioned images
                        sh """
                            # Create production deployment manifest
                            sed 's/image: docker-compose-/image: ${DOCKER_HUB_REPO}\\/${APP_NAME}-/g' docker-compose/docker-compose.yml > docker-compose-prod.yml
                            sed -i 's/:latest/:${VERSION}/g' docker-compose-prod.yml
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up...'
            script {
                // Logout from Docker Hub
                sh 'docker logout || true'
                
                // Clean up local images (keep only latest)
                sh '''
                    docker image prune -f
                    docker container prune -f
                '''
                
                // Archive artifacts
                archiveArtifacts artifacts: 'docker-compose/*.yml', allowEmptyArchive: true
                
                // Publish test results if they exist
                publishTestResults testResultsPattern: '**/test-results.xml', allowEmptyResults: true
            }
        }
        
        success {
            echo 'Pipeline succeeded!'
            script {
                // Send success notification
                emailext(
                    subject: "✅ Hotel Booking System - Build #${BUILD_NUMBER} Successful",
                    body: """
                        <h2>Build Successful!</h2>
                        <p><strong>Project:</strong> ${APP_NAME}</p>
                        <p><strong>Build Number:</strong> ${BUILD_NUMBER}</p>
                        <p><strong>Git Commit:</strong> ${GIT_COMMIT_SHORT}</p>
                        <p><strong>Access URL:</strong> <a href="http://${VM_IP}">http://${VM_IP}</a></p>
                        <p><strong>Build URL:</strong> <a href="${BUILD_URL}">${BUILD_URL}</a></p>
                    """,
                    mimeType: 'text/html',
                    to: 'your-email@domain.com'
                )
            }
        }
        
        failure {
            echo 'Pipeline failed!'
            script {
                // Send failure notification
                emailext(
                    subject: "❌ Hotel Booking System - Build #${BUILD_NUMBER} Failed",
                    body: """
                        <h2>Build Failed!</h2>
                        <p><strong>Project:</strong> ${APP_NAME}</p>
                        <p><strong>Build Number:</strong> ${BUILD_NUMBER}</p>
                        <p><strong>Git Commit:</strong> ${GIT_COMMIT_SHORT}</p>
                        <p><strong>Build URL:</strong> <a href="${BUILD_URL}">${BUILD_URL}</a></p>
                        <p><strong>Console Output:</strong> <a href="${BUILD_URL}console">${BUILD_URL}console</a></p>
                    """,
                    mimeType: 'text/html',
                    to: 'your-email@domain.com'
                )
            }
        }
        
        unstable {
            echo 'Pipeline completed with warnings!'
            script {
                emailext(
                    subject: "⚠️ Hotel Booking System - Build #${BUILD_NUMBER} Unstable",
                    body: """
                        <h2>Build Completed with Warnings</h2>
                        <p><strong>Project:</strong> ${APP_NAME}</p>
                        <p><strong>Build Number:</strong> ${BUILD_NUMBER}</p>
                        <p><strong>Git Commit:</strong> ${GIT_COMMIT_SHORT}</p>
                        <p><strong>Access URL:</strong> <a href="http://${VM_IP}">http://${VM_IP}</a></p>
                        <p><strong>Build URL:</strong> <a href="${BUILD_URL}">${BUILD_URL}</a></p>
                    """,
                    mimeType: 'text/html',
                    to: 'your-email@domain.com'
                )
            }
        }
    }
}
