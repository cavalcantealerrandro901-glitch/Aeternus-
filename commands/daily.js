const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const daily = require('../utils/daily');
const shop = require('../utils/shop');
const eter = require('../utils/eter');

function panelUrl(guildId) {
    return (
        shop.dashboardPanelUrl?.() ||
        shop.panelUrl?.(guildId) ||
        process.env.PANEL_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        'https://aeternus.onrender.com'
    );
}

function fmt(n) {
    return eter.formatPlain ? eter.formatPlain(n) : Number(n || 0).toLocaleString('pt-BR');
}

function statusEmbed(user, st) {
    const lines = [];

    if (st.claimed) {
        lines.push('Você **já resgatou** a recompensa de hoje.');
        lines.push('A próxima fica disponível após **meia-noite (horário de Brasília)**.');
    } else {
        lines.push('Sua recompensa diária está **disponível**.');
        lines.push('O valor é definido na hora do resgate, dentro da faixa do servidor.');
    }

    lines.push('');
    lines.push(`**Sequência:** ${st.streak || 0} dia(s)`);
    if (!st.claimed) {
        lines.push(`**Próxima sequência:** ${st.nextStreak || 1} dia(s)`);
    }
    lines.push(`**Faixa:** ✨ ${fmt(st.dailyMin)} – ${fmt(st.dailyMax)}`);
    if (st.multiplier && st.multiplier !== 1) {
        lines.push(`**Bônus de nível:** ×${Number(st.multiplier).toFixed(2)} (nível ${st.level || 0})`);
    }
    lines.push(`**Saldo atual:** ✨ ${fmt(st.balance)}`);

    return new EmbedBuilder()
        .setColor(st.claimed ? 0xf59e0b : 0x22c55e)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Recompensa diária')
        .setDescription(lines.join('\n'));
}

function claimEmbed(user, result) {
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Daily resgatado')
        .setDescription(
            [
                `Você recebeu **✨ ${fmt(result.amount)}**.`,
                result.multiplier && result.multiplier !== 1
                    ? `Base ✨ ${fmt(result.base)} · bônus ×${Number(result.multiplier).toFixed(2)}`
                    : null,
                `**Sequência:** ${result.streak} dia(s)`,
                `**Saldo:** ✨ ${fmt(result.balance)}`,
                '',
                'Volte amanhã após meia-noite (Brasília) para manter a sequência.'
            ]
                .filter(Boolean)
                .join('\n')
        );
}

function panelRow(guildId) {
    let url = panelUrl(guildId);
    if (!url.startsWith('http')) url = `https://${url}`;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Abrir painel').setStyle(ButtonStyle.Link).setURL(url)
    );
}

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Recompensa diária de éter',
    data: new SlashCommandBuilder()
        .setName('diario')
        .setDescription('Resgata ou consulta a recompensa diária'),

    async execute(message) {
        const user = message.author;
        const guildId = message.guild?.id;
        const st = daily.status(user.id, guildId);

        if (!st.claimed && typeof daily.claim === 'function') {
            const result = daily.claim(user.id, guildId);
            if (result?.ok) {
                return message.reply({
                    embeds: [claimEmbed(user, result)],
                    components: [panelRow(guildId)]
                });
            }
        }

        return message.reply({
            embeds: [statusEmbed(user, st)],
            components: [panelRow(guildId)]
        });
    },

    async executeSlash(i) {
        const user = i.user;
        const guildId = i.guild?.id;
        const st = daily.status(user.id, guildId);

        if (!st.claimed && typeof daily.claim === 'function') {
            const result = daily.claim(user.id, guildId);
            if (result?.ok) {
                return i.reply({
                    embeds: [claimEmbed(user, result)],
                    components: [panelRow(guildId)]
                });
            }
        }

        return i.reply({
            embeds: [statusEmbed(user, st)],
            components: [panelRow(guildId)]
        });
    }
};
