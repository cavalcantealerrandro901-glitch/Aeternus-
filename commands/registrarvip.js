const {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const vip = require('../utils/vip');

const COLOR = 0xa78bfa;

function isMod(member) {
    if (!member) return false;
    return (
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
    name: 'registrarvip',
    aliases: ['regvip', 'addvip', 'setvip'],
    description: 'Registrar VIP de um membro',
    data: new SlashCommandBuilder()
        .setName('registrar-vip')
        .setDescription('Registrar o VIP que o membro comprou')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Membro').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('plano')
                .setDescription('Tipo de VIP (ex: VIP, VIP+, MVP)')
                .setRequired(true)
        )
        .addIntegerOption((o) =>
            o
                .setName('dias')
                .setDescription('Dura\u00e7\u00e3o em dias (0 = permanente)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(3650)
        )
        .addStringOption((o) =>
            o.setName('nota').setDescription('Observa\u00e7\u00e3o opcional').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permiss\u00e3o. Precisa de **Gerenciar Servidor**.');
        }
        const user =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));
        if (!user) {
            return message.reply(
                'Uso: `O.registrarvip @usu\u00e1rio <plano> [dias] [nota]`\nEx: `O.registrarvip @joao VIP+ 30`'
            );
        }
        const rest = args.filter((a) => !a.includes(user.id) && !a.startsWith('<'));
        const plano = rest[0];
        if (!plano) {
            return message.reply('Informe o plano. Ex: `VIP`, `VIP+`, `MVP`.');
        }
        let dias = 0;
        let nota = '';
        if (rest[1] != null && /^\d+$/.test(rest[1])) {
            dias = parseInt(rest[1], 10);
            nota = rest.slice(2).join(' ').trim();
        } else {
            nota = rest.slice(1).join(' ').trim();
        }

        const rec = vip.register({
            guildId: message.guild.id,
            userId: user.id,
            tier: plano,
            registeredBy: message.author.id,
            days: dias,
            note: nota
        });

        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('VIP registrado')
            .setDescription(`**${user}** \u00b7 plano **${rec.tier}**`)
            .addFields(
                {
                    name: 'Dura\u00e7\u00e3o',
                    value: rec.expiresAt ? `${dias} dia(s)` : 'Permanente',
                    inline: true
                },
                {
                    name: 'Expira',
                    value: rec.expiresAt
                        ? `<t:${Math.floor(rec.expiresAt / 1000)}:D>`
                        : 'N\u00e3o expira',
                    inline: true
                },
                {
                    name: 'Registrado por',
                    value: `${message.author}`,
                    inline: true
                }
            );
        if (rec.note) emb.addFields({ name: 'Nota', value: rec.note });

        await message.reply({ embeds: [emb] });
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permiss\u00e3o. Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }
        const user = i.options.getUser('usuario', true);
        const plano = i.options.getString('plano', true);
        const dias = i.options.getInteger('dias') ?? 0;
        const nota = i.options.getString('nota') || '';

        const rec = vip.register({
            guildId: i.guild.id,
            userId: user.id,
            tier: plano,
            registeredBy: i.user.id,
            days: dias,
            note: nota
        });

        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('VIP registrado')
            .setDescription(`**${user}** \u00b7 plano **${rec.tier}**`)
            .addFields(
                {
                    name: 'Dura\u00e7\u00e3o',
                    value: rec.expiresAt ? `${dias} dia(s)` : 'Permanente',
                    inline: true
                },
                {
                    name: 'Expira',
                    value: rec.expiresAt
                        ? `<t:${Math.floor(rec.expiresAt / 1000)}:D>`
                        : 'N\u00e3o expira',
                    inline: true
                },
                {
                    name: 'Registrado por',
                    value: `${i.user}`,
                    inline: true
                }
            );
        if (rec.note) emb.addFields({ name: 'Nota', value: rec.note });

        await i.reply({ embeds: [emb] });
    }
};
