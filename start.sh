#!/bin/bash

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Java is not installed. Please install Java 17 or higher."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Copy .env.example to .env and configure it."
fi

# Start Lavalink in background
echo "Starting Lavalink server..."
java -jar Lavalink.jar &
LAVALINK_PID=$!

# Wait for Lavalink to start
echo "Waiting for Lavalink to initialize..."
sleep 10

# Start the bot
echo "Starting Discord bot..."
node src/main.js

# When bot stops, also stop Lavalink
echo "Stopping Lavalink server..."
kill $LAVALINK_PID 2>/dev/null

trap "kill $LAVALINK_PID 2>/dev/null" EXIT
