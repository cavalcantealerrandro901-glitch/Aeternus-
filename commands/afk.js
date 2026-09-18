const { SlashCommandBuilder } = require('discord.js');
const afk = require('../utils/afk');

function fmtSince(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'min';
}

function buildAfkText(user, reason, sinceMs) {
    const ms = Math.max(0, Number(sinceMs) || 0);
    const totalMin = Math.floor(ms / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    let horasLabel;
    if (hours <= 0) {
        horasLabel = mins <= 0 ? 'menos de 1 min' : mins + ' min';
    } else if (mins === 0) {
        horasLabel = hours + 'h';
    } else {
        horasLabel = hours + 'h ' + mins + 'min';
    }
    return [
        '💤 ' + user.toString() + ' está ausente',
        'Horas: ' + horasLabel,
        'Motivo: ' + (reason || 'Ausente')
    ].join('\n');
}

module.exports = {
    name: 'afk',
    aliases: ['ausente'],
    description: 'Marca você como ausente',
    data: new SlashCommandBuilder()
        .setName('ausente')
        .setDescription('Marca você como ausente (AFK)')
        .addStringOption((o) =>
            o
                .setName('motivo')
                .setDescription('Motivo da ausência')
                .setRequired(false)
                .setMaxLength(180)
        ),

    async execute(message, args) {
        if (afk.has(message.author.id)) {
            const prev = afk.get(message.author.id);
            afk.clear(message.author.id);
            return message.reply(
                '👋 Bem-vindo de volta, ' +
                    message.author.toString() +
                    '! AFK removido' +
                    (prev?.at
                        ? ' (ausente por **' + fmtSince(Date.now() - prev.at) + '**).'
                        : '.')
            );
        }

        const reason = args.join(' ').trim().slice(0, 180) || 'Ausente no momento';
        afk.set(message.author.id, reason);

        return message.reply(buildAfkText(message.author, reason, 0));
    },

    async executeSlash(i) {
        if (afk.has(i.user.id)) {
            const prev = afk.get(i.user.id);
            afk.clear(i.user.id);
            return i.reply(
                '👋 Bem-vindo de volta, ' +
                    i.user.toString() +
                    '! AFK removido' +
                    (prev?.at
                        ? ' (ausente por **' + fmtSince(Date.now() - prev.at) + '**).'
                        : '.')
            );
        }

        const reason = (i.options.getString('motivo') || 'Ausente no momento').slice(0, 180);
        afk.set(i.user.id, reason);

        return i.reply(buildAfkText(i.user, reason, 0));
    }
};
