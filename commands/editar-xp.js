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
    name: 'editar-xp',
    aliases: ['editarxp', 'setxp', 'setar-xp'],
    description: 'Definir o XP total de um usuário (admin)',
    data: new SlashCommandBuilder()
        .setName('editar-xp')
        .setDescription('Define o XP total de um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(true)
        )
        .addIntegerOption((o) =>
            o
                .setName('quantidade')
                .setDescription('Novo XP total (absoluto)')
                .setRequired(true)
                .setMinValue(0)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message) {
        return message.reply('Use o slash: `/editar-xp`.');
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return respond(i, '❌ Apenas administradores.');
        }
        const user = i.options.getUser('usuario', true);
        if (user.bot) return respond(i, '❌ Não é possível editar XP de bots.');
        const amount = i.options.getInteger('quantidade', true);
        const before = xp.get(user.id);
        const result = xp.setXp(user.id, amount);
        return respond(i, {
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('✏️ XP editado')
                    .setDescription(
                        [
                            `**Usuário:** <@${user.id}>`,
                            '',
                            `Antes: **${fmt(before.xp)}** XP · Nv. **${before.level}**`,
                            `Agora: **${fmt(result.xp)}** XP · Nv. **${result.level}**`
                        ].join('\n')
                    )
                    .setTimestamp()
            ]
        });
    }
};
