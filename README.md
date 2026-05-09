# Zork Discord Bot

A multipurpose Discord bot built with Node.js, discord.js, and Kazagumo (Lavalink).

## Features

- **Music**: Play music from YouTube/Spotify via Lavalink with synced lyrics from lrclib
- **Utility**: Reminders, polls, server/user info, AFK status
- **Fun/Games**: Trivia, 8ball, memes, dice rolls, rock-paper-scissors

## Prerequisites

1. **Node.js** v18 or higher
2. **Java** 11 or higher (for Lavalink)
3. **Discord Bot Token** (from [Discord Developer Portal](https://discord.com/developers/applications))

## Setup Instructions

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Enable **MESSAGE CONTENT INTENT** and **GUILD VOICE STATES** under Privileged Gateway Intents
5. Copy the bot token
6. Go to "OAuth2 > URL Generator", select `bot` and `applications.commands` scopes
7. Select necessary permissions and copy the generated URL to invite bot to your server

### 2. Set up Lavalink Server

1. Download the latest [Lavalink.jar](https://github.com/lavalink-devs/Lavalink/releases)
2. Create a folder for Lavalink and place the jar file there
3. Create an `application.yml` file in the same folder:

```yaml
server:
  port: 2333
  address: 127.0.0.1

lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: false
      vimeo: false
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    youtubePlaylistLoadLimit: 6
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true

logging:
  logback:
    rollingfile:
      enabled: false
```

4. Run Lavalink: `java -jar Lavalink.jar`

### 3. Configure the Bot

1. Copy `.env.example` to `.env`:
   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   LAVALINK_URL=localhost:2333
   LAVALINK_AUTH=youshallnotpass
   ```

2. Get your Guild ID: Enable Developer Mode in Discord, right-click your server > Copy ID

### 4. Install Dependencies and Run

```bash
npm install
```

Deploy slash commands:
```bash
node deploy-commands.js
```

Start the bot:
```bash
node src/main.js
```

## Project Structure

```
zork-bot/
├── src/
│   ├── commands/    # Slash command definitions
│   ├── events/      # Client events (ready, interactionCreate)
│   ├── utils/       # Database, music, helper functions
│   └── main.js      # Entry point
├── deploy-commands.js  # Slash command registration
├── .env             # Bot configuration (create from .env.example)
├── package.json
└── README.md
```

## Available Commands

### Music
- `/play <query>` - Play a song from YouTube/Spotify
- `/pause` - Pause the current song
- `/resume` - Resume the paused song
- `/skip` - Skip the current song
- `/queue` - Display the current queue
- `/stop` - Stop playing and clear queue
- `/leave` - Leave the voice channel
- `/nowplaying` - Display currently playing song with synced lyrics

### Utility
- `/serverinfo` - Display server information
- (More utility commands to be added: /remind, /poll, /userinfo, /afk)

### Fun/Games
- `/roll [sides]` - Roll a dice
- `/8ball <question>` - Ask the magic 8-ball
- (More games to be added: /trivia, /meme, /rps)

## Notes

- Make sure Lavalink is running before starting the bot
- The bot uses SQLite for persistent storage (reminders, AFK status)
- Lyrics are fetched from [lrclib](https://lrclib.net) with synced timestamps
