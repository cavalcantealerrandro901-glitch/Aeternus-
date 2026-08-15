const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    name: 'status',
    async execute(message) {
        const uptime = process.uptime();
        const dias = Math.floor(uptime / 86400);
        const horas = Math.floor(uptime / 3600) % 24;
        const minutos = Math.floor(uptime / 60) % 60;

        const embed = new EmbedBuilder()
            .setTitle('🖥️ Painel de Hospedagem')
            .setColor('#0099ff')
            .addFields(
                { name: '⏳ Tempo Online (Uptime)', value: `${dias}d ${horas}h ${minutos}m`, inline: true },
                { name: '📶 Latência (Ping)', value: `${Date.now() - message.createdTimestamp}ms`, inline: true },
                { name: '💾 Memória RAM', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '🌐 Plataforma', value: `${os.platform()} (${os.arch()})`, inline: false }
            )
            .setFooter({ text: 'Sistema de Monitoramento Aeternus' });

        message.reply({ embeds: [embed] });
    }
};
