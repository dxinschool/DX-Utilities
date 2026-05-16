const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Set up or manage server verification')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set up verification channel and role')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel for verification embed').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('Role to give after verification').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable verification'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const db = interaction.client.db;

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const title = 'Server Verification';
            const description = 'Click the button below to verify you are human!';

            db.run(`INSERT OR REPLACE INTO verify_config (guild_id, channel_id, role_id, title, description) VALUES (?, ?, ?, ?, ?)`,
                [interaction.guild.id, channel.id, role.id, title, description]);

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(0x00AE86)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_button')
                        .setLabel('Verify')
                        .setEmoji('✅')
                        .setStyle(ButtonStyle.Success)
                );

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `Verification set up in ${channel} with role ${role}`, ephemeral: true });
        }
        else if (sub === 'disable') {
            db.run(`DELETE FROM verify_config WHERE guild_id = ?`, [interaction.guild.id]);
            await interaction.reply({ content: 'Verification disabled', ephemeral: true });
        }
    }
};