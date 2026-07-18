const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomColor, formatDuration } = require('../utils/helpers');

const searchResults = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search YouTube and display results with play buttons')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search query')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.client.lavalinkReady) {
            return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        const userId = interaction.user.id;
        
        try {
            const result = await interaction.client.kazagumo.search(query, { requester: interaction.user });
            
            if (!result.tracks.length) {
                return interaction.editReply({ content: 'No results found!' });
            }
            
            const tracks = result.tracks.slice(0, 5);
            
            searchResults.set(userId, tracks);
            setTimeout(() => searchResults.delete(userId), 60000);
            
            const embed = new EmbedBuilder()
                .setTitle(`Search Results for "${query}"`)
                .setColor(getRandomColor())
                .setTimestamp();
            
            tracks.forEach((track, index) => {
                embed.addFields({
                    name: `${index + 1}. ${track.title}`,
                    value: `**Artist:** ${track.author}\n**Duration:** ${formatDuration(track.length)}`,
                    inline: false
                });
            });
            
            if (tracks[0].thumbnail) {
                embed.setThumbnail(tracks[0].thumbnail);
            }
            
            const row = new ActionRowBuilder();
            tracks.forEach((track, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`search_play_${index}_${userId}`)
                        .setLabel(`${index + 1}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('▶️')
                );
            });
            
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Search error:', error);
            await interaction.editReply({ content: 'An error occurred while searching!' });
        }
    }
};

module.exports.searchResults = searchResults;
