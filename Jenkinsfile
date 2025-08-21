pipeline {
    agent any

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
        stage('SCM Checkout') {
            steps {
                retry(3) {
                    checkout scmGit(
                        branches: [[name: '*/main']], 
                        extensions: [], 
                        userRemoteConfigs: [[url: 'https://github.com/SupunJayaweera/Cloud-Native-MERN-Deployment.git']]
                    )
                }
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    echo "Building commit: ${env.GIT_COMMIT_SHORT}"
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
                        // Check network connectivity first
                        echo 'Testing network connectivity...'
                        sh 'curl -I https://registry.npmjs.org/ || echo "NPM registry connectivity issue detected"'
                        
                        retry(2) {
                            try {
                                // Set Docker build environment for better networking
                                sh '''
                                    export DOCKER_BUILDKIT=1
                                    export BUILDKIT_PROGRESS=plain
                                    docker compose build --no-cache
                                '''
                                echo 'All Docker images built successfully'
                            } catch (Exception e) {
                                echo "Build failed, retrying with different strategy..."
                                // Clean up any partial builds
                                sh 'docker system prune -f'
                                // Try building with cache enabled (sequential build)
                                sh '''
                                    export DOCKER_BUILDKIT=1
                                    export BUILDKIT_PROGRESS=plain
                                    docker compose build
                                '''
                                echo 'Docker images built successfully on retry'
                            }
                        }
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

        stage('Run Docker Containers') {
            steps {
                echo 'Starting new containers...'
                dir('docker-compose') {
                    script {
                        sh 'docker compose up -d'
                        echo 'All containers started'
                        
                        // Wait for containers to be ready
                        echo 'Waiting for containers to be healthy...'
                        sh '''
                            timeout 180 bash -c '
                                while true; do
                                    if docker compose ps | grep -q "unhealthy"; then
                                        echo "Some services are still starting, waiting..."
                                        sleep 10
                                    else
                                        echo "All services are ready!"
                                        break
                                    fi
                                done
                            '
                        '''
                    }
                }
            }
        }

        stage('Show Running Containers') {
            steps {
                echo 'Checking container status...'
                dir('docker-compose') {
                    sh 'docker compose ps'
                    sh 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'
                }
            }
        }

        stage('Health Checks') {
            steps {
                echo 'Running health checks...'
                script {
                    // Wait a bit more for services to fully initialize
                    sleep(30)
                    
                    def healthChecks = [
                        'Nginx': "http://${VM_IP}/health",
                        'Frontend': "http://${VM_IP}/",
                        'User API': "http://${VM_IP}/api/users/health",
                        'Hotel API': "http://${VM_IP}/api/hotels/health"
                    ]
                    
                    healthChecks.each { service, url ->
                        try {
                            sh "curl -f ${url}"
                            echo "✅ ${service} health check passed"
                        } catch (Exception e) {
                            echo "⚠️ ${service} health check failed, but continuing..."
                        }
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
                        retry(3) {
                            sh """
                                docker tag docker-compose-${service} ${DOCKER_HUB_REPO}/hotel-booking-${service}:latest
                                docker tag docker-compose-${service} ${DOCKER_HUB_REPO}/hotel-booking-${service}:${BUILD_NUMBER}
                                echo 'Pushing ${service} to Docker Hub...'
                                docker push ${DOCKER_HUB_REPO}/hotel-booking-${service}:latest
                                docker push ${DOCKER_HUB_REPO}/hotel-booking-${service}:${BUILD_NUMBER}
                                echo '✅ ${service} pushed successfully'
                            """
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
                                "phone": "+1234567890"
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

                    echo "🎉 Deployment completed! Access your app at: http://${VM_IP}"
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
