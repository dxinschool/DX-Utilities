const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    async execute(interaction) {
        if (!interaction.client.lavalinkReady) {
            return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
        }
        
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player || !player.playing) {
            return interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
        }
        
        player.pause(true);
        await interaction.reply({ content: '⏸️ Paused!' });
    }
};
