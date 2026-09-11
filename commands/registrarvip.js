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

async function notifyUserPurchase(client, user, rec) {
    try {
        const label = vip.vipLabel(rec);
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('Compra registrada')
            .setDescription(
                [
                    `Sua compra de **${label}** foi registrada com sucesso.`,
                    rec.roleId ? `Cargo: <@&${rec.roleId}>` : '',
                    '',
                    'Confira com **`O.veranotacoes`** ou **`/ver-anotacoes`**.'
                ]
                    .filter(Boolean)
                    .join('\n')
            );
        await user.send({ embeds: [emb] });
    } catch (_) {}
}

async function tryAssignRole(guild, userId, roleId) {
    if (!roleId) return { ok: false, reason: 'sem cargo' };
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return { ok: false, reason: 'membro não encontrado' };
        const role =
            guild.roles.cache.get(roleId) ||
            (await guild.roles.fetch(roleId).catch(() => null));
        if (!role) return { ok: false, reason: 'cargo não encontrado' };
        await member.roles.add(role, 'Registro de compra VIP');
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: e?.message || 'falha ao adicionar cargo' };
    }
}

function buildConfirmEmbed({ user, rec, by, roleAssign }) {
    const label = vip.vipLabel(rec);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Compra registrada')
        .setDescription(`Registro de **compra** para ${user}`)
        .addFields(
            { name: 'Tipo', value: '**Compra**', inline: true },
            { name: 'Nome', value: `**${label}**`, inline: true },
            {
                name: 'Cargo',
                value: rec.roleId ? `<@&${rec.roleId}>` : rec.roleName || '—',
                inline: true
            },
            {
                name: 'Data / hora',
                value: rec.registeredAt
                    ? `<t:${Math.floor(rec.registeredAt / 1000)}:F>`
                    : '—',
                inline: true
            },
            { name: 'Registrado por', value: `${by}`, inline: true }
        )
        .setTimestamp();
    if (rec.note) emb.addFields({ name: 'Nota', value: rec.note });
    if (roleAssign) {
        emb.addFields({
            name: 'Cargo no membro',
            value: roleAssign.ok
                ? '✅ Cargo adicionado'
                : `⚠️ Não foi possível adicionar: ${roleAssign.reason}`,
            inline: false
        });
    }
    return emb;
}

module.exports = {
    name: 'registrarvip',
    aliases: ['registrar', 'regvip', 'addvip', 'setvip'],
    description: 'Registrar compra VIP de um membro',
    data: new SlashCommandBuilder()
        .setName('registrar')
        .setDescription('Registrar compra (VIP) de um membro')
        .addStringOption((o) =>
            o
                .setName('tipo')
                .setDescription('Tipo de registro')
                .setRequired(true)
                .addChoices({ name: 'Compra', value: 'compra' })
        )
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem comprou').setRequired(true)
        )
        .addRoleOption((o) =>
            o.setName('cargo').setDescription('Cargo do VIP comprado').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('nota').setDescription('Observação opcional').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão. Precisa de **Gerenciar Servidor**.');
        }

        if (!args.length) {
            return message.reply(
                'Uso: `O.registrar compra @usuário @cargo [nota]`\n' +
                    'Ex: `O.registrar compra @joao @VIP+ pagamento via pix`'
            );
        }

        let tipo = 'compra';
        let rest = [...args];
        if (/^compra$/i.test(rest[0])) {
            tipo = 'compra';
            rest = rest.slice(1);
        }

        const user =
            message.mentions.users.first() ||
            (rest[0] && (await message.client.users.fetch(rest[0]).catch(() => null)));
        const role =
            message.mentions.roles.first() ||
            message.guild.roles.cache.get(rest.find((a) => /^\d{17,20}$/.test(a))) ||
            null;

        if (!user) {
            return message.reply(
                'Informe o **usuário** da compra. Ex: `O.registrar compra @user @cargo`'
            );
        }
        if (!role) {
            return message.reply(
                'Informe o **cargo** da compra. Ex: `O.registrar compra @user @cargo`'
            );
        }

        const nota = rest
            .filter(
                (a) =>
                    !a.includes(user.id) &&
                    !a.includes(role.id) &&
                    !a.startsWith('<@')
            )
            .join(' ')
            .trim();

        const rec = vip.register({
            guildId: message.guild.id,
            userId: user.id,
            vipName: role.name,
            roleId: role.id,
            roleName: role.name,
            type: tipo,
            registeredBy: message.author.id,
            days: 0,
            note: nota
        });

        const roleAssign = await tryAssignRole(message.guild, user.id, role.id);
        await message.reply({
            embeds: [
                buildConfirmEmbed({
                    user,
                    rec,
                    by: message.author,
                    roleAssign
                })
            ]
        });
        await notifyUserPurchase(message.client, user, rec);
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão. Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }

        const tipo = i.options.getString('tipo', true);
        const user = i.options.getUser('usuario', true);
        const role = i.options.getRole('cargo', true);
        const nota = i.options.getString('nota') || '';

        if (tipo !== 'compra') {
            return i.reply({ content: 'Tipo de registro inválido.', flags: 64 });
        }

        const rec = vip.register({
            guildId: i.guild.id,
            userId: user.id,
            vipName: role.name,
            roleId: role.id,
            roleName: role.name,
            type: tipo,
            registeredBy: i.user.id,
            days: 0,
            note: nota
        });

        const roleAssign = await tryAssignRole(i.guild, user.id, role.id);
        await i.reply({
            embeds: [
                buildConfirmEmbed({
                    user,
                    rec,
                    by: i.user,
                    roleAssign
                })
            ]
        });
        await notifyUserPurchase(i.client, user, rec);
    }
};
