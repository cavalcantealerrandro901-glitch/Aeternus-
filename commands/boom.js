const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    SlashCommandBuilder
} = require('discord.js');
const boom = require('../utils/boom');

function canUse(member, cfg) {
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (cfg.staffRoleId && member.roles.cache.has(cfg.staffRoleId)) return true;
    return false;
}

async function ensureInvite(guild, channel) {
    // tenta criar convite no canal do boom; fallback canal do comando
    const target =
        channel && channel.isTextBased?.()
            ? channel
            : guild.systemChannel ||
              guild.channels.cache.find(
                  (c) =>
                      c.type === ChannelType.GuildText &&
                      c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)
              );
    if (!target) throw new Error('Não encontrei um canal para criar o convite.');
    const inv = await target.createInvite({
        maxAge: 0,
        maxUses: 0,
        unique: false,
        reason: 'Boom / Fundo de convites'
    });
    return inv.url;
}

function buildMessage(template, { user, invite, server }) {
    return String(template || '')
        .replace(/\{user\}/gi, String(user))
        .replace(/\{invite\}/gi, String(invite))
        .replace(/\{server\}/gi, String(server))
        .slice(0, 1900);
}

async function runBoom(guild, member, user, replyFn) {
    const cfg = boom.getConfig(guild.id);
    if (!cfg.enabled) {
        return replyFn('❌ O sistema de **boom/fundo** está desativado neste servidor.');
    }
    if (!canUse(member, cfg)) {
        return replyFn('❌ Só staff (ou quem tiver o cargo configurado) pode usar este comando.');
    }
    if (!cfg.channelId) {
        return replyFn(
            '❌ Canal do boom não configurado.\nUse: `O.boom config #canal @cargo-aviso`'
        );
    }

    const left = boom.remainingMs(guild.id);
    if (left > 0) {
        return replyFn(
            `⏳ Boom em cooldown. Disponível em **${boom.formatDuration(left)}**.`
        );
    }

    const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel || !channel.isTextBased?.()) {
        return replyFn('❌ Canal do boom inválido. Reconfigure com `O.boom config`.');
    }

    let inviteUrl;
    try {
        inviteUrl = await ensureInvite(guild, channel);
    } catch (e) {
        return replyFn('❌ Não consegui criar o convite: ' + (e.message || e));
    }

    const text = buildMessage(cfg.message, {
        user: user.toString(),
        invite: inviteUrl,
        server: guild.name
    });

    const embed = new EmbedBuilder()
        .setColor(0xc9a227)
        .setTitle('🚀 Boom / Fundo')
        .setDescription(text)
        .setFooter({ text: 'Cooldownoldown: 2 horas · quando voltar, o cargo será marcado neste canal' })
        .setTimestamp();

    const contentParts = [];
    if (cfg.notifyRoleId) contentParts.push(`<@&${cfg.notifyRoleId}>`);

    await channel.send({
        content: contentParts.length ? contentParts.join(' ') : undefined,
        embeds: [embed]
    });

    boom.markUsed(guild.id, { userId: user.id, inviteUrl });

    return replyFn(
        `✅ Boom enviado em ${channel}.\nConvite: ${inviteUrl}\nPróximo uso em **2 horas**.`
    );
}

async function runConfig(message, args) {
    const member = message.member;
    if (!member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ Precisa de **Gerenciar Servidor** para configurar.');
    }

    const channel =
        message.mentions.channels.first() ||
        (args[1] && message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')));
    const role =
        message.mentions.roles.first() ||
        (args[2] && message.guild.roles.cache.get(args[2].replace(/[<@&>]/g, '')));

    if (!channel) {
        const cfg = boom.getConfig(message.guild.id);
        return message.reply(
            [
                '**Configuração atual do Boom/Fundo**',
                `Canal: ${cfg.channelId ? `<#${cfg.channelId}>` : '_não definido_'}`,
                `Cargo aviso: ${cfg.notifyRoleId ? `<@&${cfg.notifyRoleId}>` : '_não definido_'}`,
                `Cargo staff: ${cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : '_qualquer Manage Server_'}`,
                '',
                'Uso: `O.boom config #canal @cargo-aviso`',
                'Opcional staff: `O.boom staff @cargo`'
            ].join('\n')
        );
    }

    const patch = { channelId: channel.id, enabled: true };
    if (role) patch.notifyRoleId = role.id;
    boom.setConfig(message.guild.id, patch);

    return message.reply(
        `✅ Boom configurado.\nCanal: ${channel}` +
            (role ? `\nCargo de aviso: ${role}` : '') +
            '\nUse `O.boom` ou `O.fundo` para disparar (cooldown 2h).'
    );
}

module.exports = {
    name: 'boom',
    aliases: ['fundo', 'ponto', 'boom-convite'],
    description: 'Dispara boom/fundo de convites no canal configurado (cooldown 2h)',
    data: new SlashCommandBuilder()
        .setName('boom')
        .setDescription('Boom/fundo de convites do servidor')
        .addSubcommand((s) => s.setName('usar').setDescription('Disparar o boom no canal configurado'))
        .addSubcommand((s) =>
            s
                .setName('config')
                .setDescription('Configurar canal e cargo de aviso')
                .addChannelOption((o) =>
                    o.setName('canal').setDescription('Canal do boom').setRequired(true)
                )
                .addRoleOption((o) =>
                    o.setName('cargo').setDescription('Cargo avisado quando o boom ficar pronto')
                )
        )
        .addSubcommand((s) =>
            s
                .setName('staff')
                .setDescription('Cargo que pode usar o boom (além de Manage Server)')
                .addRoleOption((o) =>
                    o.setName('cargo').setDescription('Cargo staff').setRequired(true)
                )
        )
        .addSubcommand((s) => s.setName('status').setDescription('Ver status do cooldown')),

    async execute(message, args) {
        const sub = String(args[0] || '').toLowerCase();

        if (sub === 'config' || sub === 'canal' || sub === 'setup') {
            return runConfig(message, args);
        }

        if (sub === 'staff') {
            if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
                return message.reply('❌ Precisa de **Gerenciar Servidor**.');
            }
            const role = message.mentions.roles.first();
            if (!role) return message.reply('Use: `O.boom staff @cargo`');
            boom.setConfig(message.guild.id, { staffRoleId: role.id });
            return message.reply(`✅ Cargo staff do boom: ${role}`);
        }

        if (sub === 'status' || sub === 'cd' || sub === 'cooldown') {
            const cfg = boom.getConfig(message.guild.id);
            const left = boom.remainingMs(message.guild.id);
            return message.reply(
                left > 0
                    ? `⏳ Boom disponível em **${boom.formatDuration(left)}**.\nCanal: ${cfg.channelId ? `<#${cfg.channelId}>` : '—'}`
                    : `✅ Boom **pronto** para uso.\nCanal: ${cfg.channelId ? `<#${cfg.channelId}>` : '_não configurado_'}`
            );
        }

        if (sub === 'msg' || sub === 'mensagem') {
            if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
                return message.reply('❌ Precisa de **Gerenciar Servidor**.');
            }
            const text = args.slice(1).join(' ').trim();
            if (!text) {
                return message.reply(
                    'Use: `O.boom msg seu texto com {invite} {user} {server}`'
                );
            }
            boom.setConfig(message.guild.id, { message: text.slice(0, 1500) });
            return message.reply('✅ Mensagem do boom atualizada.');
        }

        // disparo padrão
        return runBoom(message.guild, message.member, message.author, (t) => message.reply(t));
    },

    async executeSlash(i) {
        const sub = i.options.getSubcommand();
        if (sub === 'config') {
            if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                return i.reply({ content: '❌ Precisa de **Gerenciar Servidor**.', ephemeral: true });
            }
            const channel = i.options.getChannel('canal');
            const role = i.options.getRole('cargo');
            const patch = { channelId: channel.id, enabled: true };
            if (role) patch.notifyRoleId = role.id;
            boom.setConfig(i.guild.id, patch);
            return i.reply({
                content:
                    `✅ Boom configurado.\nCanal: ${channel}` +
                    (role ? `\nCargo aviso: ${role}` : ''),
                ephemeral: true
            });
        }
        if (sub === 'staff') {
            if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                return i.reply({ content: '❌ Precisa de **Gerenciar Servidor**.', ephemeral: true });
            }
            const role = i.options.getRole('cargo');
            boom.setConfig(i.guild.id, { staffRoleId: role.id });
            return i.reply({ content: `✅ Cargo staff do boom: ${role}`, ephemeral: true });
        }
        if (sub === 'status') {
            const left = boom.remainingMs(i.guild.id);
            return i.reply({
                content:
                    left > 0
                        ? `⏳ Disponível em **${boom.formatDuration(left)}**.`
                        : '✅ Boom **pronto**.',
                ephemeral: true
            });
        }
        // usar
        return runBoom(i.guild, i.member, i.user, (t) => i.reply(t));
    }
};
