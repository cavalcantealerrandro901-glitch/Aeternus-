const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const partnerships = require('../utils/partnerships');

function extractInviteCode(raw) {
    const s = String(raw || '').trim();
    const m =
        s.match(/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([a-zA-Z0-9-]+)/i) ||
        s.match(/^([a-zA-Z0-9-]{2,32})$/);
    return m ? m[1] : null;
}

function normalizeInviteUrl(code) {
    return `https://discord.gg/${code}`;
}

async function resolveInvite(client, raw) {
    const code = extractInviteCode(raw);
    if (!code) return { ok: false, error: 'Convite inválido. Use um link `discord.gg/...`.' };
    try {
        const inv = await client.fetchInvite(code);
        const name = inv.guild?.name || inv.channel?.name || null;
        if (!name && !inv.guild) {
            return {
                ok: false,
                error: 'Não consegui confirmar este convite (expirado, inválido ou privado).'
            };
        }
        const url = normalizeInviteUrl(inv.code || code);
        return {
            ok: true,
            code: inv.code || code,
            url,
            serverName: name || `Servidor (${code})`,
            memberCount: inv.memberCount ?? null,
            presenceCount: inv.presenceCount ?? null
        };
    } catch (e) {
        return {
            ok: false,
            error: 'Convite **não encontrado** ou expirado. Confira o link e tente de novo.'
        };
    }
}

module.exports = {
    name: 'fazer-parceria',
    aliases: ['parceria', 'addparceria', 'novaparceria'],
    description: 'Registra uma parceria com um representante',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('fazer-parceria')
        .setDescription('Registra parceria (representante + convite do servidor parceiro)')
        .addUserOption((o) =>
            o
                .setName('representante')
                .setDescription('Membro que representa a parceria neste servidor')
                .setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('convite')
                .setDescription('Link de convite (o bot confirma o nome do servidor)')
                .setRequired(true)
                .setMaxLength(200)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const rep =
            message.mentions.members.first() ||
            (args[0] && (await message.guild.members.fetch(args[0]).catch(() => null)));
        const invite =
            args.find((a) => /discord\.gg\/|discord\.com\/invite\//i.test(a)) ||
            args.find((a) => /^[a-zA-Z0-9-]{2,32}$/.test(a) && !/^\d{17,20}$/.test(a)) ||
            args[1];
        if (!rep || !invite) {
            return message.reply(
                'Uso: `O.fazer-parceria @representante <link-convite>`\n' +
                    '_O bot confirma o nome do servidor pelo convite._'
            );
        }
        return run(message, {
            repUser: rep.user,
            member: rep,
            inviteRaw: String(invite).trim(),
            client: message.client
        });
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({
                content: '❌ Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }
        await i.deferReply();
        const user = i.options.getUser('representante', true);
        const inviteRaw = i.options.getString('convite', true).trim();
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return i.editReply({ content: '❌ Representante não está neste servidor.' });
        }
        return run(i, {
            repUser: user,
            member,
            inviteRaw,
            client: i.client,
            isSlash: true
        });
    }
};

async function run(ctx, { repUser, member, inviteRaw, client, isSlash }) {
    const guild = ctx.guild;
    const conf = partnerships.getConfig(guild.id);
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ Sistema de parcerias desativado no painel.');
    }

    const resolved = await resolveInvite(client, inviteRaw);
    if (!resolved.ok) {
        return reply(ctx, isSlash, `❌ ${resolved.error}`);
    }

    const channelId = conf.channelId || ctx.channel?.id;
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) {
        return reply(
            ctx,
            isSlash,
            '❌ Canal de parcerias inválido. Configure no painel (Parcerias).'
        );
    }

    const name = resolved.serverName;
    const inviteMd = `[Entrar em ${name}](${resolved.url})`;

    const text = partnerships.fill(conf.phrase || partnerships.DEFAULT_PHRASE, {
        rep: `${repUser}`,
        server: name,
        invite: inviteMd,
        host: guild.name
    });

    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🤝 Parceria')
        .setDescription(text)
        .addFields(
            { name: 'Representante', value: `${repUser}`, inline: true },
            { name: 'Servidor', value: name, inline: true },
            { name: 'Convite', value: inviteMd, inline: false }
        )
        .setFooter({ text: `Por ${ctx.user?.tag || ctx.author?.tag || 'staff'}` })
        .setTimestamp();

    if (resolved.memberCount != null) {
        emb.addFields({
            name: 'Membros (convite)',
            value: String(resolved.memberCount),
            inline: true
        });
    }

    if (conf.image && /^https?:\/\//i.test(conf.image)) {
        emb.setImage(conf.image);
    }

    const msg = await ch.send({ embeds: [emb] }).catch(() => null);
    if (!msg) {
        return reply(ctx, isSlash, '❌ Não consegui enviar no canal de parcerias.');
    }

    const entry = partnerships.create(guild.id, {
        repId: repUser.id,
        repTag: repUser.tag,
        inviteUrl: resolved.url,
        serverName: name,
        messageId: msg.id,
        channelId: ch.id,
        roleId: conf.roleId || null,
        createdBy: (ctx.user || ctx.author).id
    });

    let roleGiven = false;
    if (conf.roleId) {
        try {
            const role = await guild.roles.fetch(conf.roleId).catch(() => null);
            if (role && member) {
                await member.roles.add(role, 'Parceria registrada').catch(() => null);
                roleGiven = member.roles.cache.has(role.id) || true;
            }
        } catch (_) {}
    }

    try {
        await repUser.send(
            partnerships.fixedDmPayload({
                host: guild.name,
                server: name,
                invite: inviteMd
            })
        );
    } catch (_) {}

    const ok = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ Parceria registrada')
        .setDescription(
            `**Representante:** ${repUser}\n` +
                `**Servidor confirmado:** **${name}**\n` +
                `**Convite:** ${inviteMd}\n` +
                `**Canal:** ${ch}\n` +
                `**ID:** \`${entry.id}\`\n` +
                (roleGiven && conf.roleId
                    ? `**Cargo:** <@&${conf.roleId}>\n\n`
                    : conf.roleId
                      ? `**Cargo:** configurado, mas não foi possível aplicar.\n\n`
                      : `\n`) +
                `_Se o representante sair do servidor, a parceria e o anúncio são removidos._`
        );

    return reply(ctx, isSlash, { embeds: [ok] });
}

async function reply(ctx, isSlash, content) {
    const payload = typeof content === 'string' ? { content } : content;
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}
