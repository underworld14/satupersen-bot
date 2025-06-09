#!/bin/bash

# 🌱 Satupersen Bot - Production Deployment Script
# Deploys the latest Docker image to production server

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="satupersen-bot"
IMAGE_REGISTRY="ghcr.io"
IMAGE_REPO="underworld14/satupersen-bot"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Help function
show_help() {
    cat << EOF
🌱 Satupersen Bot - Production Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -t, --tag TAG       Specify image tag (default: latest)
    -e, --env ENV       Environment file path (default: .env)
    -c, --compose FILE  Docker compose file path (default: docker-compose.yml)
    -p, --pull          Force pull latest image
    -b, --backup        Create backup before deployment
    -r, --rollback      Rollback to previous version
    -h, --help          Show this help message

EXAMPLES:
    $0                              # Deploy latest version
    $0 --tag v1.2.3                # Deploy specific version
    $0 --pull --backup              # Force pull and backup before deploy
    $0 --rollback                   # Rollback to previous version

ENVIRONMENT VARIABLES:
    GITHUB_TOKEN        GitHub token for private registry access
    DEPLOYMENT_ENV      Deployment environment (production/staging)
EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "🔍 Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning ".env file not found at $ENV_FILE"
        log_info "Please create .env file with required environment variables"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Login to GitHub Container Registry
ghcr_login() {
    log_info "🔐 Logging in to GitHub Container Registry..."
    
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
        log_success "Logged in to GHCR successfully"
    else
        log_warning "GITHUB_TOKEN not set, assuming public registry access"
    fi
}

# Pull latest image
pull_image() {
    local image_tag="$1"
    local full_image="$IMAGE_REGISTRY/$IMAGE_REPO:$image_tag"
    
    log_info "📥 Pulling image: $full_image"
    
    if docker pull "$full_image"; then
        log_success "Image pulled successfully"
    else
        log_error "Failed to pull image: $full_image"
        exit 1
    fi
}

# Create backup
create_backup() {
    log_info "💾 Creating backup..."
    
    local backup_dir="$PROJECT_ROOT/backups"
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p "$backup_dir"
    
    # Backup current deployment
    if docker ps -q -f name="$CONTAINER_NAME" > /dev/null; then
        log_info "Backing up current container..."
        docker commit "$CONTAINER_NAME" "$CONTAINER_NAME:backup-$(date +%Y%m%d_%H%M%S)" || true
    fi
    
    # Backup configuration files
    tar -czf "$backup_dir/$backup_file" \
        -C "$PROJECT_ROOT" \
        docker-compose.yml \
        .env \
        scripts/ \
        2>/dev/null || true
    
    log_success "Backup created: $backup_dir/$backup_file"
}

# Deploy application
deploy() {
    local image_tag="$1"
    
    log_info "🚀 Deploying Satupersen Bot..."
    
    # Set image tag in environment
    export SATUPERSEN_IMAGE_TAG="$image_tag"
    
    # Deploy using Docker Compose
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    fi
    
    log_success "Deployment completed"
}

# Health check
health_check() {
    log_info "🔍 Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker ps -q -f name="$CONTAINER_NAME" > /dev/null; then
            if docker exec "$CONTAINER_NAME" bun run src/utils/test-db-connection.ts &> /dev/null; then
                log_success "Health check passed"
                return 0
            fi
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10s..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback
rollback() {
    log_info "🔄 Rolling back deployment..."
    
    # Get previous image
    local previous_image=$(docker images "$IMAGE_REGISTRY/$IMAGE_REPO" --format "table {{.Tag}}" | grep -v "TAG\|latest" | head -n 1)
    
    if [[ -n "$previous_image" ]]; then
        log_info "Rolling back to: $previous_image"
        deploy "$previous_image"
        
        if health_check; then
            log_success "Rollback completed successfully"
        else
            log_error "Rollback health check failed"
            return 1
        fi
    else
        log_error "No previous image found for rollback"
        return 1
    fi
}

# Show status
show_status() {
    log_info "📊 Current deployment status:"
    
    echo ""
    echo "🐳 Container Status:"
    docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "🖼️ Image Information:"
    docker images "$IMAGE_REGISTRY/$IMAGE_REPO" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
    
    echo ""
    echo "📝 Recent Logs:"
    docker logs --tail 20 "$CONTAINER_NAME" 2>/dev/null || echo "No logs available"
}

# Clean up old images
cleanup() {
    log_info "🧹 Cleaning up old images..."
    
    # Keep only the latest 5 images
    docker images "$IMAGE_REGISTRY/$IMAGE_REPO" --format "{{.ID}}" | tail -n +6 | xargs -r docker rmi 2>/dev/null || true
    
    # Clean up unused images
    docker image prune -f
    
    log_success "Cleanup completed"
}

# Parse command line arguments
IMAGE_TAG="latest"
ENV_FILE="$PROJECT_ROOT/.env"
FORCE_PULL=false
CREATE_BACKUP=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -c|--compose)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -p|--pull)
            FORCE_PULL=true
            shift
            ;;
        -b|--backup)
            CREATE_BACKUP=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        --status)
            show_status
            exit 0
            ;;
        --cleanup)
            cleanup
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "🌱 Starting Satupersen Bot deployment..."
    
    # Check prerequisites
    check_prerequisites
    
    if [[ "$ROLLBACK" == true ]]; then
        rollback
        exit $?
    fi
    
    # Login to registry
    ghcr_login
    
    # Create backup if requested
    if [[ "$CREATE_BACKUP" == true ]]; then
        create_backup
    fi
    
    # Pull image if requested or if latest tag
    if [[ "$FORCE_PULL" == true ]] || [[ "$IMAGE_TAG" == "latest" ]]; then
        pull_image "$IMAGE_TAG"
    fi
    
    # Deploy
    deploy "$IMAGE_TAG"
    
    # Health check
    if health_check; then
        log_success "🎉 Deployment successful!"
        show_status
    else
        log_error "Deployment failed health check"
        log_info "Consider rolling back: $0 --rollback"
        exit 1
    fi
}

# Run main function
main "$@" 