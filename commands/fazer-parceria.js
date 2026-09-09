const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');
const partnerships = require('../utils/partnerships');

function extractInviteCode(raw) {
    const s = String(raw || '');
    const m =
        s.match(/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([a-zA-Z0-9-]+)/i) ||
        s.match(/\((https?:\/\/discord\.gg\/[a-zA-Z0-9-]+)\)/i);
    if (!m) return null;
    if (m[1] && m[1].includes('discord')) {
        const m2 = m[1].match(/discord\.gg\/([a-zA-Z0-9-]+)/i);
        return m2 ? m2[1] : null;
    }
    return m[1] || null;
}

function normalizeInviteUrl(code) {
    return `https://discord.gg/${code}`;
}

async function resolveInvite(client, textOrUrl) {
    const code = extractInviteCode(textOrUrl);
    if (!code) {
        return {
            ok: false,
            error: 'Não achei um convite `discord.gg/...` dentro do texto. Coloque o link na mensagem da parceria.'
        };
    }
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
            memberCount: inv.memberCount ?? null
        };
    } catch (_) {
        return {
            ok: false,
            error: 'Convite **não encontrado** ou expirado. Confira o link no texto.'
        };
    }
}

function canPost(channel) {
    if (!channel) return false;
    if (typeof channel.isTextBased === 'function' && channel.isTextBased()) return true;
    const okTypes = new Set([
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
        ChannelType.GuildForum
    ]);
    return okTypes.has(channel.type);
}

module.exports = {
    name: 'fazer-parceria',
    aliases: ['parceria', 'addparceria', 'novaparceria'],
    description: 'Registra parceria com texto personalizado (link dentro do texto)',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('fazer-parceria')
        .setDescription('Registra parceria: cole o texto (com o link dentro) + representante')
        .addUserOption((o) =>
            o
                .setName('representante')
                .setDescription('Membro que representa a parceria neste servidor')
                .setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('texto')
                .setDescription('Texto da parceria (formatação + link discord.gg dentro)')
                .setRequired(true)
                .setMaxLength(4000)
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

        let texto = message.content
            .replace(
                /^(?:<@!?\d+>\s*)?(?:O\.)?(?:fazer-parceria|parceria|addparceria|novaparceria)\s*/i,
                ''
            )
            .replace(/<@!?\d+>/g, '')
            .trim();

        if ((!texto || texto.length < 10) && message.reference?.messageId) {
            const ref = await message.channel.messages
                .fetch(message.reference.messageId)
                .catch(() => null);
            if (ref?.content) texto = ref.content.trim();
        }

        if (!rep || !texto) {
            return message.reply(
                'Uso:\n' +
                    '`O.fazer-parceria @representante` + cole o **texto da parceria** (com o link dentro)\n' +
                    'Ou responda à mensagem do texto com `O.fazer-parceria @representante`\n' +
                    '_O bot tira o convite do texto e confirma o servidor._'
            );
        }
        return run(message, {
            repUser: rep.user,
            member: rep,
            texto,
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
        const texto = i.options.getString('texto', true).trim();
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return i.editReply({ content: '❌ Representante não está neste servidor.' });
        }
        return run(i, {
            repUser: user,
            member,
            texto,
            client: i.client,
            isSlash: true
        });
    }
};

async function run(ctx, { repUser, member, texto, client, isSlash }) {
    const guild = ctx.guild;
    const conf = partnerships.getConfig(guild.id);
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ Sistema de parcerias desativado no painel.');
    }

    const resolved = await resolveInvite(client, texto);
    if (!resolved.ok) {
        return reply(ctx, isSlash, `❌ ${resolved.error}`);
    }

    const ch = ctx.channel;
    if (!canPost(ch)) {
        return reply(
            ctx,
            isSlash,
            '❌ Não consigo enviar mensagem neste canal. Use em texto, anúncio ou call com chat.'
        );
    }

    const name = resolved.serverName;
    const inviteMd = `[Entrar em ${name}](${resolved.url})`;

    const payload = { content: texto.slice(0, 2000) };

    if (conf.image && /^https?:\/\//i.test(conf.image)) {
        payload.embeds = [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setImage(conf.image)
                .setFooter({
                    text: `Parceria · ${name} · por ${ctx.user?.tag || ctx.author?.tag || 'staff'}`
                })
        ];
    }

    const msg = await ch.send(payload).catch((e) => {
        console.warn('[parceria] send:', e.message);
        return null;
    });
    if (!msg) {
        return reply(
            ctx,
            isSlash,
            '❌ Não consegui enviar neste canal (permissão ou tipo de canal).'
        );
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
                roleGiven = true;
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
                `**Convite (do texto):** ${inviteMd}\n` +
                `**Canal:** ${ch}\n` +
                `**ID:** \`${entry.id}\`\n` +
                (roleGiven && conf.roleId
                    ? `**Cargo:** <@&${conf.roleId}>\n\n`
                    : conf.roleId
                      ? `**Cargo:** configurado, mas não foi possível aplicar.\n\n`
                      : `\n`) +
                `_Se o representante sair, a parceria e a mensagem são removidas._`
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
