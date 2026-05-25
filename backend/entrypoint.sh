#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - initializing database..."

cd /app

python db/init_db.py

echo "Database initialized."

if [ -n "$TAVILY_API_KEY" ] && [ "$TAVILY_API_KEY" != "your_tavily_api_key_here" ]; then
    echo "Ingesting knowledge base to ChromaDB..."
    python rag/ingest.py ./knowledge_base
    echo "Knowledge base ingested."
else
    echo "TAVILY_API_KEY not set - skipping RAG ingestion (web search will show warning)"
    mkdir -p /app/chroma_db
fi

echo "Starting PFE Coach API..."
exec uvicorn main:app --host 0.0.0.0 --port 8000