const {
    EmbedBuilder,
    PermissionFlagsBits,
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
    name: 'dar-xp',
    aliases: ['darxp', 'givexp', 'addxp'],
    description: 'Dar XP a um usuário (admin)',
    data: new SlashCommandBuilder()
        .setName('dar-xp')
        .setDescription('Dar XP a um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem recebe o XP').setRequired(true)
        )
        .addIntegerOption((o) =>
            o
                .setName('quantidade')
                .setDescription('Quantidade de XP a adicionar')
                .setRequired(true)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message) {
        return message.reply('Use o slash: `/dar-xp`.');
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return respond(i, '❌ Apenas administradores.');
        }
        const user = i.options.getUser('usuario', true);
        if (user.bot) return respond(i, '❌ Não é possível dar XP a bots.');
        const amount = i.options.getInteger('quantidade', true);
        const before = xp.get(user.id);
        const result = xp.addXp(user.id, amount);
        return respond(i, {
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('⭐ XP adicionado')
                    .setDescription(
                        [
                            `**Usuário:** <@${user.id}>`,
                            `**+${fmt(amount)}** XP`,
                            '',
                            `Antes: **${fmt(before.xp)}** XP · Nv. **${before.level}**`,
                            `Agora: **${fmt(result.xp)}** XP · Nv. **${result.level}**`,
                            result.leveled
                                ? `\n🎉 Subiu de nível! (${result.oldLevel} → ${result.level})`
                                : ''
                        ]
                            .filter(Boolean)
                            .join('\n')
                    )
                    .setTimestamp()
            ]
        });
    }
};
