const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
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
            url: url,
            serverName: name || 'Servidor (' + code + ')',
            memberCount: inv.memberCount != null ? inv.memberCount : null
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
                name: 'Parceria · ' + String(serverName || 'Parceiro').slice(0, 80),
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
    name: 'fazer-parceria',
    aliases: ['parceria', 'addparceria', 'novaparceria'],
    description: 'Registra parceria com texto personalizado (link dentro do texto)',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('fazer-parceria')
        .setDescription('Registra parceria: texto + representante, em qualquer canal')
        .addUserOption(function (o) {
            return o
                .setName('representante')
                .setDescription('Membro que representa a parceria neste servidor')
                .setRequired(true);
        })
        .addStringOption(function (o) {
            return o
                .setName('texto')
                .setDescription('Texto da parceria (formatação + link discord.gg dentro)')
                .setRequired(true)
                .setMaxLength(4000);
        })
        .addChannelOption(function (o) {
            return o
                .setName('canal')
                .setDescription('Destino: texto, anúncio, call, fórum… (padrão: canal atual)')
                .setRequired(false);
        })
        .addRoleOption(function (o) {
            return o
                .setName('notificar')
                .setDescription('Cargo para notificar no anúncio (opcional)')
                .setRequired(false);
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!message.member || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const rep =
            message.mentions.members.first() ||
            (args[0] && (await message.guild.members.fetch(args[0]).catch(function () { return null; })));

        const channelMention = message.mentions.channels.first() || null;
        const roleMention = message.mentions.roles.first() || null;

        let texto = message.content
            .replace(
                /^(?:<@!?\d+>\s*)?(?:O\.)?(?:fazer-parceria|parceria|addparceria|novaparceria)\s*/i,
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
                'Uso:\n' +
                    '`O.fazer-parceria @representante [#canal] [@cargo-notificar]` + texto\n' +
                    'Ou responda à mensagem do texto com o comando.\n' +
                    '_Canal e cargo de notificação são opcionais._'
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
                content: '❌ Precisa de **Gerenciar Servidor**.',
                flags: MessageFlags.Ephemeral
            });
        }
        await i.deferReply({ flags: MessageFlags.Ephemeral });
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
    const conf = partnerships.getConfig(guild.id);
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ Sistema de parcerias desativado no painel.');
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
    const inviteMd = '[Entrar em ' + name + '](' + resolved.url + ')';

    const repRoleId = conf.roleId || null;
    const pingRoleId = notifyRoleId || conf.notifyRoleId || null;

    const footerPings = [];
    footerPings.push('**Rep:** <@' + repUser.id + '>');
    if (pingRoleId) {
        footerPings.push('**Notificação:** <@&' + pingRoleId + '>');
    }
    const pingBlock = '\n\n' + footerPings.join(' · ');
    const body = String(texto).trim();
    const maxBody = Math.max(0, 2000 - pingBlock.length);
    const finalContent = body.slice(0, maxBody) + pingBlock;

    const payload = {
        content: finalContent,
        allowedMentions: {
            users: [repUser.id],
            roles: pingRoleId ? [String(pingRoleId)] : [],
            parse: []
        }
    };

    if (conf.image && /^https?:\/\//i.test(conf.image)) {
        payload.embeds = [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setImage(conf.image)
                .setFooter({
                    text:
                        'Parceria · ' +
                        name +
                        ' · por ' +
                        ((ctx.user && ctx.user.tag) || (ctx.author && ctx.author.tag) || 'staff')
                })
        ];
    }

    const posted = await postAnywhere(ch, payload, name);
    if (!posted.ok) {
        return reply(
            ctx,
            isSlash,
            '❌ Não consegui enviar em ' + ch + ': ' + (posted.error || 'erro desconhecido')
        );
    }

    const msg = posted.msg;
    const dest = posted.channel || ch;

    const entry = partnerships.create(guild.id, {
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
            '**Representante:** ' +
                repUser +
                '\n' +
                '**Servidor confirmado:** **' +
                name +
                '**\n' +
                '**Convite (do texto):** ' +
                inviteMd +
                '\n' +
                '**Canal:** ' +
                dest +
                '\n' +
                '**ID:** `' +
                entry.id +
                '`\n' +
                (roleGiven && repRoleId
                    ? '**Cargo do representante:** <@&' + repRoleId + '>\n'
                    : repRoleId
                      ? '**Cargo do representante:** configurado, mas não foi possível aplicar.\n'
                      : '') +
                (pingRoleId ? '**Notificação:** <@&' + pingRoleId + '>\n' : '') +
                '\n_Se o representante sair, a parceria e a mensagem são removidas._'
        );

    return reply(ctx, isSlash, { embeds: [ok] });
}

async function reply(ctx, isSlash, content) {
    const payload = typeof content === 'string' ? { content: content } : content;
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}
