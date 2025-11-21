#!/bin/bash

# SpeedFlux Deployment Script
# This script automates the deployment of both frontend and backend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_DIR="backend"
FRONTEND_DIR="."

echo -e "${GREEN}=== SpeedFlux Deployment Script ===${NC}\n"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}Killing process on port $port...${NC}"
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Check prerequisites
echo -e "${GREEN}Checking prerequisites...${NC}"

if ! command -v go &> /dev/null; then
    echo -e "${RED}Error: Go is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}\n"

# Check and free ports
echo -e "${GREEN}Checking ports...${NC}"

if check_port $BACKEND_PORT; then
    echo -e "${YELLOW}Port $BACKEND_PORT is in use${NC}"
    read -p "Kill process on port $BACKEND_PORT? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port $BACKEND_PORT
    else
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

if check_port $FRONTEND_PORT; then
    echo -e "${YELLOW}Port $FRONTEND_PORT is in use${NC}"
    read -p "Kill process on port $FRONTEND_PORT? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port $FRONTEND_PORT
    else
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Ports available${NC}\n"

# Build backend
echo -e "${GREEN}Building backend...${NC}"
cd $BACKEND_DIR

# Download dependencies
echo "Downloading Go dependencies..."
go mod download

# Build binary
echo "Building Go binary..."
go build -o ../bin/nova-speed-backend ./main.go

if [ ! -f "../bin/nova-speed-backend" ]; then
    echo -e "${RED}Error: Backend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend built successfully${NC}\n"
cd ..

# Build frontend
echo -e "${GREEN}Building frontend...${NC}"
cd $FRONTEND_DIR

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Build frontend
echo "Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend built successfully${NC}\n"

# Ask for deployment mode
echo -e "${GREEN}Deployment mode:${NC}"
echo "1) Development (run both servers)"
echo "2) Production (build only, no servers)"
read -p "Choose option (1/2): " -n 1 -r
echo

if [[ $REPLY =~ ^[1]$ ]]; then
    # Development mode
    echo -e "${GREEN}Starting development servers...${NC}"
    
    # Start backend
    echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
    PORT=$BACKEND_PORT ./bin/nova-speed-backend > backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    # Wait for backend to start
    sleep 2
    
    # Check if backend is running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Error: Backend failed to start${NC}"
        cat backend.log
        exit 1
    fi
    
    # Test backend health
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        echo -e "${GREEN}✓ Backend is running${NC}"
    else
        echo -e "${RED}Error: Backend health check failed${NC}"
        cat backend.log
        exit 1
    fi
    
    # Start frontend dev server
    echo -e "${YELLOW}Starting frontend dev server on port $FRONTEND_PORT...${NC}"
    npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    
    sleep 3
    
    echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
    echo -e "${GREEN}Backend:${NC} http://localhost:$BACKEND_PORT"
    echo -e "${GREEN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${GREEN}Health Check:${NC} http://localhost:$BACKEND_PORT/health"
    echo -e "\n${YELLOW}Logs:${NC}"
    echo "  Backend: tail -f backend.log"
    echo "  Frontend: tail -f frontend.log"
    echo -e "\n${YELLOW}To stop servers:${NC}"
    echo "  kill $BACKEND_PID $FRONTEND_PID"
    
elif [[ $REPLY =~ ^[2]$ ]]; then
    # Production mode
    echo -e "${GREEN}=== Production Build Complete ===${NC}"
    echo -e "${GREEN}Backend binary:${NC} ./bin/nova-speed-backend"
    echo -e "${GREEN}Frontend build:${NC} ./dist/"
    echo -e "\n${YELLOW}To run backend:${NC}"
    echo "  PORT=$BACKEND_PORT ./bin/nova-speed-backend"
    echo -e "\n${YELLOW}To serve frontend:${NC}"
    echo "  npx serve -s dist -l $FRONTEND_PORT"
    echo "  # or use any static file server"
else
    echo -e "${RED}Invalid option${NC}"
    exit 1
fi

echo -e "\n${GREEN}Done!${NC}"

