const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the current queue'),
    async execute(interaction) {
        if (!interaction.client.lavalinkReady) {
            return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
        }
        
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player || (!player.current && player.queue.length === 0)) {
            return interaction.reply({ content: 'Queue is empty!', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎵 Music Queue')
            .setColor(0x00AE86);
        
        if (player.current) {
            embed.addFields({ 
                name: 'Now Playing', 
                value: `**${player.current.title}** by **${player.current.author}**` 
            });
        }
        
        if (player.queue.length > 0) {
            const queueList = player.queue.slice(0, 10).map((track, i) => 
                `${i + 1}. **${track.title}** - ${track.author}`
            ).join('\n');
            
            embed.addFields({ 
                name: 'Up Next', 
                value: queueList + (player.queue.length > 10 ? `\n...and ${player.queue.length - 10} more` : '') 
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};
