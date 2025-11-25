#!/bin/bash

echo "🚀 Rolling Paper Database Setup"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Start Docker containers
echo "📦 Starting PostgreSQL and Redis containers..."
docker compose up -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to be ready..."
sleep 5

# Check container status
echo ""
echo "📊 Container Status:"
docker compose ps

# Check PostgreSQL connection
echo ""
echo "🔍 Testing PostgreSQL connection..."
if docker exec rolling-paper-postgres pg_isready -U rollingpaper &> /dev/null; then
    echo "✅ PostgreSQL is ready on port 9700"
else
    echo "❌ PostgreSQL is not ready yet. Please wait a moment and try again."
fi

# Check Redis connection
echo ""
echo "🔍 Testing Redis connection..."
if docker exec rolling-paper-redis redis-cli ping &> /dev/null; then
    echo "✅ Redis is ready on port 9701"
else
    echo "❌ Redis is not ready yet. Please wait a moment and try again."
fi

echo ""
echo "================================"
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'tsx migrate-to-db.ts' to migrate existing data (optional)"
echo "  2. Run 'npm run dev' to start the application"
echo ""
echo "Useful commands:"
echo "  - docker compose logs -f       # View logs"
echo "  - docker compose down          # Stop containers"
echo "  - docker compose restart       # Restart containers"
echo ""
