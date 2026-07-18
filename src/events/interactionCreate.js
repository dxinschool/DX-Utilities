const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
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
            // Handle verification button - opens modal
            if (interaction.customId === 'verify_open_modal') {
                return handleVerifyModal(interaction);
            }
            
            // Check if music system is available
            if (!interaction.client.lavalinkReady) {
                return interaction.reply({ content: 'Music system is currently unavailable', ephemeral: true });
            }
            
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
                        if (interaction.client.currentTracks) interaction.client.currentTracks.delete(player.guildId);
                        if (interaction.client.previousTracks) interaction.client.previousTracks.delete(player.guildId);
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
                        const history = interaction.client.previousTracks && interaction.client.previousTracks.get(interaction.guild.id);
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
                const track = player.data.get('currentTrack') || (interaction.client.currentTracks && interaction.client.currentTracks.get(player.guildId));
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
        
        // Handle modal submission for verification
        if (interaction.isModalSubmit() && interaction.customId === 'verify_modal_submit') {
            try {
                return await handleVerifySubmit(interaction);
            } catch (error) {
                console.error('Verification submit error:', error);
                return await interaction.reply({ content: '❌ Something went wrong, please try again.', ephemeral: true });
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

async function handleVerifyModal(interaction) {
    const db = interaction.client.db;
    const guildId = interaction.guild.id;
    
    db.get(`SELECT * FROM verify_config WHERE guild_id = ?`, [guildId], async (err, config) => {
        if (!config) {
            await interaction.reply({ content: 'Verification not set up on this server', ephemeral: true });
            return;
        }
        
        const modal = new ModalBuilder()
            .setCustomId('verify_modal_submit')
            .setTitle('Server Verification')
            .addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('verify_answer')
                            .setLabel('Are you a human? (Type "yes")')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setPlaceholder('yes')
                    )
            );
        
        await interaction.showModal(modal);
    });
}

async function handleVerifySubmit(interaction) {
    const db = interaction.client.db;
    const guildId = interaction.guild.id;
    const answer = interaction.fields.getTextInputValue('verify_answer').toLowerCase().trim();
    
    if (answer !== 'yes') {
        await interaction.reply({ content: '❌ Please type "yes" to verify', ephemeral: true });
        return;
    }
    
    db.get(`SELECT * FROM verify_config WHERE guild_id = ?`, [guildId], async (err, config) => {
        if (err) {
            console.error('Database error in verification:', err);
            await interaction.reply({ content: '❌ Database error, please try again.', ephemeral: true });
            return;
        }
        if (!config) {
            await interaction.reply({ content: 'Verification not set up on this server', ephemeral: true });
            return;
        }
        
        const role = interaction.guild.roles.cache.get(config.role_id);
        if (!role) {
            await interaction.reply({ content: 'Verification role not found', ephemeral: true });
            return;
        }
        
        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        try {
            await member.roles.add(role);
            await interaction.reply({ content: `✅ Verified! You now have the ${role.name} role.`, ephemeral: true });
        } catch (roleError) {
            console.error('Role add error:', roleError);
            if (roleError.code === 50013) {
                await interaction.reply({ content: '❌ Bot lacks permission to assign roles. Please check server permissions.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Failed to assign role. Please contact an admin.', ephemeral: true });
            }
        }
    });
}
