#!/bin/bash

set -e

echo "🔨 Building Docker images for Kubernetes deployment..."

echo "📦 Building API REST image..."
cd api-rest
docker build -t api-rest:latest .
cd ..

echo "📦 Building Integration Service image..."
cd integration-service
docker build -t integration-service:latest .
cd ..

echo "📦 Building Frontend image..."
cd frontend
docker build -t frontend:latest .
cd ..

echo "✅ All images built successfully!"
echo ""
echo "📋 Available images:"
docker images | grep -E "api-rest|integration-service|frontend"
