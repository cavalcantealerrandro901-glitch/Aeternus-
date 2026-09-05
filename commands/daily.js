const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

function fmt(n) {
    if (typeof eter.formatPlain === 'function') return eter.formatPlain(n);
    return Number(n || 0).toLocaleString('pt-BR');
}

function claimEmbed(user, result) {
    const lines = [
        `Você recebeu **✨ ${fmt(result.amount)}**.`,
        result.multiplier && result.multiplier !== 1
            ? `Base ✨ ${fmt(result.base)} · bônus ×${Number(result.multiplier).toFixed(2)}`
            : null,
        `**Sequência:** ${result.streak} dia(s)`,
        `**Saldo:** ✨ ${fmt(result.balance)}`,
        '',
        'Volte amanhã após **meia-noite (Brasília)** para manter a sequência.'
    ].filter(Boolean);

    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Daily resgatado')
        .setDescription(lines.join('\n'));
}

function alreadyEmbed(user, st) {
    const lines = [
        'Você **já resgatou** o daily de hoje.',
        'A próxima recompensa libera após **meia-noite (Brasília)**.',
        '',
        `**Sequência:** ${st.streak || 0} dia(s)`,
        `**Faixa:** ✨ ${fmt(st.dailyMin)} – ${fmt(st.dailyMax)}`,
        st.multiplier && st.multiplier !== 1
            ? `**Bônus de nível:** ×${Number(st.multiplier).toFixed(2)} (nível ${st.level || 0})`
            : null,
        `**Saldo:** ✨ ${fmt(st.balance)}`
    ].filter(Boolean);

    return new EmbedBuilder()
        .setColor(0xf59e0b)
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Daily já coletado')
        .setDescription(lines.join('\n'));
}

function failEmbed(msg) {
    return new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Daily')
        .setDescription(String(msg || 'Não foi possível resgatar.').slice(0, 400));
}

async function run(user, guildId) {
    const st = daily.status(user.id, guildId);

    if (st.claimed) {
        return { embeds: [alreadyEmbed(user, st)] };
    }

    if (typeof daily.claim !== 'function') {
        return { embeds: [failEmbed('Sistema de daily indisponível.')] };
    }

    const result = daily.claim(user.id, guildId);

    if (!result?.ok) {
        // race: já coletado entre status e claim
        if (result?.error) {
            const again = daily.status(user.id, guildId);
            if (again.claimed) return { embeds: [alreadyEmbed(user, again)] };
            return { embeds: [failEmbed(result.error)] };
        }
        return { embeds: [failEmbed('Não foi possível resgatar o daily.')] };
    }

    return { embeds: [claimEmbed(user, result)] };
}

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Resgata a recompensa diária de éter',
    data: new SlashCommandBuilder()
        .setName('diario')
        .setDescription('Resgata a recompensa diária de éter'),

    async execute(message) {
        const payload = await run(message.author, message.guild?.id);
        return message.reply(payload);
    },

    async executeSlash(i) {
        const payload = await run(i.user, i.guild?.id);
        return i.reply(payload);
    }
};
