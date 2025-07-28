#!/bin/bash
# Docker Development Helper Script
# Usage: ./docker-dev.sh [command]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[Docker Dev]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Main command handler
case "$1" in
    "up" | "start")
        print_status "Starting development environment..."
        
        # Check if .env.local exists
        if [ ! -f .env.local ]; then
            print_warning ".env.local not found. Creating from .env.docker.development..."
            cp .env.docker.development .env.local
            print_status "Created .env.local. You may want to customize it."
        fi
        
        # Start services
        docker compose -f docker-compose.dev.yml up --build
        ;;
        
    "up:bg" | "start:bg")
        print_status "Starting development environment in background..."
        docker compose -f docker-compose.dev.yml up --build -d
        print_status "Services started. Run './docker-dev.sh logs' to view logs."
        ;;
        
    "down" | "stop")
        print_status "Stopping development environment..."
        docker compose -f docker-compose.dev.yml down
        ;;
        
    "restart")
        print_status "Restarting development environment..."
        docker compose -f docker-compose.dev.yml restart
        ;;
        
    "rebuild")
        print_status "Rebuilding containers..."
        docker compose -f docker-compose.dev.yml build --no-cache
        ;;
        
    "logs")
        docker compose -f docker-compose.dev.yml logs -f ${2:-app}
        ;;
        
    "shell")
        print_status "Opening shell in app container..."
        docker compose -f docker-compose.dev.yml exec app /bin/bash
        ;;
        
    "db")
        print_status "Connecting to database..."
        docker compose -f docker-compose.dev.yml exec supabase-db psql -U postgres
        ;;
        
    "reset")
        print_warning "This will delete all Docker volumes and rebuild everything!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Resetting development environment..."
            docker compose -f docker-compose.dev.yml down -v
            docker compose -f docker-compose.dev.yml up --build
        fi
        ;;
        
    "status")
        print_status "Container status:"
        docker compose -f docker-compose.dev.yml ps
        ;;
        
    "install")
        print_status "Installing new npm packages..."
        docker compose -f docker-compose.dev.yml exec app npm install ${@:2}
        ;;
        
    *)
        echo "Docker Development Helper"
        echo ""
        echo "Usage: ./docker-dev.sh [command]"
        echo ""
        echo "Commands:"
        echo "  up, start         Start development environment"
        echo "  up:bg, start:bg   Start in background"
        echo "  down, stop        Stop development environment"
        echo "  restart           Restart all services"
        echo "  rebuild           Rebuild containers (no cache)"
        echo "  logs [service]    View logs (default: app)"
        echo "  shell             Open shell in app container"
        echo "  db                Connect to database"
        echo "  reset             Reset everything (WARNING: deletes data)"
        echo "  status            Show container status"
        echo "  install [pkg]     Install npm package"
        echo ""
        echo "Examples:"
        echo "  ./docker-dev.sh up           # Start development"
        echo "  ./docker-dev.sh logs         # View app logs"
        echo "  ./docker-dev.sh logs mailhog # View mailhog logs"
        echo "  ./docker-dev.sh install axios # Install axios package"
        ;;
esac