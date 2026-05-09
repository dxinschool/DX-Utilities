const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getRandomColor } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display detailed information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get info about (defaults to yourself)')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        
        const embed = new EmbedBuilder()
            .setTitle(`User Info - ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor(getRandomColor())
            .setTimestamp();
        
        // Basic Info
        embed.addFields(
            { name: '👤 Username', value: `${targetUser.username}#${targetUser.discriminator}`, inline: true },
            { name: '🆔 User ID', value: targetUser.id, inline: true },
            { name: '🤖 Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true }
        );
        
        // Timestamps
        embed.addFields(
            { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`, inline: false }
        );
        
        // Member Info (if in guild)
        if (member) {
            embed.addFields(
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: false },
                { name: '🎭 Nickname', value: member.nickname || 'None', inline: true },
                { name: '🎨 Display Color', value: member.displayHexColor, inline: true },
                { name: '📌 Highest Role', value: `<@&${member.roles.highest.id}>`, inline: true }
            );
            
            // Roles
            const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
            if (roles.size > 0) {
                const roleList = roles.map(r => `<@&${r.id}>`).slice(0, 10).join(', ');
                embed.addFields({ name: `🏷️ Roles [${roles.size}]`, value: roles.size > 10 ? roleList + ` ...and ${roles.size - 10} more` : roleList, inline: false });
            }
            
            // Permissions
            const perms = member.permissions.toArray().filter(p => p.includes('ADMINISTRATOR') || p.includes('MANAGE') || p.includes('KICK') || p.includes('BAN') || p.includes('MODERATE'));
            if (perms.length > 0) {
                embed.addFields({ name: '🔑 Key Permissions', value: perms.slice(0, 5).map(p => `\`${p}\``).join(', '), inline: false });
            }
            
            // Status
            const presence = member.presence;
            if (presence) {
                embed.addFields(
                    { name: '🟢 Status', value: presence.status.charAt(0).toUpperCase() + presence.status.slice(1), inline: true },
                    { name: '🎮 Activity', value: presence.activities[0] ? `${presence.activities[0].type} ${presence.activities[0].name}` : 'None', inline: true }
                );
            }
            
            // Booster
            if (member.premiumSince) {
                embed.addFields({ name: '💎 Server Booster', value: `Since <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: false });
            }
        }
        
        // Badges
        const flags = targetUser.flags?.toArray() || [];
        if (flags.length > 0) {
            const badgeMap = {
                'Staff': '👨‍💼 Discord Staff',
                'Partner': '🤝 Discord Partner',
                'CertifiedModerator': '🛡️ Certified Moderator',
                'HypeSquad': '⚡ HypeSquad Events',
                'HypeSquadOnlineHouse1': '🏠 HypeSquad Bravery',
                'HypeSquadOnlineHouse2': '🏠 HypeSquad Brilliance',
                'HypeSquadOnlineHouse3': '🏠 HypeSquad Balance',
                'PremiumEarlySupporter': '💎 Early Supporter',
                'BugHunterLevel1': '🐛 Bug Hunter',
                'BugHunterLevel2': '🐛 Bug Hunter Level 2',
                'VerifiedBot': '✅ Verified Bot',
                'VerifiedDeveloper': '👨‍💻 Verified Developer',
                'ActiveDeveloper': '👨‍💻 Active Developer'
            };
            const badges = flags.map(f => badgeMap[f] || f).filter(Boolean);
            if (badges.length > 0) {
                embed.addFields({ name: '🏅 Badges', value: badges.join('\n'), inline: false });
            }
        }
        
        // Banner
        if (targetUser.banner) {
            embed.setImage(targetUser.bannerURL({ dynamic: true, size: 1024 }));
        }
        
        // Accent Color
        if (targetUser.accentColor) {
            embed.addFields({ name: '🎨 Accent Color', value: `#${targetUser.accentColor.toString(16).padStart(6, '0')}`, inline: true });
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};
