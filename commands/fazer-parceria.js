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

async function postAnywhere(channel, payload, serverName) {
    if (!channel) return { ok: false, error: 'Canal inválido.' };

    if (channel.type === ChannelType.GuildForum) {
        try {
            const thread = await channel.threads.create({
                name: `Parceria · ${(serverName || 'Parceiro').slice(0, 80)}`,
                message: {
                    content: payload.content,
                    embeds: payload.embeds,
                    allowedMentions: payload.allowedMentions
                },
                reason: 'Parceria Aeternus'
            });
            let msg = null;
            try {
                const fetched = await thread.messages.fetch({ limit: 1 });
                msg = fetched.first() || null;
            } catch (_) {}
            return {
                ok: true,
                msg: msg || { id: thread.id, channel: thread },
                channel: thread
            };
        } catch (e) {
            return { ok: false, error: `Fórum: ${e.message}` };
        }
    }

    if (typeof channel.send === 'function') {
        try {
            const msg = await channel.send(payload);
            return { ok: true, msg, channel };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    return {
        ok: false,
        error: 'Este tipo de canal não aceita mensagens de texto.'
    };
}

module.exports = {
    name: 'fazer-parceria',
    aliases: ['parceria', 'addparceria', 'novaparceria'],
    description: 'Registra parceria com texto personalizado (link dentro do texto)',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('fazer-parceria')
        .setDescription('Registra parceria: texto + representante, em qualquer canal')
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
        .addChannelOption((o) =>
            o
                .setName('canal')
                .setDescription('Destino: texto, anúncio, call, fórum… (padrão: canal atual)')
                .setRequired(false)
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

        const channelMention = message.mentions.channels.first() || null;

        let texto = message.content
            .replace(
                /^(?:<@!?\d+>\s*)?(?:O\.)?(?:fazer-parceria|parceria|addparceria|novaparceria)\s*/i,
                ''
            )
            .replace(/<@!?\d+>/g, '')
            .replace(/<#\d+>/g, '')
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
                    '`O.fazer-parceria @representante [#canal]` + texto da parceria\n' +
                    'Ou responda à mensagem do texto com `O.fazer-parceria @representante [#canal]`\n' +
                    '_Canal pode ser texto, call, anúncio ou fórum._'
            );
        }
        return run(message, {
            repUser: rep.user,
            member: rep,
            texto,
            targetChannel: channelMention || message.channel,
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
        const targetChannel = i.options.getChannel('canal') || i.channel;
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return i.editReply({ content: '❌ Representante não está neste servidor.' });
        }
        return run(i, {
            repUser: user,
            member,
            texto,
            targetChannel,
            client: i.client,
            isSlash: true
        });
    }
};

async function run(ctx, { repUser, member, texto, targetChannel, client, isSlash }) {
    const guild = ctx.guild;
    const conf = partnerships.getConfig(guild.id);
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ Sistema de parcerias desativado no painel.');
    }

    const resolved = await resolveInvite(client, texto);
    if (!resolved.ok) {
        return reply(ctx, isSlash, `❌ ${resolved.error}`);
    }

    let ch = targetChannel;
    if (ch && !ch.send && ch.id) {
        ch = await guild.channels.fetch(ch.id).catch(() => ch);
    }
    if (!ch) {
        return reply(ctx, isSlash, '❌ Canal de destino inválido.');
    }

    const name = resolved.serverName;
    const inviteMd = `[Entrar em ${name}](${resolved.url})`;

    // Pings no final: representante + cargo de notificação do painel
    const footerPings = [];
    footerPings.push(`**Rep:** <@${repUser.id}>`);
    if (conf.roleId) {
        footerPings.push(`**Notificação:** <@&${conf.roleId}>`);
    }
    const pingBlock = '\n\n' + footerPings.join(' · ');
    const body = String(texto).trim();
    const maxBody = Math.max(0, 2000 - pingBlock.length);
    const finalContent = body.slice(0, maxBody) + pingBlock;

    const payload = {
        content: finalContent,
        allowedMentions: {
            users: [repUser.id],
            roles: conf.roleId ? [String(conf.roleId)] : [],
            parse: []
        }
    };

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

    const posted = await postAnywhere(ch, payload, name);
    if (!posted.ok) {
        return reply(
            ctx,
            isSlash,
            `❌ Não consegui enviar em ${ch}: ${posted.error || 'erro desconhecido'}`
        );
    }

    const msg = posted.msg;
    const dest = posted.channel || ch;

    const entry = partnerships.create(guild.id, {
        repId: repUser.id,
        repTag: repUser.tag,
        inviteUrl: resolved.url,
        serverName: name,
        messageId: msg?.id || null,
        channelId: dest.id,
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
                `**Canal:** ${dest}\n` +
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
