const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    async execute(interaction) {
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player || !player.playing) {
            return interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
        }
        
        const current = player.current;
        player.skip();
        await interaction.reply({ content: `⏭️ Skipped **${current.title}**` });
    }
};
