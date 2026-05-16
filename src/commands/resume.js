const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),
    async execute(interaction) {
        if (!interaction.client.lavalinkReady) {
            return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
        }
        
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player || !player.paused) {
            return interaction.reply({ content: 'Nothing is paused!', ephemeral: true });
        }
        
        player.pause(false);
        await interaction.reply({ content: '▶️ Resumed!' });
    }
};
