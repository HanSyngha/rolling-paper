#!/bin/bash

# Rolling Paper Management Script
# Usage: ./manage.sh [start|stop|restart|status|migrate|logs|clean]

set -e

PROJECT_NAME="rolling-paper"
COMPOSE_FILE="docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  🎨 Rolling Paper Manager${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

start_services() {
    print_header
    print_info "Starting Rolling Paper services..."

    check_docker

    # Start Docker containers
    print_info "Starting PostgreSQL and Redis containers..."
    docker compose up -d

    # Wait for containers
    print_info "Waiting for containers to be ready..."
    sleep 5

    # Check PostgreSQL
    if docker exec rolling-paper-postgres pg_isready -U rollingpaper &> /dev/null; then
        print_success "PostgreSQL is ready on port 9700"
    else
        print_warning "PostgreSQL is not ready yet"
    fi

    # Check Redis
    if docker exec rolling-paper-redis redis-cli ping &> /dev/null; then
        print_success "Redis is ready on port 9701"
    else
        print_warning "Redis is not ready yet"
    fi

    # Check if npm dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm dependencies..."
        npm install
    fi

    # Start application in background
    print_info "Starting application server..."
    npm run dev > /dev/null 2>&1 &
    APP_PID=$!
    echo $APP_PID > .app.pid

    sleep 3

    if ps -p $APP_PID > /dev/null; then
        print_success "Application started (PID: $APP_PID)"
        print_success "Frontend: http://localhost:3000"
        print_success "Backend: http://localhost:3001"
    else
        print_error "Failed to start application"
        exit 1
    fi

    echo ""
    print_success "All services started successfully!"
    echo ""
}

stop_services() {
    print_header
    print_info "Stopping Rolling Paper services..."

    # Stop application
    if [ -f ".app.pid" ]; then
        APP_PID=$(cat .app.pid)
        if ps -p $APP_PID > /dev/null 2>&1; then
            print_info "Stopping application (PID: $APP_PID)..."
            kill $APP_PID 2>/dev/null || true
            rm .app.pid
            print_success "Application stopped"
        fi
    else
        # Try to find and kill npm/node processes
        pkill -f "npm run dev" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        pkill -f "tsx watch server.ts" 2>/dev/null || true
        print_info "Cleaned up any running processes"
    fi

    # Stop Docker containers
    print_info "Stopping Docker containers..."
    docker compose down

    print_success "All services stopped"
    echo ""
}

restart_services() {
    print_header
    print_info "Restarting Rolling Paper services..."
    stop_services
    sleep 2
    start_services
}

show_status() {
    print_header
    print_info "Service Status:"
    echo ""

    # Docker containers status
    print_info "Docker Containers:"
    docker compose ps
    echo ""

    # Application status
    print_info "Application Status:"
    if [ -f ".app.pid" ]; then
        APP_PID=$(cat .app.pid)
        if ps -p $APP_PID > /dev/null 2>&1; then
            print_success "Application is running (PID: $APP_PID)"
        else
            print_error "Application is not running (stale PID file)"
        fi
    else
        if pgrep -f "npm run dev" > /dev/null; then
            print_warning "Application might be running (no PID file)"
        else
            print_error "Application is not running"
        fi
    fi
    echo ""
}

migrate_data() {
    print_header
    print_info "Migrating data from JSONL to PostgreSQL..."

    check_docker

    # Check if containers are running
    if ! docker compose ps | grep -q "running"; then
        print_error "Containers are not running. Please start services first."
        exit 1
    fi

    # Run migration
    print_info "Running migration script..."
    tsx migrate-to-db.ts

    print_success "Migration completed"
    echo ""
}

show_logs() {
    print_header
    print_info "Showing logs (Ctrl+C to exit)..."
    echo ""
    docker compose logs -f
}

clean_all() {
    print_header
    print_warning "This will remove all containers and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping services..."
        stop_services

        print_info "Removing volumes..."
        docker compose down -v

        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
    echo ""
}

show_help() {
    print_header
    echo "Usage: ./manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start      - Start all services (Docker + Application)"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  status     - Show service status"
    echo "  migrate    - Migrate JSONL data to PostgreSQL"
    echo "  logs       - Show Docker container logs"
    echo "  clean      - Stop and remove all containers and volumes"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./manage.sh start     # Start everything"
    echo "  ./manage.sh stop      # Stop everything"
    echo "  ./manage.sh logs      # View logs"
    echo ""
}

# Main logic
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    migrate)
        migrate_data
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Invalid command: $1"
        show_help
        exit 1
        ;;
esac
