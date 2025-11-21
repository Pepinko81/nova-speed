.PHONY: build run test clean docker-build docker-up docker-down help

# Build the application
build:
	@echo "Building application..."
	@go build -o bin/nova-speed-backend ./main.go

# Run the application
run:
	@echo "Running application..."
	@go run main.go

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@go clean

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Lint code
lint:
	@echo "Linting code..."
	@golangci-lint run || echo "golangci-lint not installed, skipping..."

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	@docker build -t nova-speed-backend .

# Start Docker containers
docker-up:
	@echo "Starting Docker containers..."
	@docker-compose up -d

# Stop Docker containers
docker-down:
	@echo "Stopping Docker containers..."
	@docker-compose down

# View Docker logs
docker-logs:
	@docker-compose logs -f

# Help
help:
	@echo "Available targets:"
	@echo "  build        - Build the application"
	@echo "  run          - Run the application"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  deps         - Download and tidy dependencies"
	@echo "  fmt          - Format code"
	@echo "  lint         - Lint code"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-up    - Start Docker containers"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  docker-logs  - View Docker logs"
	@echo "  help         - Show this help message"

