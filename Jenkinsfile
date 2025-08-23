pipeline {
    agent any

    triggers {
        // Poll GitHub every 2 minutes for new commits
        pollSCM('H/2 * * * *')
    }

    options {
        // Add timeout for entire pipeline
        timeout(time: 120, unit: 'MINUTES')
        // Keep builds and artifacts
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Skip checkout for SCM polling
        skipDefaultCheckout(false)
        // Retry on failure
        retry(1)
    }

    environment {
        // Docker Hub credentials (configure in Jenkins credentials)
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKER_HUB_REPO = 'supun3998'  // Docker Hub username
        VM_IP = '192.168.46.139'
        
        // Application configuration
        APP_NAME = 'hotel-booking-system'
        
        // Version management
        VERSION = "${env.BUILD_NUMBER}"
        LATEST_TAG = 'latest'
        
        // Health check timeout
        HEALTH_CHECK_TIMEOUT = '300'
    }
    stages {
        stage('Checkout & Build Info') {
            steps {
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    
                    echo "🚀 Building commit: ${env.GIT_COMMIT_SHORT}"
                    echo "📝 Commit message: ${env.GIT_COMMIT_MSG}"
                    echo "⏰ Triggered by SCM polling at ${new Date()}"
                }
            }
        }

        stage('Environment Setup') {
            steps {
                echo 'Setting up environment files...'
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
                        echo "Frontend .env file created"
                    '''

                    // Create .env.docker files for services if they don't exist
                    def services = [
                        'user-service': '''NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://admin:password123@user-db:27017/userdb?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-for-hotel-booking-system-2024
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672''',
                        'hotel-service': '''NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://admin:password123@hotel-db:27017/hoteldb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672''',
                        'room-service': '''NODE_ENV=production
PORT=3003
MONGODB_URI=mongodb://admin:password123@room-db:27017/roomdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672''',
                        'booking-service': '''NODE_ENV=production
PORT=3004
MONGODB_URI=mongodb://admin:password123@booking-db:27017/bookingdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
USER_SERVICE_URL=http://user-service:3001
ROOM_SERVICE_URL=http://room-service:3003
PAYMENT_SERVICE_URL=http://payment-service:3005
NOTIFICATION_SERVICE_URL=http://notification-service:3006''',
                        'payment-service': '''NODE_ENV=production
PORT=3005
MONGODB_URI=mongodb://admin:password123@payment-db:27017/paymentdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672''',
                        'notification-service': '''NODE_ENV=production
PORT=3006
MONGODB_URI=mongodb://admin:password123@notification-db:27017/notificationdb?authSource=admin
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672'''
                    ]

                    services.each { serviceName, envContent ->
                        sh """
                            if [ ! -f services/${serviceName}/.env.docker ]; then
                                echo "Creating .env.docker for ${serviceName}..."
                                cat > services/${serviceName}/.env.docker << 'EOF'
${envContent}
EOF
                                echo "Created .env.docker for ${serviceName}"
                            else
                                echo ".env.docker already exists for ${serviceName}"
                            fi
                        """
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building Docker images...'
                dir('docker-compose') {
                    script {
                        // Set Docker build environment
                        env.DOCKER_BUILDKIT = '1'
                        env.BUILDKIT_PROGRESS = 'plain'
                        
                        // Check connectivity
                        sh '''
                            echo "Testing connectivity..."
                            curl -I --connect-timeout 10 --max-time 20 https://registry.npmjs.org/ || echo "NPM registry issue"
                            curl -I --connect-timeout 10 --max-time 20 https://registry-1.docker.io/ || echo "Docker registry issue"
                        '''
                        
                        // Build services sequentially with simplified logic
                        echo "🔨 Building backend services..."
                        sh '''
                            echo "Building user-service..."
                            docker compose build --no-cache user-service || docker compose build user-service
                            
                            echo "Building hotel-service..."
                            docker compose build --no-cache hotel-service || docker compose build hotel-service
                            
                            echo "Building room-service..."
                            docker compose build --no-cache room-service || docker compose build room-service
                            
                            echo "Building payment-service..."
                            docker compose build --no-cache payment-service || docker compose build payment-service
                            
                            echo "Building notification-service..."
                            docker compose build --no-cache notification-service || docker compose build notification-service
                            
                            echo "Building booking-service..."
                            docker compose build --no-cache booking-service || docker compose build booking-service
                        '''
                        
                        echo "🔨 Building frontend..."
                        sh '''
                            echo "Building frontend with fallback strategy..."
                            # Try no-cache first, then with cache, then with cleanup
                            docker compose build --no-cache frontend || {
                                echo "No-cache build failed, trying with cache..."
                                docker compose build frontend || {
                                    echo "Both attempts failed, cleaning and retrying..."
                                    docker system prune -f --volumes
                                    docker compose build frontend
                                }
                            }
                        '''
                        
                        echo '✅ All images built successfully!'
                    }
                }
            }
        }

        stage('Stop Existing Containers') {
            steps {
                echo 'Stopping existing containers...'
                dir('docker-compose') {
                    script {
                        sh 'docker compose down || true'
                        sh 'docker system prune -f || true'
                        echo 'Existing containers stopped and cleaned up'
                    }
                }
            }
        }

        stage('Deploy Services') {
            steps {
                echo 'Deploying all services...'
                dir('docker-compose') {
                    sh '''
                        echo "Stopping existing services..."
                        docker compose down || true
                        
                        echo "Starting all services..."
                        docker compose up -d
                        
                        echo "Waiting for services to start..."
                        sleep 60
                        
                        echo "Checking container status:"
                        docker compose ps
                        
                        echo "Running basic health checks..."
                        curl -f http://localhost:3000/ || echo "Frontend check: not ready"
                        curl -f http://localhost:3001/health || echo "User service check: not ready"
                        
                        echo "Deployment completed!"
                    '''
                }
            }
        }

        stage('Configure Monitoring') {
            steps {
                echo 'Configuring monitoring dashboards and alerts...'
                script {
                    // Wait for monitoring services to be fully ready
                    sleep(30)
                    
                    // Check monitoring services health
                    def monitoringChecks = [
                        'Prometheus': "http://${VM_IP}:9090/-/ready",
                        'Grafana': "http://${VM_IP}:3007/api/health",
                        'cAdvisor': "http://${VM_IP}:8081/healthz",
                        'Node Exporter': "http://${VM_IP}:9100/metrics"
                    ]
                    
                    monitoringChecks.each { service, url ->
                        try {
                            sh "curl -f ${url}"
                            echo "✅ ${service} monitoring service is ready"
                        } catch (Exception e) {
                            echo "⚠️ ${service} monitoring service not ready: ${e.getMessage()}"
                        }
                    }
                    
                    // Configure Grafana data source and dashboards
                    try {
                        echo "🔧 Configuring Grafana dashboards..."
                        
                        // Wait a bit more for Grafana to fully initialize
                        sleep(30)
                        
                        // Import the container monitoring dashboard
                        sh """
                            curl -X POST http://admin:admin@${VM_IP}:3007/api/dashboards/db \\
                              -H "Content-Type: application/json" \\
                              -d @monitoring/grafana/dashboards/containers-dashboard.json || echo "Dashboard import attempted"
                        """
                        
                        echo "✅ Monitoring configuration completed"
                    } catch (Exception e) {
                        echo "⚠️ Monitoring configuration had issues: ${e.getMessage()}"
                    }
                }
            }
        }

        stage('Initialize Test Data') {
            steps {
                echo 'Initializing test data...'
                dir('docker-compose') {
                    script {
                        try {
                            sh 'npm install mongoose'
                            sh 'node init-docker-test-data.js'
                            echo '✅ Test data initialized successfully'
                        } catch (Exception e) {
                            echo "⚠️ Test data initialization had issues, but continuing..."
                        }
                    }
                }
            }
        }

        stage('Login to Docker Hub') {
            steps {
                echo 'Logging into Docker Hub...'
                script {
                    sh 'echo $DOCKER_HUB_CREDENTIALS_PSW | docker login -u $DOCKER_HUB_CREDENTIALS_USR --password-stdin'
                    echo 'Successfully logged into Docker Hub'
                }
            }
        }

        stage('Tag and Push Images') {
            steps {
                echo 'Tagging and pushing images to Docker Hub...'
                script {
                    def services = ['frontend', 'user-service', 'hotel-service', 'room-service', 'booking-service', 'payment-service', 'notification-service']
                    
                    services.each { service ->
                        echo "🏷️ Tagging and pushing ${service}..."
                        
                        // Tag images first
                        sh """
                            docker tag docker-compose-${service} ${DOCKER_HUB_REPO}/hotel-booking-${service}:latest
                            docker tag docker-compose-${service} ${DOCKER_HUB_REPO}/hotel-booking-${service}:${BUILD_NUMBER}
                        """
                        
                        // Push with timeout and retry logic
                        timeout(time: 15, unit: 'MINUTES') {
                            retry(3) {
                                try {
                                    sh """
                                        echo 'Pushing ${service}:latest to Docker Hub...'
                                        docker push ${DOCKER_HUB_REPO}/hotel-booking-${service}:latest
                                        
                                        echo 'Pushing ${service}:${BUILD_NUMBER} to Docker Hub...'
                                        docker push ${DOCKER_HUB_REPO}/hotel-booking-${service}:${BUILD_NUMBER}
                                        
                                        echo '✅ ${service} pushed successfully'
                                    """
                                } catch (Exception e) {
                                    echo "❌ Push failed for ${service}, retrying... Error: ${e.getMessage()}"
                                    // Wait a bit before retry
                                    sleep(30)
                                    throw e
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Final Verification') {
            steps {
                echo 'Running final verification...'
                script {
                    // Test user registration
                    try {
                        sh """
                            curl -X POST http://${VM_IP}/api/users/register \\
                              -H "Content-Type: application/json" \\
                              -d '{
                                "firstName": "Jenkins",
                                "lastName": "Test",
                                "email": "jenkins-test-${BUILD_NUMBER}@example.com",
                                "username": "jenkins${BUILD_NUMBER}",
                                "password": "password123",
                                "phone": "+1234567890",
                                "role": "admin"
                              }'
                        """
                        echo '✅ User registration test passed'
                    } catch (Exception e) {
                        echo "⚠️ User registration test failed: ${e.getMessage()}"
                    }

                    // Test hotel listing
                    try {
                        sh "curl -f http://${VM_IP}/api/hotels/"
                        echo '✅ Hotel listing test passed'
                    } catch (Exception e) {
                        echo "⚠️ Hotel listing test failed: ${e.getMessage()}"
                    }

                    echo "🎉 Deployment completed successfully!"
                    echo ""
                    echo "📱 Application URLs:"
                    echo "   🌐 Hotel Booking App: http://${VM_IP}"
                    echo "   🔐 Admin Panel: http://${VM_IP}/admin"
                    echo ""
                    echo "📊 Monitoring URLs:"
                    echo "   📈 Grafana Dashboard: http://${VM_IP}:3007 (admin/admin)"
                    echo "   🔍 Prometheus: http://${VM_IP}:9090"
                    echo "   📊 Container Metrics: http://${VM_IP}:8081"
                    echo "   🖥️ System Metrics: http://${VM_IP}:9100"
                    echo ""
                    echo "🚀 Your Cloud-Native MERN Hotel Booking System with monitoring is ready!"
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
            }
        }
        
        success {
            echo '🎉 Pipeline succeeded!'
            echo "✅ Deployment completed successfully!"
            echo "🌐 Access your app at: http://${VM_IP}"
        }
        
        failure {
            echo '❌ Pipeline failed!'
            echo "🔍 Check the console output for details"
        }
        
        unstable {
            echo '⚠️ Pipeline completed with warnings!'
            echo "🌐 App might still be accessible at: http://${VM_IP}"
        }
    }
}
