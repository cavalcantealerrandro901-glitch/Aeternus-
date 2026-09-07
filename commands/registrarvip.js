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

async function notifyUserVip(client, user, rec, days) {
    try {
        const label = vip.vipLabel(rec);
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('VIP ativado')
            .setDescription(
                [
                    `Seu **${label}** foi registrado com sucesso.`,
                    '',
                    rec.expiresAt
                        ? `Válido até <t:${Math.floor(rec.expiresAt / 1000)}:D> (**${days}** dia(s)).`
                        : 'Plano **permanente**.',
                    '',
                    'Confira a qualquer momento com **`O.vervip`** ou **`/ver-vip`**.'
                ].join('\n')
            )
            .addFields({ name: 'VIP', value: `**${label}**`, inline: true });
        await user.send({ embeds: [emb] });
    } catch (_) {}
}

module.exports = {
    name: 'registrarvip',
    aliases: ['regvip', 'addvip', 'setvip'],
    description: 'Registrar VIP de um membro',
    data: new SlashCommandBuilder()
        .setName('registrar-vip')
        .setDescription('Registrar qual VIP o membro comprou')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Membro').setRequired(true)
        )
        .addStringOption((o) => {
            o.setName('vip')
                .setDescription('Qual VIP ele comprou')
                .setRequired(true);
            for (const p of vip.PLANOS) {
                o.addChoices({ name: p, value: p });
            }
            return o;
        })
        .addIntegerOption((o) =>
            o
                .setName('dias')
                .setDescription('Duração em dias (0 = permanente)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(3650)
        )
        .addStringOption((o) =>
            o
                .setName('outro')
                .setDescription('Se o VIP não estiver na lista, escreva aqui o nome')
                .setRequired(false)
        )
        .addStringOption((o) =>
            o.setName('nota').setDescription('Observação opcional').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão. Precisa de **Gerenciar Servidor**.');
        }
        const user =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));
        if (!user) {
            return message.reply(
                'Uso: `O.registrarvip @usuário <VIP> [dias] [nota]`\n' +
                    'Ex: `O.registrarvip @joao VIP+ 30`\n' +
                    `Planos: ${vip.PLANOS.join(', ')} (ou qualquer nome)`
            );
        }
        const rest = args.filter((a) => !a.includes(user.id) && !a.startsWith('<'));
        const vipName = rest[0];
        if (!vipName) {
            return message.reply(
                `Informe qual VIP. Ex: ${vip.PLANOS.map((p) => '`' + p + '`').join(', ')}`
            );
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
            vipName,
            registeredBy: message.author.id,
            days: dias,
            note: nota
        });

        const label = vip.vipLabel(rec);
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('VIP registrado')
            .setDescription(`${user} agora está com **${label}**`)
            .addFields(
                { name: 'VIP', value: `**${label}**`, inline: true },
                {
                    name: 'Duração',
                    value: rec.expiresAt ? `${dias} dia(s)` : 'Permanente',
                    inline: true
                },
                {
                    name: 'Expira',
                    value: rec.expiresAt
                        ? `<t:${Math.floor(rec.expiresAt / 1000)}:D>`
                        : 'Não expira',
                    inline: true
                },
                { name: 'Registrado por', value: `${message.author}`, inline: true }
            );
        if (rec.note) emb.addFields({ name: 'Nota', value: rec.note });

        await message.reply({ embeds: [emb] });
        await notifyUserVip(message.client, user, rec, dias);
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão. Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }
        const user = i.options.getUser('usuario', true);
        const outro = i.options.getString('outro');
        const vipName = (outro && outro.trim()) || i.options.getString('vip', true);
        const dias = i.options.getInteger('dias') ?? 0;
        const nota = i.options.getString('nota') || '';

        const rec = vip.register({
            guildId: i.guild.id,
            userId: user.id,
            vipName,
            registeredBy: i.user.id,
            days: dias,
            note: nota
        });

        const label = vip.vipLabel(rec);
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('VIP registrado')
            .setDescription(`${user} agora está com **${label}**`)
            .addFields(
                { name: 'VIP', value: `**${label}**`, inline: true },
                {
                    name: 'Duração',
                    value: rec.expiresAt ? `${dias} dia(s)` : 'Permanente',
                    inline: true
                },
                {
                    name: 'Expira',
                    value: rec.expiresAt
                        ? `<t:${Math.floor(rec.expiresAt / 1000)}:D>`
                        : 'Não expira',
                    inline: true
                },
                { name: 'Registrado por', value: `${i.user}`, inline: true }
            );
        if (rec.note) emb.addFields({ name: 'Nota', value: rec.note });

        await i.reply({ embeds: [emb] });
        await notifyUserVip(i.client, user, rec, dias);
    }
};
