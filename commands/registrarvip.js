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
        const cat = vip.categoryLabel(rec.category);
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('Registro feito')
            .setDescription(
                [
                    `Seu registro de **${cat}** foi anotado.`,
                    `**Item:** ${label}`,
                    rec.roleId ? `**Cargo:** <@&${rec.roleId}>` : '',
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
    if (!roleId) return null;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return { ok: false, reason: 'membro não encontrado' };
        const role =
            guild.roles.cache.get(roleId) ||
            (await guild.roles.fetch(roleId).catch(() => null));
        if (!role) return { ok: false, reason: 'cargo não encontrado' };
        await member.roles.add(role, 'Registro de anotação');
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: e?.message || 'falha ao adicionar cargo' };
    }
}

function buildConfirmEmbed({ user, rec, by, roleAssign }) {
    const label = vip.vipLabel(rec);
    const cat = vip.categoryLabel(rec.category);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Anotação registrada')
        .setDescription(`Registro para ${user}`)
        .addFields(
            { name: 'Categoria', value: `**${cat}**`, inline: true },
            { name: 'O que comprou / item', value: `**${label}**`, inline: true },
            {
                name: 'Cargo',
                value: rec.roleId ? `<@&${rec.roleId}>` : '_opcional — não informado_',
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

const slash = new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registrar anotação (compra, patrimônio, etc.)')
    .addStringOption((o) => {
        o.setName('tipo')
            .setDescription('Categoria do registro')
            .setRequired(true);
        for (const c of vip.CATEGORIES) {
            o.addChoices({ name: c.name, value: c.value });
        }
        return o;
    })
    .addUserOption((o) =>
        o.setName('usuario').setDescription('Usuário do registro').setRequired(true)
    )
    .addStringOption((o) =>
        o
            .setName('item')
            .setDescription('O que ele comprou / item do registro')
            .setRequired(true)
    )
    .addRoleOption((o) =>
        o.setName('cargo').setDescription('Cargo (opcional)').setRequired(false)
    )
    .addStringOption((o) =>
        o.setName('nota').setDescription('Observação opcional').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

module.exports = {
    name: 'registrarvip',
    aliases: ['registrar', 'regvip', 'addvip', 'setvip', 'anotar'],
    description: 'Registrar anotação de compra, patrimônio, etc.',
    data: slash,

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão. Precisa de **Gerenciar Servidor**.');
        }

        if (!args.length) {
            const cats = vip.CATEGORIES.map((c) => c.value).join(', ');
            return message.reply(
                'Uso: `O.registrar <categoria> @usuário <item> [@cargo] [nota]`\n' +
                    `Categorias: ${cats}\n` +
                    'Ex: `O.registrar compra_vip @joao VIP+ @VIP+ pix`'
            );
        }

        let rest = [...args];
        let category = 'compra_vip';
        const first = String(rest[0] || '').toLowerCase();
        const known = vip.CATEGORIES.find(
            (c) => c.value === first || c.name.toLowerCase() === first
        );
        if (known) {
            category = known.value;
            rest = rest.slice(1);
        }

        const user =
            message.mentions.users.first() ||
            (rest[0] && (await message.client.users.fetch(rest[0]).catch(() => null)));
        const role = message.mentions.roles.first() || null;

        if (!user) {
            return message.reply(
                'Informe o **usuário**. Ex: `O.registrar compra_vip @user VIP+`'
            );
        }

        const tokens = rest.filter(
            (a) =>
                !a.includes(user.id) &&
                !(role && a.includes(role.id)) &&
                !a.startsWith('<@')
        );
        const item = tokens[0];
        if (!item) {
            return message.reply(
                'Informe **o que ele comprou** (item). Ex: `O.registrar compra_vip @user VIP+`'
            );
        }
        const nota = tokens.slice(1).join(' ').trim();

        const rec = vip.register({
            guildId: message.guild.id,
            userId: user.id,
            item,
            category,
            roleId: role?.id || null,
            roleName: role?.name || null,
            registeredBy: message.author.id,
            days: 0,
            note: nota
        });

        const roleAssign = await tryAssignRole(message.guild, user.id, role?.id);
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

        const category = i.options.getString('tipo', true);
        const user = i.options.getUser('usuario', true);
        const item = i.options.getString('item', true);
        const role = i.options.getRole('cargo');
        const nota = i.options.getString('nota') || '';

        const rec = vip.register({
            guildId: i.guild.id,
            userId: user.id,
            item,
            category,
            roleId: role?.id || null,
            roleName: role?.name || null,
            registeredBy: i.user.id,
            days: 0,
            note: nota
        });

        const roleAssign = await tryAssignRole(i.guild, user.id, role?.id);
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
