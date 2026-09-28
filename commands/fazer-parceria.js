const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags
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
        return {
            ok: false,
            error: 'Não foi encontrado um convite `discord.gg/...` válido no texto.'
        };
    }
    try {
        const inv = await client.fetchInvite(code);
        const name = inv.guild?.name || inv.channel?.name || null;
        if (!name && !inv.guild) {
            return {
                ok: false,
                error: 'Não foi possível validar este convite (expirado ou sem permissão).'
            };
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
        return {
            ok: false,
            error: 'Convite **inválido ou expirado**. Verifique o link no texto.'
        };
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
                    embeds: payload.embeds,
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
    aliases: ['fazer-parceria', 'fazerparceria', 'parceria', 'addparceria'],
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
                '❌ **Uso do comando:**\n' +
                    '`O.parceria fazer @representante [#canal] [@cargo]` + texto\n' +
                    '_Também pode responder à mensagem que contém o texto da parceria._'
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
        if (!i.memberPermissions || !i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({
                content: '❌ Requer permissão de **Gerenciar Servidor**.',
                flags: MessageFlags.Ephemeral
            });
        }
        await i.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = i.options.getSubcommand();
        if (sub === 'fazer') {
            const user = i.options.getUser('representante', true);
            const texto = i.options.getString('texto', true).trim();
            const targetChannel = i.options.getChannel('canal') || i.channel;
            const notifyRole = i.options.getRole('notificar');
            const member = await i.guild.members.fetch(user.id).catch(function () { return null; });

            return run(i, {
                repUser: user,
                member: member,
                texto: texto,
                targetChannel: targetChannel,
                client: i.client,
                isSlash: true,
                notifyRoleId: notifyRole ? notifyRole.id : null
            });
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

    const mentionsText = [];
    if (pingRoleId) mentionsText.push('<@&' + pingRoleId + '>');
    mentionsText.push(`${repUser}`);

    const partnerEmbed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`🤝 PARCERIA OFICIAL · ${name.toUpperCase()}`)
        .setDescription(
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
            `${texto}\n\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
        )
        .addFields(
            { name: '👑 Representante', value: `${repUser}`, inline: true },
            { name: '🏰 Servidor', value: `**${name}**`, inline: true },
            { name: '👥 Membros Est.', value: `\`${resolved.memberCount}\``, inline: true }
        )
        .setFooter({
            text: `Aeternus RPG • Parcerias • Staff: ` + ((ctx.user && ctx.user.tag) || (ctx.author && ctx.author.tag) || 'Staff'),
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    if (conf.image && /^https?:\/\//i.test(conf.image)) {
        partnerEmbed.setImage(conf.image);
    }

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(`Entrar em ${name.slice(0, 25)}`)
            .setStyle(ButtonStyle.Link)
            .setURL(resolved.url)
            .setEmoji('🌐')
    );

    const payload = {
        content: mentionsText.join(' '),
        embeds: [partnerEmbed],
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
                await member.roles
                    .add(role, 'Parceria registrada — cargo do representante')
                    .catch(function () { return null; });
                roleGiven = member.roles.cache.has(role.id);
            }
        } catch (_) {}
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle('✦ PARCERIA OFICIAL')
            .setDescription(
                `É com satisfação que anunciamos o **${name}** como novo parceiro oficial do **Aeternus**.\n\n` +
                `Agradecemos pela confiança e esperamos construir uma parceria sólida e duradoura entre nossas comunidades. ♡\n\n` +
                `◇ ───────────────── ◇\n\n` +
                `**INFORMAÇÃO IMPORTANTE**\n\n` +
                `O representante do **${name}** deverá permanecer no servidor durante toda a parceria. Caso saia, a parceria será cancelada imediatamente.`
            )
            .setFooter({
                text: 'Aeternus RPG • Parcerias',
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        const dmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Entrar em ${guild.name}`)
                .setStyle(ButtonStyle.Link)
                .setURL(resolved.url)
                .setEmoji('🏰')
        );

        await repUser.send({ embeds: [dmEmbed], components: [dmRow] });
    } catch (_) {}

    const okEmbed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ Parceria Registrada com Sucesso!')
        .setDescription(`A parceria com **${name}** está ativa e publicada em ${dest}.`)
        .addFields(
            { name: '👤 Representante', value: `${repUser} (\`${repUser.id}\`)`, inline: true },
            { name: '🏰 Servidor', value: `**${name}**`, inline: true },
            { name: '📍 Canal', value: `${dest}`, inline: true },
            { name: '🆔 ID Registro', value: `\`${entry?.id || 'OK'}\``, inline: true },
            { 
                name: '🎭 Cargo Rep. (MongoDB)', 
                value: roleGiven && repRoleId 
                    ? `<@&${repRoleId}> (Atribuído)` 
                    : repRoleId 
                    ? `<@&${repRoleId}> (Erro ao atribuir)` 
                    : '_Não configurado no painel_', 
                inline: true 
            },
            {
                name: '🔔 Cargo Notificação',
                value: pingRoleId ? `<@&${pingRoleId}>` : '_Sem cargo de notificação_',
                inline: true
            }
        )
        .setFooter({ text: 'Aeternus Parcerias' })
        .setTimestamp();

    return reply(ctx, isSlash, { embeds: [okEmbed] });
}

async function reply(ctx, isSlash, content) {
    const payload = typeof content === 'string' ? { content: content } : content;
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}
