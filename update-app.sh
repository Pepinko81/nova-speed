#!/bin/bash

###############################################################################
# SpeedFlux Auto-Update Script
# 
# This script automatically updates the SpeedFlux application by:
# 1. Pulling latest changes from GitHub
# 2. Building backend
# 3. Building frontend
# 4. Installing files to production locations
# 5. Restarting services
#
# NOTE: This script does NOT modify nginx or SSL configurations
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"
BACKEND_BINARY="$PROJECT_ROOT/bin/nova-speed-backend"
BACKEND_INSTALL_DIR="/opt/speedflux"
FRONTEND_INSTALL_DIR="/var/www/speedflux"
SERVICE_NAME="speedflux-backend"
GIT_BRANCH="${GIT_BRANCH:-main}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running as root or with sudo
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root. Some commands may need to be run as regular user."
        RUN_AS_ROOT=true
    else
        RUN_AS_ROOT=false
    fi
    
    # Check Go
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed"
        exit 1
    fi
    log_success "Go found: $(go version | awk '{print $3}')"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm found: $(npm --version)"
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    log_success "git found: $(git --version | awk '{print $3}')"
    
        # Check if we're in a git repository
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        log_error "Not a git repository: $PROJECT_ROOT"
        exit 1
    fi
    
    # Check if systemd is available
    if ! command -v systemctl &> /dev/null; then
        log_warning "systemctl not found. Service management may not work."
    fi
}

pull_from_github() {
    log_info "Pulling latest changes from GitHub (branch: $GIT_BRANCH)..."
    
    cd "$PROJECT_ROOT"
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_warning "You have uncommitted changes. Stashing them..."
        git stash push -m "Auto-stash before update $(date +%Y-%m-%d_%H-%M-%S)"
    fi
    
    # Fetch latest changes
    git fetch origin "$GIT_BRANCH" || {
        log_error "Failed to fetch from GitHub"
        exit 1
    }
    
    # Check if there are updates
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    BASE=$(git merge-base @ @{u})
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        log_success "Already up to date with origin/$GIT_BRANCH"
        return 1  # No updates
    elif [ "$LOCAL" = "$BASE" ]; then
        log_info "New updates available. Pulling..."
        git pull origin "$GIT_BRANCH" || {
            log_error "Failed to pull from GitHub"
            exit 1
        }
        log_success "Successfully pulled latest changes"
        return 0  # Updates available
    else
        log_warning "Local branch has diverged from remote. Attempting to merge..."
        git pull origin "$GIT_BRANCH" --no-rebase || {
            log_error "Failed to merge changes. Please resolve conflicts manually."
            exit 1
        }
        return 0  # Updates available
    fi
}

build_backend() {
    log_info "Building backend..."
    
    cd "$BACKEND_DIR"
    
    # Download dependencies
    log_info "Downloading Go dependencies..."
    go mod download || {
        log_error "Failed to download Go dependencies"
        exit 1
    }
    
    # Build binary
    log_info "Building Go binary..."
    mkdir -p "$PROJECT_ROOT/bin"
    
    # Ensure PATH includes Go binary location
    if [ -d "/usr/local/go/bin" ]; then
        export PATH="$PATH:/usr/local/go/bin"
    fi
    
    if [ "$RUN_AS_ROOT" = true ]; then
        # If running as root, find the original user
        ORIGINAL_USER="${SUDO_USER:-$USER}"
        if [ -n "$ORIGINAL_USER" ] && [ "$ORIGINAL_USER" != "root" ]; then
            # Get original user's PATH and add Go if needed
            ORIGINAL_PATH=$(sudo -u "$ORIGINAL_USER" bash -c 'echo $PATH')
            if [ -d "/usr/local/go/bin" ]; then
                ORIGINAL_PATH="$ORIGINAL_PATH:/usr/local/go/bin"
            fi
            sudo -u "$ORIGINAL_USER" env PATH="$ORIGINAL_PATH" go build -o "$BACKEND_BINARY" ./main.go || {
                log_error "Failed to build backend"
                exit 1
            }
        else
            go build -o "$BACKEND_BINARY" ./main.go || {
                log_error "Failed to build backend"
                exit 1
            }
        fi
    else
        go build -o "$BACKEND_BINARY" ./main.go || {
            log_error "Failed to build backend"
            exit 1
        }
    fi
    
    if [ ! -f "$BACKEND_BINARY" ]; then
        log_error "Backend binary not found after build: $BACKEND_BINARY"
        exit 1
    fi
    
    log_success "Backend built successfully: $BACKEND_BINARY"
}

build_frontend() {
    log_info "Building frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies (if needed)
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install || {
            log_error "Failed to install npm dependencies"
            exit 1
        }
    fi
    
    # Build frontend
    log_info "Building frontend for production..."
    npm run build || {
        log_error "Failed to build frontend"
        exit 1
    }
    
    if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
        log_error "Frontend build directory is empty or missing"
        exit 1
    fi
    
    log_success "Frontend built successfully"
}

install_backend() {
    log_info "Installing backend to $BACKEND_INSTALL_DIR..."
    
    # Stop service if running
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        log_info "Stopping $SERVICE_NAME service..."
        sudo systemctl stop "$SERVICE_NAME" || {
            log_warning "Failed to stop service, continuing anyway..."
        }
    fi
    
    # Create install directory
    sudo mkdir -p "$BACKEND_INSTALL_DIR"
    
    # Copy binary
    log_info "Copying backend binary..."
    sudo cp "$BACKEND_BINARY" "$BACKEND_INSTALL_DIR/nova-speed-backend" || {
        log_error "Failed to copy backend binary"
        exit 1
    }
    
    # Set permissions
    sudo chmod +x "$BACKEND_INSTALL_DIR/nova-speed-backend"
    sudo chown root:root "$BACKEND_INSTALL_DIR/nova-speed-backend"
    
    log_success "Backend installed to $BACKEND_INSTALL_DIR"
    
    # Restart service
    log_info "Starting $SERVICE_NAME service..."
    sudo systemctl daemon-reload
    sudo systemctl start "$SERVICE_NAME" || {
        log_error "Failed to start service"
        exit 1
    }
    
    # Wait a moment and check status
    sleep 2
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Service started successfully"
    else
        log_error "Service failed to start. Check logs: sudo journalctl -u $SERVICE_NAME -n 50"
        exit 1
    fi
}

install_frontend() {
    log_info "Installing frontend to $FRONTEND_INSTALL_DIR..."
    
    # Create install directory
    sudo mkdir -p "$FRONTEND_INSTALL_DIR"
    
    # Copy frontend files
    log_info "Copying frontend files..."
    sudo rm -rf "$FRONTEND_INSTALL_DIR"/*
    sudo cp -r "$FRONTEND_DIR/dist"/* "$FRONTEND_INSTALL_DIR/" || {
        log_error "Failed to copy frontend files"
        exit 1
    }
    
    # Set permissions
    sudo chown -R www-data:www-data "$FRONTEND_INSTALL_DIR"
    sudo find "$FRONTEND_INSTALL_DIR" -type d -exec chmod 755 {} \;
    sudo find "$FRONTEND_INSTALL_DIR" -type f -exec chmod 644 {} \;
    
    log_success "Frontend installed to $FRONTEND_INSTALL_DIR"
}

verify_installation() {
    log_info "Verifying installation..."
    
    # Check backend service
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Backend service is running"
    else
        log_error "Backend service is not running"
        return 1
    fi
    
    # Check backend health
    sleep 1
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed (service may still be starting)"
    fi
    
    # Check frontend files
    if [ -f "$FRONTEND_INSTALL_DIR/index.html" ]; then
        log_success "Frontend files installed"
    else
        log_error "Frontend index.html not found"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  SpeedFlux Auto-Update Script"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    # Pull from GitHub
    if ! pull_from_github; then
        log_info "No updates available. Exiting."
        exit 0
    fi
    echo ""
    
    # Build backend
    build_backend
    echo ""
    
    # Build frontend
    build_frontend
    echo ""
    
    # Install backend
    install_backend
    echo ""
    
    # Install frontend
    install_frontend
    echo ""
    
    # Verify installation
    if verify_installation; then
        echo ""
        log_success "=========================================="
        log_success "  Update completed successfully!"
        log_success "=========================================="
        echo ""
        echo "Next steps:"
        echo "  - Check service status: sudo systemctl status $SERVICE_NAME"
        echo "  - View service logs: sudo journalctl -u $SERVICE_NAME -f"
        echo "  - Test backend: curl http://localhost:3001/health"
        echo "  - Test frontend: Check $FRONTEND_INSTALL_DIR"
        echo ""
        echo "NOTE: nginx and SSL configurations were NOT modified"
        echo ""
    else
        log_error "Installation verification failed"
        exit 1
    fi
}

# Run main function
main "$@"

