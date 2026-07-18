const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits
} = require('discord.js');
const RssParser = require('rss-parser');

const rssParser = new RssParser();
const NITTER_FEED = 'https://nitter.net/HKObservatory/rss';

// Globally track which tweets we've already posted
const seenTweets = new Set();
const ACCOUNT_NAME = '@HKObservatory';
const ACCOUNT_URL = 'https://x.com/HKObservatory';

async function fetchTweets() {
    const feed = await rssParser.parseURL(NITTER_FEED);
    return feed.items || [];
}

/**
 * Categorise a tweet by its content to pick an embed colour.
 */
function categoriseTweet(title) {
    const lower = title.toLowerCase();

    // Tropical cyclone
    if (lower.includes('tropical') || lower.includes('cyclone') ||
        lower.includes('颱風') || lower.includes('熱帶氣旋') ||
        /tc\d|t\d/i.test(lower) || lower.includes('signal no')) {
        return { color: 0xFF0000, tag: '🌀 Tropical Cyclone' };
    }

    // Rainstorm / heavy rain
    if (lower.includes('rainstorm') || lower.includes('暴雨') ||
        lower.includes('black rain') || lower.includes('red rain') ||
        lower.includes('amber rain') || lower.includes('水浸') ||
        lower.includes('flood')) {
        return { color: 0x8B0000, tag: '🌧 Heavy Rain' };
    }

    // Thunderstorm / squall
    if (lower.includes('thunderstorm') || lower.includes('雷暴') ||
        lower.includes('squall') || lower.includes('陣風')) {
        return { color: 0xFF6600, tag: '⛈ Thunderstorm' };
    }

    // Landslip
    if (lower.includes('landslip') || lower.includes('山泥傾瀉')) {
        return { color: 0x8B4513, tag: '🏔 Landslip' };
    }

    // Fire danger
    if (lower.includes('fire') || lower.includes('火災')) {
        return { color: 0xFF4500, tag: '🔥 Fire Danger' };
    }

    // Hot / cold weather
    if (lower.includes('hot weather') || lower.includes('酷熱') ||
        lower.includes('cold weather') || lower.includes('寒冷')) {
        return { color: 0xFF69B4, tag: '🌡 Extreme Temp' };
    }

    // Monsoon
    if (lower.includes('monsoon') || lower.includes('季候風')) {
        return { color: 0x4682B4, tag: '💨 Monsoon' };
    }

    // Earthquake
    if (lower.includes('earthquake') || lower.includes('地震')) {
        return { color: 0x9932CC, tag: '📊 Earthquake' };
    }

    // Weather tips / forecasts — informational
    if (lower.includes('天氣提示') || lower.includes('weather tips') ||
        lower.includes('forecast') || lower.includes('預報') ||
        lower.includes('outlook') || lower.includes('展望')) {
        return { color: 0x1E90FF, tag: 'ℹ️ Advisory' };
    }

    // Cancellation of warnings
    if (lower.includes('cancel') || lower.includes('取消')) {
        return { color: 0x228B22, tag: '✅ Cancelled' };
    }

    // Default
    return { color: 0x00AE86, tag: '🌤 Weather' };
}

function formatTweetDate(pubDate) {
    if (!pubDate) return null;
    const d = new Date(pubDate);
    // Convert to HKT (UTC+8)
    const hkt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    const hkStr = hkt.toISOString().replace('Z', '+08:00');
    return `<t:${Math.floor(d.getTime() / 1000)}:F>`;
}

function buildTweetEmbed(tweet) {
    const title = tweet.title || '';
    const link = tweet.link || '';
    const pubDate = tweet.pubDate || '';
    const { color, tag } = categoriseTweet(title);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: `Hong Kong Observatory ${ACCOUNT_NAME}`,
            url: ACCOUNT_URL,
            iconURL: 'https://nitter.net/pic/pbs.twimg.com%2Fprofile_images%2F1996974648198942722%2F-J7BPSSy_400x400.jpg'
        })
        .setDescription(title.substring(0, 4096))
        .setTimestamp();

    if (link) {
        embed.setURL(link);
    }

    // Add source link as a field
    embed.addFields({
        name: '🔗 Source',
        value: `[View on X](${link || ACCOUNT_URL})`,
        inline: true
    });

    // Add the tag
    embed.addFields({ name: '📌 Type', value: tag, inline: true });

    // Date
    if (pubDate) {
        embed.addFields({ name: '🕐 Time', value: formatTweetDate(pubDate), inline: true });
    }

    return embed;
}

/**
 * Fetch the latest tweets and return any that haven't been posted yet.
 */
async function getNewTweets() {
    try {
        const tweets = await fetchTweets();
        const newTweets = [];

        for (const tweet of tweets) {
            const id = tweet.guid || tweet.link;
            if (!id) continue;
            if (!seenTweets.has(id)) {
                seenTweets.add(id);
                newTweets.push(tweet);
            }
        }

        // Keep the seen set from growing forever — trim to last 500
        if (seenTweets.size > 500) {
            const iter = seenTweets.values();
            for (let i = 0; i < 100; i++) {
                const val = iter.next().value;
                if (val) seenTweets.delete(val);
                else break;
            }
        }

        return newTweets;
    } catch (error) {
        console.error('Nitter feed error:', error.message);
        return [];
    }
}

/**
 * Called by main.js auto-update interval. Posts new tweets to the channel.
 */
async function sendWeatherUpdate(client, guildId, channelId) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel) return;

        const newTweets = await getNewTweets();

        // Post each new tweet
        for (const tweet of newTweets) {
            const embed = buildTweetEmbed(tweet);
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Weather tweet post error:', error);
    }
}

// ======= Slash Command =======

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('HK Observatory X account weather updates')
        .addSubcommand(sub =>
            sub.setName('now')
                .setDescription('Latest weather tweet from HKObservatory'))
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set the channel for automatic weather alerts')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel for weather alerts')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable automatic weather alerts'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const db = interaction.client.db;

        if (sub === 'now') {
            await interaction.deferReply();

            try {
                const tweets = await fetchTweets().catch(() => []);
                if (tweets.length === 0) {
                    return interaction.editReply({ content: '❌ Could not fetch tweets from HKObservatory.' });
                }

                // Show the most recent tweet
                const embed = buildTweetEmbed(tweets[0]);

                // If there's more than one new tweet since we last checked, say so
                const newTweets = await getNewTweets();
                if (newTweets.length > 0) {
                    embed.setFooter({ text: `+${newTweets.length} new update(s) since last check` });
                }

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Weather fetch error:', error);
                await interaction.editReply({ content: '❌ Error fetching tweets.' });
            }
            return;
        }

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');

            if (!channel.isTextBased()) {
                return interaction.reply({ content: '❌ Please select a text channel.', ephemeral: true });
            }

            db.run(`INSERT OR REPLACE INTO weather_config (guild_id, channel_id) VALUES (?, ?)`,
                [interaction.guild.id, channel.id]);

            await channel.send({ content: '🌤 **HKO alerts enabled!** I will post weather tweets from HKObservatory here automatically.' });
            await interaction.reply({
                content: `✅ HKO weather alerts set to ${channel}. Use \`/weather now\` for the latest update.`,
                ephemeral: true
            });
            return;
        }

        if (sub === 'disable') {
            db.run(`DELETE FROM weather_config WHERE guild_id = ?`, [interaction.guild.id]);
            await interaction.reply({ content: '✅ HKO weather alerts disabled.', ephemeral: true });
            return;
        }
    },

    // Exported for main.js auto-update interval
    sendWeatherUpdate
};
