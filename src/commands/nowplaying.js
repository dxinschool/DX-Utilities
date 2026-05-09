const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatTime } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Display currently playing song with controls'),
    async execute(interaction) {
        const player = interaction.client.kazagumo.players.get(interaction.guild.id);
        
        if (!player || !player.data.get('currentTrack')) {
            return interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
        }
        
        await interaction.deferReply();
        const embed = createNowPlayingEmbed(player);
        const rows = createControlButtons(player);
        
        const message = await interaction.editReply({ 
            embeds: [embed], 
            components: rows,
            fetchReply: true 
        });
        
        player.data.set('nowPlayingMsg', message);
    }
};

function createNowPlayingEmbed(player, trackParam) {
    const track = trackParam || player.data.get('currentTrack') || (global.currentTracks && global.currentTracks.get(player.guildId));
    if (!track) {
        return new EmbedBuilder()
            .setTitle('Nothing Playing')
            .setColor(player.data.get('embedColor') || 0x00AE86)
            .setDescription('No track is currently playing.');
    }
    
    const position = player.position || 0;
    const volume = player.volume || 50;
    const loopModes = ['Off', 'Track', 'Queue'];
    const loopStatus = loopModes[player.loop] || 'Off';
    const shuffleStatus = player.data.get('shuffleEnabled') ? 'On' : 'Off';
    
    const color = trackParam ? getRandomColor() : (player.data.get('embedColor') || getRandomColor());
    
    const embed = new EmbedBuilder()
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.uri})**\nby **${track.author}**`)
        .setColor(color)
        .addFields(
            { name: '⏱ Progress', value: `${formatTime(position)} / ${formatTime(track.length)}`, inline: true },
            { name: '🔊 Volume', value: `${volume}%`, inline: true },
            { name: '🔁 Loop', value: loopStatus, inline: true },
            { name: '🔀 Shuffle', value: shuffleStatus, inline: true },
            { name: '👤 Requested by', value: `<@${track.requester?.id || 'Unknown'}>`, inline: false }
        )
        .setTimestamp();
    
    if (track.thumbnail) {
        embed.setImage(track.thumbnail);
    }
    
    const progress = Math.floor((position / track.length) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
    embed.addFields({ name: 'Progress', value: `\`${bar}\``, inline: false });
    
    if (!player.data.get('embedColor')) {
        player.data.set('embedColor', color);
    }
    
    return embed;
}

function createControlButtons(player) {
    const isPaused = player.paused;
    
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_volume_down')
                .setEmoji('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_volume_up')
                .setEmoji('🔊')
                .setStyle(ButtonStyle.Secondary)
        );
    
    const shuffleEnabled = player.data.get('shuffleEnabled') || false;
    
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji('🔁')
                .setStyle(player.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setEmoji('🔀')
                .setStyle(shuffleEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
    
    return [row1, row2];
}

function getRandomColor() {
    return Math.floor(Math.random() * 0xFFFFFF);
}

module.exports.createNowPlayingEmbed = createNowPlayingEmbed;
module.exports.createControlButtons = createControlButtons;
