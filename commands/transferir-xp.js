const {
    EmbedBuilder,
    SlashCommandBuilder
} = require('discord.js');
const xp = require('../utils/xp');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function respond(i, payload) {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    if (i.deferred || i.replied) return i.editReply(data);
    return i.reply(data);
}

module.exports = {
    name: 'transferir-xp',
    aliases: ['transferirxp', 'payxp', 'enviarp'],
    description: 'Transferir XP seu para outro usuário',
    data: new SlashCommandBuilder()
        .setName('transferir-xp')
        .setDescription('Transfere XP da sua conta para outro usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem recebe').setRequired(true)
        )
        .addIntegerOption((o) =>
            o
                .setName('quantidade')
                .setDescription('Quanto XP transferir')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(message) {
        return message.reply('Use o slash: `/transferir-xp`.');
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario', true);
        const amount = i.options.getInteger('quantidade', true);
        const from = i.user;

        if (target.bot) return respond(i, '❌ Não é possível transferir XP para bots.');
        if (target.id === from.id) return respond(i, '❌ Você não pode transferir XP para si mesmo.');

        const bal = xp.get(from.id);
        if (bal.xp < amount) {
            return respond(
                i,
                `❌ XP insuficiente. Você tem **${fmt(bal.xp)}** XP.`
            );
        }

        const beforeFrom = bal;
        const beforeTo = xp.get(target.id);
        xp.addXp(from.id, -amount);
        const afterTo = xp.addXp(target.id, amount);
        const afterFrom = xp.get(from.id);

        return respond(i, {
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('⭐ Transferência de XP')
                    .setDescription(
                        [
                            `**De:** <@${from.id}>`,
                            `**Para:** <@${target.id}>`,
                            `**Valor:** **${fmt(amount)}** XP`,
                            '',
                            `Seu XP: **${fmt(beforeFrom.xp)}** → **${fmt(afterFrom.xp)}**`,
                            `XP de <@${target.id}>: **${fmt(beforeTo.xp)}** → **${fmt(afterTo.xp)}** · Nv. **${afterTo.level}**`
                        ].join('\n')
                    )
                    .setTimestamp()
            ]
        });
    }
};
