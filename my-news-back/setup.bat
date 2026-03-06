@echo off
REM My News Backend - Quick Setup Script for Windows

echo 🚀 My News Backend - Quick Setup
echo ================================
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  No .env file found. Creating from .env.example...
    copy .env.example .env
    echo ✅ Created .env file
    echo ⚠️  Please edit .env and add your API keys:
    echo    - NEWS_API_KEY (get from https://newsapi.org/)
    echo    - Weather uses Open-Meteo (no API key required) https://open-meteo.com/
    echo.
    pause
)

echo 📦 Installing dependencies...
call npm install

echo.
echo 🐘 Starting PostgreSQL with Docker Compose...
docker compose up -d postgres

echo.
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak

echo.
echo 🔄 Running database migrations...
call npx prisma migrate dev --name init || call npx prisma migrate deploy

echo.
echo 🌱 Seeding database with categories...
call npm run prisma:seed

echo.
echo ✅ Setup complete!
echo.
echo To start the development server, run:
echo   npm run start:dev
echo.
echo The server will be available at:
echo   http://localhost:3000
echo.
echo Useful commands:
echo   npm run start:dev    - Start development server
echo   npm run build        - Build for production
echo   npm run start:prod   - Run production build
echo   npx prisma studio    - Open Prisma database GUI
echo.
echo 📚 See README.md for API documentation
echo 🧪 See API_TESTING.md for testing examples
echo.
pause
