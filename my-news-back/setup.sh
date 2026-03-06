#!/bin/bash

# My News Backend - Quick Setup Script

set -e

echo "🚀 My News Backend - Quick Setup"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env and add your API keys:"
    echo "   - NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (get from https://developers.naver.com/docs/serviceapi/search/news/news.md)"
    echo "   - Weather uses Open-Meteo (no API key required) https://open-meteo.com/"
    echo ""
    read -p "Press Enter to continue after updating .env file..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🐘 Starting PostgreSQL with Docker Compose..."
docker compose up -d postgres

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo ""
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init || npx prisma migrate deploy

echo ""
echo "🌱 Seeding database with categories..."
npm run prisma:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run start:dev"
echo ""
echo "The server will be available at:"
echo "  http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  npm run start:dev    - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run start:prod   - Run production build"
echo "  npx prisma studio    - Open Prisma database GUI"
echo ""
echo "📚 See README.md for API documentation"
echo "🧪 See API_TESTING.md for testing examples"
