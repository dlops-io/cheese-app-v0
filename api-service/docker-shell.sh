#!/bin/bash

# exit immediately if a command exits with a non-zero status
set -e

# Set vairables
export BASE_DIR=$(pwd)
export SECRETS_DIR=$(pwd)/../../secrets/
export GCP_PROJECT="ac215-project" # CHANGE TO YOUR PROJECT ID
export GOOGLE_APPLICATION_CREDENTIALS="/secrets/llm-service-account.json"
export IMAGE_NAME="llm-rag-analysis-api-service"


# Build the image based on the Dockerfile
docker build -t $IMAGE_NAME -f Dockerfile .

# Run the container
docker run --rm --name $IMAGE_NAME -ti \
-p 9000:9000 \
-e DEV=1 \
-v "$BASE_DIR":/app \
-v "$SECRETS_DIR":/secrets \
-e GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS \
-e GCP_PROJECT=$GCP_PROJECT \
$IMAGE_NAME