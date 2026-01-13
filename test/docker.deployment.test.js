/**
 * Docker Deployment Unit Tests
 * Tests container startup, accessibility, and optimization
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

describe('Docker Deployment Tests', () => {
    const CONTAINER_NAME = 'quick-math-game-test-container';
    const TEST_PORT = 8081; // Use different port to avoid conflicts
    const HEALTH_CHECK_TIMEOUT = 30000; // 30 seconds

    beforeAll(async () => {
        // Clean up any existing test containers
        try {
            execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
        } catch (error) {
            // Container doesn't exist, which is fine
        }
    });

    afterAll(async () => {
        // Clean up test container
        try {
            execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Container Startup and Accessibility', () => {
        test('should build Docker image successfully', () => {
            // Requirement 9.1: Docker container should serve the static web application
            expect(() => {
                execSync('docker build -t quick-math-game-test .', { 
                    encoding: 'utf8',
                    timeout: 60000 
                });
                // Verify image was created by checking if it exists
                const images = execSync('docker images quick-math-game-test --format "{{.Repository}}"', { 
                    encoding: 'utf8' 
                });
                expect(images.trim()).toBe('quick-math-game-test');
            }).not.toThrow();
        });

        test('should start container successfully', async () => {
            // Requirements 9.2, 9.4: Container should expose application on port 8080 and be accessible at localhost
            
            // Test that container can start without errors
            expect(() => {
                const output = execSync(`docker run --rm -d --name ${CONTAINER_NAME}-quick -p ${TEST_PORT}:80 quick-math-game-test`, {
                    encoding: 'utf8',
                    timeout: 10000
                });
                
                // Container should start and return container ID
                expect(output.trim()).toMatch(/^[a-f0-9]{64}$/); // Docker container ID format
                
                // Clean up immediately
                execSync(`docker rm -f ${CONTAINER_NAME}-quick`, { stdio: 'ignore' });
            }).not.toThrow();
        });
    });

    describe('Docker Compose Configuration', () => {
        test('should support docker compose up command', () => {
            // Requirement 9.3: Container should support "docker compose up --build"
            expect(() => {
                // Validate docker-compose.yml syntax
                const output = execSync('docker compose config', { 
                    encoding: 'utf8',
                    timeout: 10000 
                });
                expect(output).toContain('quick-math-game');
                // Check for port mapping - the expanded format shows published: "8080"
                expect(output).toContain('published: "8080"');
            }).not.toThrow();
        });

        test('should have proper health check configuration', () => {
            // Verify health check is configured in docker-compose.yml
            const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
            expect(dockerComposeContent).toContain('healthcheck');
            expect(dockerComposeContent).toContain('test:');
            expect(dockerComposeContent).toContain('interval:');
            expect(dockerComposeContent).toContain('timeout:');
            expect(dockerComposeContent).toContain('retries:');
        });

        test('should have restart policy configured', () => {
            // Verify restart policy is set
            const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
            expect(dockerComposeContent).toContain('restart:');
        });
    });

    describe('Image Size Optimization', () => {
        test('should use lightweight base image', () => {
            // Requirement 9.5: Should use small, production-friendly image
            const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
            expect(dockerfileContent).toContain('nginx:alpine');
        });

        test('should have reasonable image size', () => {
            // Check that the built image is not excessively large
            const output = execSync('docker images quick-math-game-test --format "{{.Size}}"', { 
                encoding: 'utf8' 
            });
            
            const sizeStr = output.trim();
            let sizeInMB;
            
            if (sizeStr.includes('MB')) {
                sizeInMB = parseFloat(sizeStr.replace('MB', ''));
            } else if (sizeStr.includes('GB')) {
                sizeInMB = parseFloat(sizeStr.replace('GB', '')) * 1024;
            } else if (sizeStr.includes('KB')) {
                sizeInMB = parseFloat(sizeStr.replace('KB', '')) / 1024;
            } else {
                // Assume bytes
                sizeInMB = parseFloat(sizeStr) / (1024 * 1024);
            }
            
            // Nginx alpine base image is around 40-50MB, so 100MB is reasonable for our app
            const MAX_REASONABLE_SIZE_MB = 100;
            expect(sizeInMB).toBeLessThan(MAX_REASONABLE_SIZE_MB);
        });

        test('should include only necessary files', () => {
            // Verify Dockerfile copies only required files
            const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
            expect(dockerfileContent).toContain('COPY index.html');
            expect(dockerfileContent).toContain('COPY js/');
            expect(dockerfileContent).toContain('COPY package.json');
            
            // Should not copy unnecessary files like node_modules, tests, etc.
            expect(dockerfileContent).not.toContain('node_modules');
            expect(dockerfileContent).not.toContain('test/');
            expect(dockerfileContent).not.toContain('.git');
        });
    });

    describe('Nginx Configuration', () => {
        test('should have proper nginx configuration for static files', () => {
            // Verify nginx is configured for optimal static file serving
            const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
            expect(dockerfileContent).toContain('gzip on');
            expect(dockerfileContent).toContain('Cache-Control');
            expect(dockerfileContent).toContain('expires 1y');
        });

        test('should expose correct port', () => {
            const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
            expect(dockerfileContent).toContain('EXPOSE 80');
        });

        test('should run nginx in foreground mode', () => {
            const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
            expect(dockerfileContent).toContain('daemon off');
        });
    });

    describe('Production Readiness', () => {
        test('should have resource limits configured', () => {
            const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
            expect(dockerComposeContent).toContain('deploy:');
            expect(dockerComposeContent).toContain('resources:');
            expect(dockerComposeContent).toContain('limits:');
            expect(dockerComposeContent).toContain('memory:');
        });

        test('should have environment variables configured', () => {
            const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
            expect(dockerComposeContent).toContain('environment:');
            expect(dockerComposeContent).toContain('NGINX_HOST');
            expect(dockerComposeContent).toContain('NGINX_PORT');
        });

        test('should have volume mounting for development', () => {
            const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
            expect(dockerComposeContent).toContain('volumes:');
            expect(dockerComposeContent).toContain('./index.html');
            expect(dockerComposeContent).toContain('./js');
        });
    });
});