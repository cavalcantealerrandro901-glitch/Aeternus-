const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
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
    return 'https://discord.gg/' + code;
}

async function resolveInvite(client, textOrUrl) {
    const code = extractInviteCode(textOrUrl);
    if (!code) {
        return { ok: false, error: 'Não foi encontrado um convite `discord.gg/...` válido no texto.' };
    }
    try {
        const inv = await client.fetchInvite(code);
        const name = inv.guild?.name || inv.channel?.name || null;
        if (!name && !inv.guild) {
            return { ok: false, error: 'Não foi possível validar este convite (expirado ou sem permissão).' };
        }
        const url = normalizeInviteUrl(inv.code || code);
        return {
            ok: true,
            code: inv.code || code,
            url: url,
            serverName: name || 'Servidor (' + code + ')',
            memberCount: inv.memberCount != null ? inv.memberCount : 'N/A'
        };
    } catch (_) {
        return { ok: false, error: 'Convite **inválido ou expirado**. Verifique o link no texto.' };
    }
}

async function postAnywhere(channel, payload, serverName) {
    if (!channel) return { ok: false, error: 'Canal inválido.' };

    if (channel.type === ChannelType.GuildForum) {
        try {
            const thread = await channel.threads.create({
                name: '🤝 Parceria · ' + String(serverName || 'Parceiro').slice(0, 80),
                message: {
                    content: payload.content,
                    embeds: payload.embeds || [],
                    components: payload.components,
                    allowedMentions: payload.allowedMentions
                },
                reason: 'Parceria Aeternus'
            });
            let msg = null;
            try {
                const fetched = await thread.messages.fetch({ limit: 1 });
                msg = fetched.first() || null;
            } catch (_) {}
            return { ok: true, msg: msg, channel: thread };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    if (typeof channel.send !== 'function') {
        return { ok: false, error: 'Este canal não aceita mensagens de texto.' };
    }

    try {
        const msg = await channel.send(payload);
        return { ok: true, msg: msg, channel: channel };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

module.exports = {
    name: 'parceria',
    aliases: ['fazer-parceria', 'fazerparceria', 'addparceria'],
    description: 'Registra uma nova parceria no servidor',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('parceria')
        .setDescription('Gerenciamento de parcerias do servidor')
        .addSubcommand(sub =>
            sub
                .setName('fazer')
                .setDescription('Registra uma nova parceria com um servidor')
                .addUserOption(o =>
                    o.setName('representante')
                        .setDescription('Membro que representa a parceria')
                        .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('texto')
                        .setDescription('Texto da parceria (com link de convite do Discord)')
                        .setRequired(true)
                        .setMaxLength(4000)
                )
                .addChannelOption(o =>
                    o.setName('canal')
                        .setDescription('Canal de destino (padrão: canal atual)')
                        .setRequired(false)
                )
                .addRoleOption(o =>
                    o.setName('notificar')
                        .setDescription('Cargo para mencionar no anúncio (opcional)')
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!message.member || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Requer permissão de **Gerenciar Servidor**.');
        }
        const rep =
            message.mentions.members.first() ||
            (args[0] && (await message.guild.members.fetch(args[0]).catch(function () { return null; })));

        const channelMention = message.mentions.channels.first() || null;
        const roleMention = message.mentions.roles.first() || null;

        let texto = message.content
            .replace(
                /^(?:<@!?\d+>\s*)?(?:O\.)?(?:parceria\s+fazer|fazerparceria|fazer-parceria|parceria|addparceria)\s*/i,
                ''
            )
            .replace(/<@!?\d+>/g, '')
            .replace(/<#\d+>/g, '')
            .replace(/<@&\d+>/g, '')
            .trim();

        if ((!texto || texto.length < 10) && message.reference && message.reference.messageId) {
            const ref = await message.channel.messages
                .fetch(message.reference.messageId)
                .catch(function () { return null; });
            if (ref && ref.content) texto = ref.content.trim();
        }

        if (!rep || !texto) {
            return message.reply(
                '❌ **Uso:** `O.parceria fazer @representante [#canal] [@cargo]` + texto com convite'
            );
        }

        return run(message, {
            repUser: rep.user,
            member: rep,
            texto: texto,
            targetChannel: channelMention || message.channel,
            client: message.client,
            isSlash: false,
            notifyRoleId: roleMention ? roleMention.id : null
        });
    },

    async executeSlash(i) {
        const ephemeral = { ephemeral: true };
        try {
            if (!i.memberPermissions || !i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
                if (i.deferred || i.replied) {
                    return i.editReply({ content: '❌ Requer permissão de **Gerenciar Servidor**.' });
                }
                return i.reply({
                    content: '❌ Requer permissão de **Gerenciar Servidor**.',
                    ...ephemeral
                });
            }

            if (!i.deferred && !i.replied) {
                await i.deferReply(ephemeral);
            }

            const sub = i.options.getSubcommand();
            if (sub === 'fazer') {
                const user = i.options.getUser('representante', true);
                const texto = i.options.getString('texto', true).trim();
                const targetChannel = i.options.getChannel('canal') || i.channel;
                const notifyRole = i.options.getRole('notificar');
                const member = await i.guild.members.fetch(user.id).catch(function () { return null; });

                return await run(i, {
                    repUser: user,
                    member: member,
                    texto: texto,
                    targetChannel: targetChannel,
                    client: i.client,
                    isSlash: true,
                    notifyRoleId: notifyRole ? notifyRole.id : null
                });
            }

            return reply(i, true, '❌ Subcomando desconhecido. Use `/parceria fazer`.');
        } catch (err) {
            try {
                const autoRepair = require('../utils/autoRepair');
                await autoRepair.handleCommandError({
                    cmdName: 'parceria',
                    error: err,
                    context: 'slash /parceria · guild ' + (i.guild?.id || '?') + ' · user ' + (i.user?.id || '?'),
                    interaction: i
                });
            } catch (_) {}
            const msg = '❌ Erro ao registrar parceria: `' + String(err?.message || err).slice(0, 200) + '`';
            try {
                if (i.deferred || i.replied) return await i.editReply({ content: msg });
                return await i.reply({ content: msg, ephemeral: true });
            } catch (_) {}
        }
    }
};

async function run(ctx, opts) {
    const repUser = opts.repUser;
    const member = opts.member;
    const texto = opts.texto;
    const targetChannel = opts.targetChannel;
    const client = opts.client;
    const isSlash = opts.isSlash;
    const notifyRoleId = opts.notifyRoleId;

    const guild = ctx.guild;

    const conf = (await partnerships.getConfig(guild.id)) || {};
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ O sistema de parcerias está desativado nas configurações.');
    }

    const resolved = await resolveInvite(client, texto);
    if (!resolved.ok) {
        return reply(ctx, isSlash, '❌ ' + resolved.error);
    }

    let ch = targetChannel;
    if (ch && !ch.send && ch.id) {
        ch = await guild.channels.fetch(ch.id).catch(function () { return ch; });
    }
    if (!ch) {
        return reply(ctx, isSlash, '❌ Canal de destino inválido.');
    }

    const name = resolved.serverName;

    const repRoleId = conf.roleId || conf.repRoleId || null;
    const pingRoleId = notifyRoleId || conf.notifyRoleId || conf.pingRoleId || null;

    const headerMentions = [];
    if (pingRoleId) headerMentions.push('<@&' + pingRoleId + '>');
    headerMentions.push('' + repUser);

    const messageContent = headerMentions.join(' ') + '\n\n' + texto;

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Entrar em ' + name.slice(0, 25))
            .setStyle(ButtonStyle.Link)
            .setURL(resolved.url)
            .setEmoji('🌐')
    );

    const payload = {
        content: messageContent,
        components: [mainRow],
        allowedMentions: {
            users: [repUser.id],
            roles: pingRoleId ? [String(pingRoleId)] : [],
            parse: []
        }
    };

    const posted = await postAnywhere(ch, payload, name);
    if (!posted.ok) {
        return reply(
            ctx,
            isSlash,
            '❌ Não foi possível enviar no canal ' + ch + ': ' + (posted.error || 'erro desconhecido')
        );
    }

    const msg = posted.msg;
    const dest = posted.channel || ch;

    const entry = await partnerships.create(guild.id, {
        repId: repUser.id,
        repTag: repUser.tag,
        inviteUrl: resolved.url,
        serverName: name,
        messageId: msg && msg.id ? msg.id : null,
        channelId: dest.id,
        roleId: repRoleId,
        notifyRoleId: pingRoleId,
        createdBy: (ctx.user || ctx.author).id
    });

    let roleGiven = false;
    if (repRoleId && member) {
        try {
            const role = await guild.roles.fetch(repRoleId).catch(function () { return null; });
            if (role) {
                await member.roles.add(role, 'Parceria registrada').catch(function () { return null; });
                roleGiven = member.roles.cache.has(role.id);
            }
        } catch (_) {}
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle('✦ PARCERIA OFICIAL')
            .setDescription(
                'É com satisfação que anunciamos o **' + name + '** como novo parceiro oficial do **' + guild.name + '**.\n\n' +
                'O representante deverá permanecer no servidor durante toda a parceria. Caso saia, a parceria será cancelada.'
            )
            .setFooter({ text: 'Aeternus · Parcerias', iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        await repUser.send({ embeds: [dmEmbed] });
    } catch (_) {}

    const okEmbed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ Parceria Registrada')
        .setDescription('Parceria com **' + name + '** publicada em ' + dest + '.')
        .addFields(
            { name: 'Representante', value: '' + repUser + ' (`' + repUser.id + '`)', inline: true },
            { name: 'Servidor', value: '**' + name + '**', inline: true },
            { name: 'Canal', value: '' + dest, inline: true },
            { name: 'ID', value: '`' + (entry?.id || 'OK') + '`', inline: true },
            {
                name: 'Cargo Rep.',
                value: roleGiven && repRoleId
                    ? '<@&' + repRoleId + '> (ok)'
                    : repRoleId
                    ? '<@&' + repRoleId + '> (falhou)'
                    : '_Não configurado_',
                inline: true
            }
        )
        .setTimestamp();

    return reply(ctx, isSlash, { embeds: [okEmbed] });
}

async function reply(ctx, isSlash, content) {
    const payload = typeof content === 'string' ? { content: content } : content;
    if (isSlash) {
        try {
            if (ctx.deferred || ctx.replied) return await ctx.editReply(payload);
            return await ctx.reply({ ...payload, ephemeral: true });
        } catch (e) {
            try {
                return await ctx.followUp({ ...payload, ephemeral: true });
            } catch (_) {
                console.error('[parceria] reply falhou:', e?.message || e);
            }
        }
        return null;
    }
    return ctx.reply(payload);
}
