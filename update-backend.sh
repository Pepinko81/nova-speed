#!/bin/bash

# Script to safely update backend binary

set -e

BINARY_PATH="/opt/speedflux/nova-speed-backend"
SERVICE_NAME="speedflux-backend"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEW_BINARY="$PROJECT_ROOT/bin/nova-speed-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Updating SpeedFlux Backend ===${NC}"
echo ""

# Check if new binary exists
if [ ! -f "$NEW_BINARY" ]; then
    echo -e "${RED}Error: New binary not found at $NEW_BINARY${NC}"
    echo "Please build the backend first:"
    echo "  cd backend && go build -o ../bin/nova-speed-backend ./main.go"
    exit 1
fi

# Check if service is running
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${YELLOW}Stopping $SERVICE_NAME...${NC}"
    sudo systemctl stop "$SERVICE_NAME"
    sleep 2
fi

# Backup old binary
if [ -f "$BINARY_PATH" ]; then
    echo -e "${YELLOW}Backing up old binary...${NC}"
    sudo cp "$BINARY_PATH" "${BINARY_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copy new binary
echo -e "${YELLOW}Installing new binary...${NC}"
sudo cp "$NEW_BINARY" "$BINARY_PATH"
sudo chmod +x "$BINARY_PATH"

# Start service
echo -e "${YELLOW}Starting $SERVICE_NAME...${NC}"
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 2

# Check if service started successfully
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✓ Backend updated and started successfully${NC}"
    echo ""
    echo "Service status:"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
else
    echo -e "${RED}✗ Failed to start $SERVICE_NAME${NC}"
    echo ""
    echo "Check logs:"
    echo "  sudo journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi

