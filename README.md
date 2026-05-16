# DX Utilities

A multipurpose Discord bot built with Node.js, discord.js, and Kazagumo (Lavalink).

## Features

- **Music**: Play music from YouTube/Spotify via Lavalink with lyrics from lrclib
- **Utility**: Server info, user info, status, reminders
- **Fun**: 8ball, dice rolls

## Prerequisites

1. **Node.js** v18+
2. **Java** 11+ (for Lavalink)
3. **Discord Bot Token** (from [Discord Developer Portal](https://discord.com/developers/applications))

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" and create a bot
4. Enable **MESSAGE CONTENT INTENT** and **GUILD VOICE STATES**
5. Copy the bot token

### 2. Download Lavalink

```bash
# Download Lavalink.jar (v4.2.2)
curl -L -o Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/download/4.2.2/Lavalink.jar

# Download YouTube plugin
mkdir -p plugins
curl -L -o plugins/youtube-plugin-1.18.1.jar https://github.com/lavalink-devs/youtube-source/releases/download/1.18.1/youtube-plugin-1.18.1.jar
```

### 3. Configure

Create `.env` file:
```
DISCORD_TOKEN=your_bot_token
LAVALINK_URL=localhost:2333
LAVALINK_AUTH=youshallnotpass
```

### 4. Run

```bash
npm install
npm run deploy
npm run start:lavalink  # Terminal 1
npm run start:bot       # Terminal 2
```

## Commands

### Music
- `/play` - Play a song
- `/pause` / `/resume` - Pause/resume
- `/skip` - Skip song
- `/queue` - Show queue
- `/stop` - Stop and clear queue
- `/leave` - Leave voice channel
- `/nowplaying` - Now playing with controls
- `/lyrics` - Show lyrics
- `/search` - Search YouTube

### Utility
- `/serverinfo` - Server info
- `/userinfo` - User info
- `/status` - Check AFK status

### Fun
- `/roll [sides]` - Roll a dice
- `/8ball <question>` - Magic 8-ball
