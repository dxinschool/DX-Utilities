const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the voice channel and clear queue'),
    async execute(interaction) {
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player) {
            return interaction.reply({ content: 'I\'m not in a voice channel!', ephemeral: true });
        }
        
        player.destroy();
        await interaction.reply({ content: '👋 Left the voice channel!' });
    }
};
