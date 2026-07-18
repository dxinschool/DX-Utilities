const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomColor } = require('../utils/helpers');

const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
const nsfwLevels = ['Default', 'Explicit', 'Safe', 'Age Restricted'];
const notificationLevels = ['All Messages', 'Only Mentions'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display detailed server information'),
    async execute(interaction) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        
        const embed = new EmbedBuilder()
            .setTitle(`Server Info - ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setColor(getRandomColor())
            .setTimestamp();
        
        // Basic Info
        embed.addFields(
            { name: '📝 Name', value: guild.name, inline: true },
            { name: '🆔 Server ID', value: guild.id, inline: true },
            { name: '👑 Owner', value: `<@${owner.id}>`, inline: true }
        );
        
        // Timestamps
        embed.addFields(
            { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false }
        );
        
        // Member Stats
        const totalMembers = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size || 'N/A';
        const humans = totalMembers - (typeof bots === 'number' ? bots : 0);
        embed.addFields(
            { name: '👥 Members', value: `**Total:** ${totalMembers}\n**Humans:** ${humans}\n**Bots:** ${bots}`, inline: true },
            { name: '🟢 Online', value: `🟢 ${guild.members.cache.filter(m => m.presence?.status === 'online').size || 0}\n🟡 ${guild.members.cache.filter(m => m.presence?.status === 'idle').size || 0}\n🔴 ${guild.members.cache.filter(m => m.presence?.status === 'dnd').size || 0}\n⚫ ${guild.members.cache.filter(m => !m.presence || m.presence.status === 'offline').size || 0}`, inline: true }
        );
        
        // Channels
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === 13).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === 15).size;
        embed.addFields(
            { name: '📚 Channels', value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categoryChannels}\n**Stage:** ${stageChannels}\n**Forum:** ${forumChannels}`, inline: true }
        );
        
        // Roles & Emojis
        embed.addFields(
            { name: '🏷️ Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
            { name: '📎 Stickers', value: `${guild.stickers?.cache.size || 0}`, inline: true }
        );
        
        // Boost Info
        embed.addFields(
            { name: '💎 Server Boost', value: `**Level:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}\n**Boosters:** ${guild.members.cache.filter(m => m.premiumSince).size}`, inline: true }
        );
        
        // Server Settings
        embed.addFields(
            { name: '🔒 Verification', value: verificationLevels[guild.verificationLevel], inline: true },
            { name: '🔞 NSFW Level', value: nsfwLevels[guild.nsfwLevel] || 'Unknown', inline: true },
            { name: '📢 Notifications', value: notificationLevels[guild.defaultMessageNotifications] || 'Unknown', inline: true }
        );
        
        // Content Filter
        const filterTypes = ['None', 'No Role', 'All Members'];
        embed.addFields(
            { name: '🛡️ Content Filter', value: filterTypes[guild.explicitContentFilter] || 'Unknown', inline: true },
            { name: '2FA Required', value: guild.mfaLevel ? 'Yes' : 'No', inline: true },
            { name: '📈 Max Members', value: guild.maximumMembers?.toString() || 'Unlimited', inline: true }
        );
        
        // Features
        if (guild.features && guild.features.length > 0) {
            const features = guild.features.slice(0, 10).map(f => `\`${f}\``).join(', ');
            embed.addFields({ name: '⚡ Features', value: features + (guild.features.length > 10 ? `\n...and ${guild.features.length - 10} more` : ''), inline: false });
        }
        
        // Descriptions
        if (guild.description) {
            embed.addFields({ name: '📄 Description', value: guild.description, inline: false });
        }
        
        // Special Channels
        const specialChannels = [];
        if (guild.afkChannel) specialChannels.push(`**AFK:** <#${guild.afkChannel.id}> (${guild.afkTimeout / 60}min)`);
        if (guild.systemChannel) specialChannels.push(`**System:** <#${guild.systemChannel.id}>`);
        if (guild.rulesChannel) specialChannels.push(`**Rules:** <#${guild.rulesChannel.id}>`);
        if (guild.publicUpdatesChannel) specialChannels.push(`**Updates:** <#${guild.publicUpdatesChannel.id}>`);
        if (specialChannels.length > 0) {
            embed.addFields({ name: '📌 Special Channels', value: specialChannels.join('\n'), inline: false });
        }
        
        // Banner & Splash
        if (guild.banner) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
        }
        if (guild.splash) {
            embed.setFooter({ text: 'Server Splash Available' });
        }
        
        // Vanity URL
        if (guild.vanityURLCode) {
            embed.addFields({ name: '🔗 Vanity URL', value: `https://discord.gg/${guild.vanityURLCode}`, inline: false });
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};
