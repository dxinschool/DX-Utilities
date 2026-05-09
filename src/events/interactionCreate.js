const { Events } = require('discord.js');
const nowplaying = require('../commands/nowplaying');
const search = require('../commands/search');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const reply = { content: 'There was an error executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
            return;
        }
        
        if (interaction.isButton()) {
            const player = interaction.client.kazagumo.players.get(interaction.guild.id);
            
            if (interaction.customId.startsWith('search_play_')) {
                return handleSearchPlay(interaction, player);
            }
            
            if (!player) {
                return interaction.reply({ content: 'No player found!', ephemeral: true });
            }
            
            const member = interaction.member;
            if (!member.voice.channel || member.voice.channel.id !== player.voiceId) {
                return interaction.reply({ content: 'You must be in the same voice channel!', ephemeral: true });
            }
            
            try {
                switch (interaction.customId) {
                    case 'music_pause':
                        player.pause(!player.paused);
                        break;
                    case 'music_skip':
                        player.skip();
                        break;
                    case 'music_stop':
                        player.queue.clear();
                        player.destroy();
                        player.data.set('currentTrack', null);
                        player.data.set('embedColor', null);
                        if (global.currentTracks) global.currentTracks.delete(player.guildId);
                        if (global.previousTracks) global.previousTracks.delete(player.guildId);
                        break;
                    case 'music_volume_down':
                        player.setVolume(Math.max(0, player.volume - 10));
                        break;
                    case 'music_volume_up':
                        player.setVolume(Math.min(100, player.volume + 10));
                        break;
                    case 'music_loop':
                        const loopModes = ['off', 'track', 'queue'];
                        const currentLoop = player.loop || 'off';
                        const nextIndex = (loopModes.indexOf(currentLoop) + 1) % loopModes.length;
                        player.setLoop(loopModes[nextIndex]);
                        break;
                    case 'music_shuffle':
                        const currentShuffle = player.data.get('shuffleEnabled') || false;
                        player.data.set('shuffleEnabled', !currentShuffle);
                        if (!currentShuffle) {
                            player.queue.shuffle();
                        }
                        break;
                    case 'music_previous':
                        const history = global.previousTracks && global.previousTracks.get(interaction.guild.id);
                        if (!history || history.length === 0) {
                            await interaction.reply({ content: 'No previous track!', ephemeral: true });
                            return;
                        }
                        const prevTrack = history.pop();
                        player.queue.add(prevTrack, { requester: prevTrack.requester });
                        if (player.playing) {
                            player.skip();
                        } else {
                            player.play();
                        }
                        await interaction.reply({ content: 'Playing previous track!', ephemeral: true });
                        return;
                    default:
                        return;
                }
                
                // Update the nowplaying embed with current data
                const track = player.data.get('currentTrack') || (global.currentTracks && global.currentTracks.get(player.guildId));
                if (track) {
                    const embed = nowplaying.createNowPlayingEmbed(player, track);
                    const buttons = nowplaying.createControlButtons(player);
                    await interaction.update({ embeds: [embed], components: buttons });
                } else {
                    await interaction.update({ content: 'Nothing is playing!', embeds: [], components: [] });
                }
                
            } catch (error) {
                console.error('Button interaction error:', error);
                await interaction.reply({ content: 'Error processing action!', ephemeral: true });
            }
        }
    }
};

async function handleSearchPlay(interaction, player) {
    const parts = interaction.customId.split('_');
    const index = parseInt(parts[2]);
    const userId = parts[3];
    
    const tracks = search.searchResults.get(userId);
    if (!tracks || index >= tracks.length) {
        return interaction.reply({ content: 'Search results expired or invalid!', ephemeral: true });
    }
    
    const track = tracks[index];
    const member = interaction.member;
    
    if (!member.voice.channel) {
        return interaction.reply({ content: 'You need to be in a voice channel!', ephemeral: true });
    }
    
    try {
        if (!player) {
            const newPlayer = await interaction.client.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                voiceId: member.voice.channel.id,
                textId: interaction.channel.id,
                volume: 50
            });
            newPlayer.queue.add(track);
            newPlayer.play();
            await interaction.reply({ content: `Now playing: **${track.title}**`, ephemeral: true });
        } else {
            player.queue.add(track);
            if (!player.playing && !player.paused) {
                player.play();
            }
            await interaction.reply({ content: `Added to queue: **${track.title}**`, ephemeral: true });
        }
    } catch (error) {
        console.error('Search play error:', error);
        await interaction.reply({ content: 'Error playing track!', ephemeral: true });
    }
}
