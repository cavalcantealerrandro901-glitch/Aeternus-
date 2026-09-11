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

function formatRoles(rec) {
    const ids =
        Array.isArray(rec.roleIds) && rec.roleIds.length
            ? rec.roleIds
            : rec.roleId
              ? [rec.roleId]
              : [];
    if (!ids.length) return '_opcional — não informado_';
    return ids.map((id) => `<@&${id}>`).join(' ');
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
                    formatRoles(rec) !== '_opcional — não informado_'
                        ? `**Cargo(s):** ${formatRoles(rec)}`
                        : '',
                    '',
                    'Confira com **`O.veranotacoes`** ou **`/ver-anotacoes`**.'
                ]
                    .filter(Boolean)
                    .join('\n')
            );
        await user.send({ embeds: [emb] });
    } catch (_) {}
}

async function tryAssignRoles(guild, userId, roleIds) {
    if (!roleIds?.length) return null;
    const results = [];
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return [{ ok: false, reason: 'membro não encontrado' }];
        for (const roleId of roleIds) {
            try {
                const role =
                    guild.roles.cache.get(roleId) ||
                    (await guild.roles.fetch(roleId).catch(() => null));
                if (!role) {
                    results.push({ ok: false, roleId, reason: 'cargo não encontrado' });
                    continue;
                }
                await member.roles.add(role, 'Registro de anotação');
                results.push({ ok: true, roleId });
            } catch (e) {
                results.push({ ok: false, roleId, reason: e?.message || 'falha' });
            }
        }
    } catch (e) {
        return [{ ok: false, reason: e?.message || 'falha' }];
    }
    return results;
}

function buildConfirmEmbed({ user, rec, by, roleResults }) {
    const label = vip.vipLabel(rec);
    const cat = vip.categoryLabel(rec.category);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Anotação registrada')
        .setDescription(`Registro para ${user}`)
        .addFields(
            { name: 'Categoria', value: `**${cat}**`, inline: true },
            { name: 'O que comprou / item', value: `**${label}**`, inline: true },
            { name: 'Cargo(s)', value: formatRoles(rec), inline: true },
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
    if (roleResults?.length) {
        const ok = roleResults.filter((r) => r.ok).length;
        const fail = roleResults.filter((r) => !r.ok);
        let text = `✅ ${ok} cargo(s) adicionado(s)`;
        if (fail.length) {
            text +=
                '\n⚠️ ' +
                fail
                    .map((f) => (f.roleId ? `<@&${f.roleId}>: ${f.reason}` : f.reason))
                    .join(' · ');
        }
        emb.addFields({ name: 'Cargo no membro', value: text, inline: false });
    }
    return emb;
}

const slash = new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registrar anotação (compra, patrimônio, etc.)')
    .addStringOption((o) => {
        o.setName('tipo').setDescription('Categoria do registro').setRequired(true);
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
        o.setName('cargo').setDescription('Cargo 1 (opcional)').setRequired(false)
    )
    .addRoleOption((o) =>
        o.setName('cargo2').setDescription('Cargo 2 (opcional)').setRequired(false)
    )
    .addRoleOption((o) =>
        o.setName('cargo3').setDescription('Cargo 3 (opcional)').setRequired(false)
    )
    .addRoleOption((o) =>
        o.setName('cargo4').setDescription('Cargo 4 (opcional)').setRequired(false)
    )
    .addRoleOption((o) =>
        o.setName('cargo5').setDescription('Cargo 5 (opcional)').setRequired(false)
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
                'Uso: `O.registrar <categoria> @usuário <item> [@cargo ...] [nota]`\n' +
                    `Categorias: ${cats}\n` +
                    'Ex: `O.registrar compra_vip @joao VIP+ @VIP @VIP+`'
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

        const roles = [...message.mentions.roles.values()];

        if (!user) {
            return message.reply(
                'Informe o **usuário**. Ex: `O.registrar compra_vip @user VIP+ @cargo`'
            );
        }

        const tokens = rest.filter(
            (a) =>
                !a.includes(user.id) &&
                !roles.some((r) => a.includes(r.id)) &&
                !a.startsWith('<@') &&
                !a.startsWith('<@&')
        );
        const item = tokens[0];
        if (!item) {
            return message.reply(
                'Informe **o que ele comprou** (item). Ex: `O.registrar compra_vip @user VIP+`'
            );
        }
        const nota = tokens.slice(1).join(' ').trim();
        const roleIds = roles.map((r) => r.id);

        const rec = vip.register({
            guildId: message.guild.id,
            userId: user.id,
            item,
            category,
            roleId: roleIds[0] || null,
            roleIds,
            roleName: roles[0]?.name || null,
            registeredBy: message.author.id,
            days: 0,
            note: nota
        });

        const roleResults = await tryAssignRoles(message.guild, user.id, roleIds);
        await message.reply({
            embeds: [
                buildConfirmEmbed({
                    user,
                    rec,
                    by: message.author,
                    roleResults
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
        const nota = i.options.getString('nota') || '';

        const roleIds = [];
        for (const key of ['cargo', 'cargo2', 'cargo3', 'cargo4', 'cargo5']) {
            const r = i.options.getRole(key);
            if (r) roleIds.push(r.id);
        }
        const unique = [...new Set(roleIds)];

        const rec = vip.register({
            guildId: i.guild.id,
            userId: user.id,
            item,
            category,
            roleId: unique[0] || null,
            roleIds: unique,
            roleName: unique[0]
                ? i.guild.roles.cache.get(unique[0])?.name || null
                : null,
            registeredBy: i.user.id,
            days: 0,
            note: nota
        });

        const roleResults = await tryAssignRoles(i.guild, user.id, unique);
        await i.reply({
            embeds: [
                buildConfirmEmbed({
                    user,
                    rec,
                    by: i.user,
                    roleResults
                })
            ]
        });
        await notifyUserPurchase(i.client, user, rec);
    }
};
