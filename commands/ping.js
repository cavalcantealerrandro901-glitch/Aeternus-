const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

function formatDuration(ms) {
    const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return [
        days ? `${days}d` : null,
        hours ? `${hours}h` : null,
        minutes ? `${minutes}min` : null,
        `${seconds}s`
    ].filter(Boolean).join(' ');
}

function buildEmbed(client, roundTrip) {
    const apiPing = Number(client.ws.ping);
    const apiText = Number.isFinite(apiPing) && apiPing >= 0
        ? `${Math.round(apiPing)} ms`
        : 'Calculando…';

    return new EmbedBuilder()
        .setColor(0x6366f1)
        .setAuthor({
            name: 'AETERNUS • SISTEMA',
            iconURL: client.user.displayAvatarURL({ size: 64 })
        })
        .setTitle('🏓 Diagnóstico de latência')
        .setDescription('Medição da conexão do bot e do tempo de resposta.')
        .addFields(
            { name: '🌐 Gateway Discord', value: `**${apiText}**`, inline: true },
            { name: '⚡ Resposta', value: `**${Math.max(0, Math.round(roundTrip))} ms**`, inline: true },
            { name: '⏱️ Disponibilidade', value: `**${formatDuration(client.uptime)}**`, inline: false }
        )
        .setFooter({ text: 'Aeternus • Monitoramento' })
        .setTimestamp();
}

module.exports = {
    name: 'ping',
    aliases: ['latencia'],
    description: 'Verifica latência e disponibilidade do bot',
    data: new SlashCommandBuilder()
        .setName('latencia')
        .setDescription('Verifica latência e disponibilidade do Aeternus'),

    async execute(message) {
        const startedAt = Date.now();
        const sent = await message.reply({ content: '🏓 Verificando conexão…' });
        const roundTrip = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit({ content: null, embeds: [buildEmbed(message.client, roundTrip)] });
    },

    async executeSlash(interaction) {
        const startedAt = Date.now();
        await interaction.reply({ content: '🏓 Verificando conexão…' });
        const roundTrip = Date.now() - startedAt;
        await interaction.editReply({
            content: null,
            embeds: [buildEmbed(interaction.client, roundTrip)]
        });
    }
};
