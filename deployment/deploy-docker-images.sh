
export TAG="2025091311000"
# llm-rag-analysis-frontend-ai-chatbot
docker buildx build --platform linux/amd64 --tag gcr.io/ac215-project/llm-rag-analysis-api-service:$TAG --push /api-service