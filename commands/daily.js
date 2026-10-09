const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

const DAILY_IMAGE = 'https://images.weserv.nl/?url=raw.githubusercontent.com/cavalcantealerrandro901-glitch/Aeternus-/main/public/images/daily-reward.svg&output=png';

function fmt(n) {
    if (typeof eter.formatPlain === 'function') return eter.formatPlain(n);
    return Number(n || 0).toLocaleString('pt-BR');
}
function isPartnerGuild(guildId) {
    if (!guildId) return false;
    return String(process.env.PARTNER_GUILD_IDS || '').split(',').map(id => id.trim()).filter(Boolean).includes(String(guildId));
}
function embed(user, st, result = null, already = false, guildId = null) {
    const streak = result?.streak ?? st?.streak ?? 0;
    const balance = result?.balance ?? st?.balance ?? eter.get(user.id);
    const lines = [];
    if (result) {
        lines.push(`🎉 Você recebeu **✨ ${fmt(result.amount)} éter**!`);
        if (result.levelMultiplier && result.levelMultiplier !== 1) lines.push(`Bônus de nível: **×${Number(result.levelMultiplier).toFixed(2)}**`);
        if (result.partner) lines.push('🤝 **Bônus de parceria ×2** aplicado neste servidor.');
        lines.push('', `🔥 **Sequência:** ${streak} dia(s)`, `✨ **Saldo:** ${fmt(balance)}`, 'Volte amanhã após a meia-noite (Brasília) para manter sua sequência.');
    } else if (already) {
        lines.push('⏳ Você **já resgatou** sua recompensa de hoje.', 'A próxima recompensa libera após a meia-noite (Brasília).', '', `🔥 **Sequência:** ${streak} dia(s)`, `✨ **Saldo:** ${fmt(balance)}`);
        if (isPartnerGuild(guildId)) lines.push('🤝 Este é um servidor parceiro.');
    } else {
        lines.push('🎁 Clique no botão abaixo para resgatar sua recompensa diária.', '', `🔥 **Sequência atual:** ${streak} dia(s)`, `✨ **Saldo:** ${fmt(balance)}`);
        if (isPartnerGuild(guildId)) lines.push('🤝 **Servidor parceiro:** bônus ×2 no daily.');
    }
    return new EmbedBuilder().setColor(0x1677ff).setTitle('✦ AETERNUS • RECOMPENSA DIÁRIA')
        .setDescription(lines.join('\n')).setImage(DAILY_IMAGE)
        .setFooter({ text: '✧ Aeternus Economy • Reinício à meia-noite (Brasília)' });
}
function row(disabled = false) {
    return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('daily:claim')
        .setLabel('RESGATAR DAILY').setEmoji('🎁').setStyle(ButtonStyle.Primary).setDisabled(disabled));
}
async function run(user, guildId) {
    const st = daily.status(user.id, guildId);
    return { embeds: [embed(user, st, null, st.claimed, guildId)], components: [row(st.claimed)] };
}
async function handleComponent(interaction) {
    if (interaction.customId !== 'daily:claim') return;
    const guildId = interaction.guild?.id;
    const st = daily.status(interaction.user.id, guildId);
    if (st.claimed) return interaction.update({ embeds: [embed(interaction.user, st, null, true, guildId)], components: [row(true)] });
    const result = daily.claim(interaction.user.id, guildId);
    if (!result?.ok) {
        const again = daily.status(interaction.user.id, guildId);
        return interaction.update({ embeds: [embed(interaction.user, again, null, true, guildId)], components: [row(true)] });
    }
    return interaction.update({ embeds: [embed(interaction.user, result, result, false, guildId)], components: [row(true)] });
}
module.exports = {
    name: 'daily', aliases: ['diario'], description: 'Mostra e resgata a recompensa diária de éter',
    data: new SlashCommandBuilder().setName('daily').setDescription('Mostra e resgata a recompensa diária de éter'),
    async execute(message) { return message.reply(await run(message.author, message.guild?.id)); },
    async executeSlash(interaction) { return interaction.reply(await run(interaction.user, interaction.guild?.id)); },
    handleComponent
};
