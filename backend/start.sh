#!/bin/bash

# SalengMan Backend - Quick Start Script

set -e

echo "🚀 Starting SalengMan Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env with your settings:"
    echo "    nano .env"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
echo "📦 Starting Docker containers..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check health
echo "🏥 Checking health..."
for i in {1..10}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo "   Waiting for backend... ($i/10)"
    sleep 2
done

# Show status
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "🎉 SalengMan Backend is running!"
echo ""
echo "📍 Services:"
echo "   • Backend API:    http://localhost:3000"
echo "   • PostgREST:      http://localhost:3001"
echo "   • Realtime WS:    ws://localhost:4000"
echo "   • MinIO Console:  http://localhost:9001"
echo ""
echo "📝 Useful commands:"
echo "   • View logs:      docker compose logs -f"
echo "   • Stop:           docker compose down"
echo "   • Reset:          docker compose down -v"
echo ""
