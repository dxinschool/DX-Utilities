const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomColor } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a dice')
        .addIntegerOption(option =>
            option.setName('sides')
                .setDescription('Number of sides (default: 6)')
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        const sides = interaction.options.getInteger('sides') || 6;
        const result = Math.floor(Math.random() * sides) + 1;
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 Dice Roll')
            .setDescription(`You rolled a **${result}** (d${sides})`)
            .setColor(getRandomColor())
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
