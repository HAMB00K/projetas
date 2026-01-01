#!/bin/bash

set -e

echo "🚀 Deploying application to Kubernetes..."

echo "📦 Deploying PostgreSQL..."
kubectl apply -f k8s/postgres-deployment.yaml

echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

echo "📦 Deploying Kafka and Zookeeper..."
kubectl apply -f k8s/kafka-deployment.yaml

echo "⏳ Waiting for Kafka to be ready..."
sleep 30

echo "📦 Deploying Integration Service..."
kubectl apply -f k8s/integration-service-deployment.yaml

echo "📦 Deploying API REST..."
kubectl apply -f k8s/api-rest-deployment.yaml

echo "⏳ Waiting for API REST to be ready..."
kubectl wait --for=condition=ready pod -l app=api-rest --timeout=120s

echo "📦 Deploying Frontend..."
kubectl apply -f k8s/frontend-deployment.yaml

echo "⏳ Waiting for Frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend --timeout=120s

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📋 Checking deployment status:"
kubectl get pods
echo ""
echo "📋 Services:"
kubectl get svc
echo ""
echo "🌐 Access the application:"
echo "Run: minikube service frontend-service --profile knative"
