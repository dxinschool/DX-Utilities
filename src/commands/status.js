const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const process = require('process');
const { getRandomColor, formatBytes, formatTime } = require('../utils/helpers');

function getUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Display bot and system status information'),
    async execute(interaction) {
        await interaction.deferReply();
        
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(2);
        
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;
        const cpuUsage = os.loadavg();
        
        const embed = new EmbedBuilder()
            .setTitle('🖥️ System Status')
            .setColor(getRandomColor())
            .setTimestamp();
        
        // Bot Info
        embed.addFields({
            name: '🤖 Bot Info',
            value: `**Node.js:** ${process.version}\n**Discord.js:** ${require('discord.js').version || '14.x'}\n**Uptime:** ${getUptime(process.uptime())}\n**PID:** ${process.pid}\n**Platform:** ${process.platform}`,
            inline: false
        });
        
        // System Info
        embed.addFields({
            name: '💻 System Info',
            value: `**OS:** ${os.type()} ${os.release()}\n**Arch:** ${os.arch()}\n**Hostname:** ${os.hostname()}\n**Uptime:** ${getUptime(os.uptime())}`,
            inline: false
        });
        
        // CPU Info
        embed.addFields({
            name: '🔧 CPU',
            value: `**Model:** ${cpuModel}\n**Cores:** ${cpuCores}\n**Threads:** ${cpuCores}\n**Load (1/5/15m):** ${cpuUsage.map(l => l.toFixed(2)).join(' / ')}`,
            inline: true
        });
        
        // Memory Info
        embed.addFields({
            name: '🧠 Memory',
            value: `**Total:** ${formatBytes(totalMem)}\n**Used:** ${formatBytes(usedMem)} (${memPercent}%)\n**Free:** ${formatBytes(freeMem)}`,
            inline: true
        });
        
        // Process Memory
        const memUsage = process.memoryUsage();
        embed.addFields({
            name: '📊 Bot Memory',
            value: `**RSS:** ${formatBytes(memUsage.rss)}\n**Heap Used:** ${formatBytes(memUsage.heapUsed)} / ${formatBytes(memUsage.heapTotal)}\n**External:** ${formatBytes(memUsage.external)}\n**Array Buffers:** ${formatBytes(memUsage.arrayBuffers || 0)}`,
            inline: false
        });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
