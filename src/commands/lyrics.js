const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomColor } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get lyrics for the currently playing song or search for a song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name to search (defaults to now playing)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.client.lavalinkReady) {
            return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        let track = null;
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        const query = interaction.options.getString('query');
        
        if (!query && player && player.data.get('currentTrack')) {
            track = player.data.get('currentTrack');
        }
        
        const searchQuery = query || (track ? `${track.author} ${track.title}` : null);
        
        if (!searchQuery) {
            return interaction.editReply({ content: 'No song playing and no query provided!' });
        }
        
        try {
            const response = await interaction.client.axios.get('https://lrclib.net/api/search', {
                params: {
                    artist_name: track?.author || '',
                    track_name: track?.title || query,
                    limit: 1
                }
            });
            
            if (!response.data || response.data.length === 0) {
                return interaction.editReply({ content: 'No lyrics found!' });
            }
            
            const song = response.data[0];
            let lyrics = song.plainLyrics || 'No lyrics available';
            
            if (song.syncedLyrics) {
                lyrics = song.syncedLyrics;
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`🎵 ${song.trackName}`)
                .setDescription(lyrics.substring(0, 4096))
                .setColor(getRandomColor())
                .addFields(
                    { name: 'Artist', value: song.artistName, inline: true },
                    { name: 'Album', value: song.albumName || 'Unknown', inline: true }
                )
                .setTimestamp();
            
            if (track?.thumbnail) {
                embed.setThumbnail(track.thumbnail);
            }
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lyrics error:', error.message);
            await interaction.editReply({ content: 'Error fetching lyrics!' });
        }
    }
};
