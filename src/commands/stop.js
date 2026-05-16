const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing and clear the queue'),
    async execute(interaction) {
        if (!interaction.client.lavalinkReady) {
            return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
        }
        
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player) {
            return interaction.reply({ content: 'No player found!', ephemeral: true });
        }
        
        // Clear queue and destroy player
        player.queue.clear();
        player.destroy();
        
        await interaction.reply({ content: '⏹️ Stopped playback and cleared queue!' });
    }
};
