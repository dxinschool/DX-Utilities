const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const MARK6_API = 'https://api3.marksix6.net/lottery_api.php?type=hk';

function getNumberColor(num) {
    // Mark Six ball colours based on HKJC rules
    const n = parseInt(num);
    if (n >= 1 && n <= 9) return { bg: '#E8B4B4', text: '#CC0000', label: 'Red' };
    if (n >= 10 && n <= 19) return { bg: '#B4D7E8', text: '#0055AA', label: 'Blue' };
    if (n >= 20 && n <= 29) return { bg: '#B4E8B4', text: '#008800', label: 'Green' };
    if (n >= 30 && n <= 39) return { bg: '#E8D4B4', text: '#AA5500', label: 'Orange' };
    if (n >= 40 && n <= 49) return { bg: '#E8B4D7', text: '#AA0055', label: 'Pink' };
    return { bg: '#2F3136', text: '#FFFFFF', label: '' };
}

/** Generate a set of 6 unique random numbers (1-49) + 1 extra number */
function generateQuickPick() {
    const pool = Array.from({ length: 49 }, (_, i) => i + 1);
    const shuffled = [];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const main = pool.slice(0, 6).sort((a, b) => a - b);
    // Extra number drawn from the remaining pool
    const extra = pool[6];
    return { main, extra };
}

function formatBall(num, highlight = false) {
    const { bg, text } = getNumberColor(num);
    const border = highlight ? '**' : '';
    return `${border}${num.toString().padStart(2, ' ')}${border}`;
}

function buildNumbersDisplay(main, extra) {
    const balls = main.map(n => formatBall(n)).join('  ');
    const extraBall = formatBall(extra, true);
    return `\`\`\`ml\n${balls}  ║  ${extraBall}\n\`\`\``;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mark6')
        .setDescription('Mark Six lottery — quick pick or latest results')
        .addSubcommand(sub =>
            sub.setName('pick')
                .setDescription('Generate a random Mark Six quick pick'))
        .addSubcommand(sub =>
            sub.setName('latest')
                .setDescription('Show the latest Mark Six draw result')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'pick') {
            const { main, extra } = generateQuickPick();

            const embed = new EmbedBuilder()
                .setTitle('🎱 Mark Six Quick Pick')
                .setColor(0xFF4444)
                .setDescription(buildNumbersDisplay(main, extra))
                .addFields(
                    { name: '🎯 Your Numbers', value: main.join(', '), inline: true },
                    { name: '⭐ Extra Number', value: extra.toString(), inline: true },
                    { name: '📅 Draw Days', value: 'Tuesday, Thursday, Saturday\n9:30 PM HKT', inline: false }
                )
                .setFooter({ text: 'Good luck! 🍀' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (sub === 'latest') {
            await interaction.deferReply();

            try {
                const res = await axios.get(MARK6_API);
                const data = res.data;

                if (!data || !data.numbers || data.numbers.length < 7) {
                    return interaction.editReply({ content: '❌ Could not fetch latest draw results.' });
                }

                const allNumbers = data.numbers.map(n => parseInt(n));
                const main = allNumbers.slice(0, 6).sort((a, b) => a - b);
                const extra = allNumbers[6];
                const drawId = data.expect || 'N/A';
                const drawDate = data.openTime || 'N/A';
                const waveColors = data.wave ? data.wave.split(',').map(w => w.trim()) : [];
                const zodiacs = data.zodiac ? data.zodiac.split(',').map(z => z.trim()) : [];

                const embed = new EmbedBuilder()
                    .setTitle('🏆 Mark Six Latest Draw')
                    .setColor(0xFFD700)
                    .setDescription(buildNumbersDisplay(main, extra))
                    .addFields(
                        { name: '📋 Draw', value: `**No.** ${drawId}`, inline: true },
                        { name: '🕐 Date', value: drawDate, inline: true },
                        { name: '🎯 Main Numbers', value: main.join(', '), inline: false },
                        { name: '⭐ Extra Number', value: extra.toString(), inline: true }
                    );

                // Add colour breakdown if available
                if (waveColors.length === 7) {
                    const colorCounts = {};
                    for (const c of waveColors) {
                        const cap = c.charAt(0).toUpperCase() + c.slice(1);
                        colorCounts[cap] = (colorCounts[cap] || 0) + 1;
                    }
                    const colorStr = Object.entries(colorCounts)
                        .map(([c, n]) => `${c} ${n}`).join(' · ');
                    embed.addFields({ name: '🎨 Ball Colours', value: colorStr, inline: false });
                }

                // Add zodiac if available
                if (zodiacs.length === 7) {
                    const mainZodiacs = zodiacs.slice(0, 6).join(', ');
                    const extraZodiac = zodiacs[6];
                    embed.addFields(
                        { name: '🐉 Zodiac (Main)', value: mainZodiacs, inline: true },
                        { name: '🐉 Zodiac (Extra)', value: extraZodiac, inline: true }
                    );
                }

                embed.setFooter({ text: 'Source: HKJC Mark Six' }).setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Mark Six API error:', error.message);
                await interaction.editReply({ content: '❌ Error fetching latest draw results.' });
            }
        }
    }
};
