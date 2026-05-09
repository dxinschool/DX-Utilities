require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { Kazagumo } = require('kazagumo');
const { Connectors } = require('shoukaku');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) return console.error(err);
    console.log('Connected to SQLite database');
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS reminders (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "user_id TEXT, guild_id TEXT, channel_id TEXT, " +
        "reminder_text TEXT, remind_at INTEGER)");
    
    db.run("CREATE TABLE IF NOT EXISTS afk_status (" +
        "user_id TEXT PRIMARY KEY, guild_id TEXT, " +
        "reason TEXT, timestamp INTEGER)");
});

const nodes = [
    {
        name: 'Localhost',
        url: process.env.LAVALINK_URL || 'localhost:2333',
        auth: process.env.LAVALINK_AUTH || 'youshallnotpass',
        secure: false
    }
];

const kazagumo = new Kazagumo({
    defaultSearchEngine: 'youtube',
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Connectors.DiscordJS(client), nodes);

client.db = db;
client.kazagumo = kazagumo;
client.axios = axios;

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Global track storage
global.currentTracks = new Map();
global.previousTracks = new Map();

kazagumo.on('playerStart', async (player, track) => {
    // Store previous track before playing new one
    const current = player.data.get('currentTrack');
    if (current) {
        if (!global.previousTracks.has(player.guildId)) {
            global.previousTracks.set(player.guildId, []);
        }
        const history = global.previousTracks.get(player.guildId);
        history.push(current);
        if (history.length > 50) history.shift();
    }
    
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;
    
    const { createNowPlayingEmbed, createControlButtons } = require('./commands/nowplaying');
    const embed = createNowPlayingEmbed(player, track);
    const buttons = createControlButtons(player);
    
    // Store current track and shuffle state
    player.data.set('currentTrack', track);
    global.currentTracks.set(player.guildId, track);
    player.data.set('shuffleEnabled', player.data.get('shuffleEnabled') || false);
    
    // Clear existing interval if any
    if (player.data.get('updateInterval')) {
        clearInterval(player.data.get('updateInterval'));
    }
    
    // Set up 5-second progress update
    const interval = setInterval(async () => {
        const msg = player.data.get('nowPlayingMsg');
        if (!msg || msg.deleted) {
            clearInterval(interval);
            player.data.set('updateInterval', null);
            return;
        }
        if (!player.playing && !player.paused) {
            clearInterval(interval);
            player.data.set('updateInterval', null);
            return;
        }
        try {
            const currentTrack = player.data.get('currentTrack') || global.currentTracks.get(player.guildId);
            if (currentTrack) {
                const updatedEmbed = createNowPlayingEmbed(player, currentTrack);
                await msg.edit({ embeds: [updatedEmbed] }).catch(() => {});
            }
        } catch (e) {}
    }, 5000);
    player.data.set('updateInterval', interval);
    
        const oldMsg = player.data.get('nowPlayingMsg');
        if (oldMsg && !oldMsg.deleted) {
            try {
                await oldMsg.edit({ embeds: [embed], components: buttons });
                return;
            } catch (e) {}
        }
        
        try {
            const msg = await channel.send({ 
                embeds: [embed], 
                components: buttons 
            });
            player.data.set('nowPlayingMsg', msg);
        } catch (e) {
            console.error('Error sending nowplaying message:', e);
        }
});

kazagumo.on('playerEnd', (player) => {
    // Don't clear history on track end - needed for previous button
    // Only clear track info if queue is empty
    if (player.queue.size === 0) {
        player.data.set('currentTrack', null);
        player.data.set('embedColor', null);
        global.currentTracks.delete(player.guildId);
    } else {
        // Still clear current track since the track ended
        player.data.set('currentTrack', null);
    }
    
    const msg = player.data.get('nowPlayingMsg');
    if (msg && !msg.deleted) {
        try {
            const { createNowPlayingEmbed } = require('./commands/nowplaying');
            const embed = createNowPlayingEmbed(player, null);
            msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        } catch (e) {}
    }
});

kazagumo.on('playerEmpty', (player) => {
    if (player.data.get('updateInterval')) {
        clearInterval(player.data.get('updateInterval'));
        player.data.set('updateInterval', null);
    }
    player.data.set('currentTrack', null);
    player.data.set('embedColor', null);
    global.currentTracks.delete(player.guildId);
    global.previousTracks.delete(player.guildId);
    
    const channel = client.channels.cache.get(player.textId);
    if (channel) channel.send({ content: 'Queue ended. Leaving voice channel.' });
    player.destroy();
});

kazagumo.shoukaku.on('ready', (name) => console.log(`Lavalink ${name}: Ready!`));
kazagumo.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error`, error));
kazagumo.shoukaku.on('close', (name, code, reason) => 
    console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));

client.on('ready', async () => {
    client.user.setActivity('Your Server', { type: 3 });
    console.log(`Bot presence set: Watching ${client.guilds.cache.size} server(s)`);
});

client.login(process.env.DISCORD_TOKEN);
