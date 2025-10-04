#!/bin/bash

# Hotel Management System Startup Script

echo "🏨 Starting Hotel Management System..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    
    # Try to start MongoDB (adjust based on your system)
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongod
    elif command -v brew &> /dev/null; then
        brew services start mongodb-community
    else
        echo "❌ Please start MongoDB manually and run this script again."
        exit 1
    fi
    
    # Wait a moment for MongoDB to start
    sleep 3
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
fi

# Set environment variables if not set
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✅ Please update the .env file with your configuration."
fi

# Start the application
echo "🚀 Starting the application..."
echo "📱 Access the application at: http://localhost:3000"
echo "🔧 Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start