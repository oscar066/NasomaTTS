#!/bin/bash
set -e

echo "Starting NasomaTTS deployment..."

cd "$(dirname "$0")/.."
echo "Working in directory: $(pwd)"

if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -E '^[A-Za-z0-9_]+=' | xargs)
    echo "Environment variables loaded."
else
    echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."
    exit 1
fi

DOCKER_CMD="docker compose"
if ! groups | grep -q "docker"; then
    DOCKER_CMD="sudo $DOCKER_CMD"
fi

echo "Building and starting NasomaTTS containers..."
$DOCKER_CMD up -d --build

echo ""
echo "Deployment complete."
echo "Check status: docker compose ps"
