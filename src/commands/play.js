const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube/Spotify')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('query');
        const member = interaction.member;
        
        if (!member.voice.channel) {
            return interaction.reply({ content: 'You need to be in a voice channel!', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        const player = await interaction.client.kazagumo.createPlayer({
            guildId: interaction.guild.id,
            voiceId: member.voice.channel.id,
            textId: interaction.channel.id,
            volume: 50
        });
        
        const result = await interaction.client.kazagumo.search(query, { requester: interaction.user });
        
        if (!result.tracks.length) {
            return interaction.editReply({ content: 'No results found!' });
        }
        
        if (result.type === 'PLAYLIST') {
            player.queue.add(result.tracks);
            await interaction.editReply({ content: `Queued ${result.tracks.length} tracks from **${result.playlistName}**` });
        } else {
            player.queue.add(result.tracks[0]);
            await interaction.editReply({ content: `Queued: **${result.tracks[0].title}** by **${result.tracks[0].author}**` });
        }
        
        if (!player.playing && !player.paused) {
            player.play();
        }
    }
};
