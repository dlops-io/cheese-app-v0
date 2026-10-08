#!/bin/bash

set -e

export IMAGE_NAME="llm-rag-analysis-frontend-ai-chatbot"

# Build the image based on the Dockerfile
docker build -t $IMAGE_NAME -f Dockerfile.dev .

# Run the container
docker run --rm --name $IMAGE_NAME -ti -v "$(pwd)/:/app/" -p 3200:3000 --network cheese-app-network  $IMAGE_NAME