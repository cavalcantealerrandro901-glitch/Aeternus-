const {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    ChannelType
} = require('discord.js');
const rr = require('../utils/reactionRoles');
const COLOR = 0xa78bfa;

function isMod(member) {
    if (!member) return false;
    return (
        member.permissions.has(PermissionFlagsBits.ManageRoles) ||
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.permissions.has(PermissionFlagsBits.ManageGuild)
    );
}

function parseEmoji(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const m = s.match(/^<a?:([\w~]+):(\d+)>$/);
    if (m) return { display: s, store: s, id: m[2], name: m[1] };
    return { display: s, store: s, id: null, name: s };
}

async function buildPanelEmbed(guild, cfg) {
    const lines = [];
    if (!cfg.roles.length) {
        lines.push('Nenhum VIP configurado ainda.');
    } else {
        lines.push('Reaja com o emoji do VIP que deseja receber.\n');
        for (const r of cfg.roles) {
            const role = guild.roles.cache.get(r.roleId);
            lines.push(
                `${r.emoji} → **${r.label || role?.name || 'VIP'}** ${role ? `(${role})` : ''}`
            );
        }
    }
    if (cfg.allowMultiple) {
        lines.push('\n_Você pode escolher mais de um VIP._');
    } else {
        lines.push('\n_Apenas um VIP por vez. Ao escolher outro, o anterior é removido._');
    }

    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Cargos VIP · reação')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Aeternus · reaja para receber o cargo' });
}

async function publishPanel(guild, cfg) {
    if (!cfg.channelId) return { ok: false, error: 'Canal não configurado.' };
    if (!cfg.roles.length) {
        return { ok: false, error: 'Adicione pelo menos um VIP (emoji + cargo).' };
    }

    const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        return { ok: false, error: 'Canal inválido.' };
    }

    const emb = await buildPanelEmbed(guild, cfg);
    let msg = null;

    if (cfg.messageId) {
        msg = await channel.messages.fetch(cfg.messageId).catch(() => null);
    }

    if (msg) {
        await msg.edit({ embeds: [emb] });
        try {
            await msg.reactions.removeAll();
        } catch (_) {}
    } else {
        msg = await channel.send({ embeds: [emb] });
        cfg.messageId = msg.id;
        rr.save(guild.id, cfg);
    }

    for (const r of cfg.roles) {
        try {
            await msg.react(r.emoji);
        } catch (e) {
            console.warn('[cargoreacao] react', r.emoji, e.message);
        }
    }

    return { ok: true, message: msg };
}

module.exports = {
    name: 'cargoreacao',
    aliases: ['reactionrole', 'rrvip', 'vipreacao', 'cargosreacao'],
    description: 'Configurar cargos VIP por reação',
    data: new SlashCommandBuilder()
        .setName('cargo-reacao')
        .setDescription('Configurar cargos VIP por reação')
        .addSubcommand((s) =>
            s
                .setName('canal')
                .setDescription('Definir o canal do painel')
                .addChannelOption((o) =>
                    o
                        .setName('canal')
                        .setDescription('Canal de texto')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
        )
        .addSubcommand((s) =>
            s
                .setName('add')
                .setDescription('Adicionar VIP (cargo + emoji)')
                .addRoleOption((o) =>
                    o.setName('cargo').setDescription('Cargo VIP').setRequired(true)
                )
                .addStringOption((o) =>
                    o.setName('emoji').setDescription('Emoji da reação').setRequired(true)
                )
                .addStringOption((o) =>
                    o.setName('nome').setDescription('Nome exibido (ex: VIP+)').setRequired(false)
                )
        )
        .addSubcommand((s) =>
            s
                .setName('remover')
                .setDescription('Remover um VIP da lista')
                .addStringOption((o) =>
                    o
                        .setName('emoji_ou_cargo')
                        .setDescription('Emoji ou ID do cargo')
                        .setRequired(true)
                )
        )
        .addSubcommand((s) =>
            s
                .setName('multiplos')
                .setDescription('Permitir mais de um VIP ao mesmo tempo')
                .addBooleanOption((o) =>
                    o.setName('ativar').setDescription('true = vários VIPs').setRequired(true)
                )
        )
        .addSubcommand((s) =>
            s.setName('publicar').setDescription('Enviar ou atualizar o painel de reações')
        )
        .addSubcommand((s) => s.setName('lista').setDescription('Ver configuração atual'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão. Precisa de **Gerenciar Cargos**.');
        }
        const sub = (args[0] || 'lista').toLowerCase();
        const guild = message.guild;
        let cfg = rr.get(guild.id);

        if (sub === 'canal') {
            const ch =
                message.mentions.channels.first() || guild.channels.cache.get(args[1]);
            if (!ch || !ch.isTextBased()) {
                return message.reply('Use: `O.cargoreacao canal #canal`');
            }
            cfg.channelId = ch.id;
            cfg.messageId = null;
            rr.save(guild.id, cfg);
            return message.reply(`Canal do painel: ${ch}`);
        }

        if (sub === 'add' || sub === 'adicionar') {
            const rest = args.slice(1);
            let roleObj = message.mentions.roles.first();
            if (!roleObj && rest[0]) roleObj = guild.roles.cache.get(rest[0]);
            if (!roleObj) {
                return message.reply('Uso: `O.cargoreacao add @cargo :emoji: [nome]`');
            }
            const withoutRole = rest.filter(
                (a) => !a.includes(roleObj.id) && !a.startsWith('<@&')
            );
            const emojiRaw2 = withoutRole[0];
            if (!emojiRaw2) {
                return message.reply('Informe o emoji. Ex: `O.cargoreacao add @VIP ⭐ VIP`');
            }
            const em = parseEmoji(emojiRaw2);
            const label = withoutRole.slice(1).join(' ') || roleObj.name;
            cfg = rr.addRole(guild.id, {
                roleId: roleObj.id,
                emoji: em.store,
                label
            });
            return message.reply(
                `Adicionado: ${em.display} → **${label}** (${roleObj})\nUse \`O.cargoreacao publicar\` para atualizar o painel.`
            );
        }

        if (sub === 'remover' || sub === 'remove') {
            const key = args[1];
            if (!key) return message.reply('Uso: `O.cargoreacao remover <emoji|id_cargo>`');
            cfg = rr.removeRole(guild.id, key.replace(/[<@&>]/g, ''));
            return message.reply('Removido da lista. Publique de novo se o painel já existir.');
        }

        if (sub === 'multiplos' || sub === 'multiple') {
            const v = String(args[1] || '').toLowerCase();
            const on = ['on', 'sim', 'true', '1', 'ativar'].includes(v);
            cfg.allowMultiple = on;
            rr.save(guild.id, cfg);
            return message.reply(
                on
                    ? 'Múltiplos VIPs **ativados** — o membro pode ter vários cargos.'
                    : 'Múltiplos VIPs **desativados** — só um cargo por vez.'
            );
        }

        if (sub === 'publicar' || sub === 'enviar' || sub === 'post') {
            const res = await publishPanel(guild, cfg);
            if (!res.ok) return message.reply(res.error);
            return message.reply(`Painel publicado em <#${cfg.channelId}>.`);
        }

        const lines = [
            `**Canal:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'não definido'}`,
            `**Múltiplos:** ${cfg.allowMultiple ? 'sim' : 'não'}`,
            `**Mensagem:** ${cfg.messageId || 'ainda não publicada'}`,
            '',
            '**VIPs:**'
        ];
        if (!cfg.roles.length) lines.push('_nenhum_');
        else {
            for (const r of cfg.roles) {
                lines.push(`${r.emoji} → <@&${r.roleId}> · ${r.label || 'VIP'}`);
            }
        }
        lines.push('', '`O.cargoreacao canal|add|remover|multiplos|publicar`');

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle('Config · cargos por reação')
                    .setDescription(lines.join('\n'))
            ]
        });
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão. Precisa de **Gerenciar Cargos**.',
                flags: 64
            });
        }
        const sub = i.options.getSubcommand();
        const guild = i.guild;
        let cfg = rr.get(guild.id);

        if (sub === 'canal') {
            const ch = i.options.getChannel('canal', true);
            cfg.channelId = ch.id;
            cfg.messageId = null;
            rr.save(guild.id, cfg);
            return i.reply({ content: `Canal do painel: ${ch}`, flags: 64 });
        }

        if (sub === 'add') {
            const role = i.options.getRole('cargo', true);
            const emojiRaw = i.options.getString('emoji', true);
            const label = i.options.getString('nome') || role.name;
            const em = parseEmoji(emojiRaw);
            cfg = rr.addRole(guild.id, {
                roleId: role.id,
                emoji: em.store,
                label
            });
            return i.reply({
                content: `Adicionado: ${em.display} → **${label}** (${role})\nUse \`/cargo-reacao publicar\`.`,
                flags: 64
            });
        }

        if (sub === 'remover') {
            const key = i.options.getString('emoji_ou_cargo', true);
            rr.removeRole(guild.id, key.replace(/[<@&>]/g, ''));
            return i.reply({ content: 'Removido da lista.', flags: 64 });
        }

        if (sub === 'multiplos') {
            const on = i.options.getBoolean('ativar', true);
            cfg.allowMultiple = on;
            rr.save(guild.id, cfg);
            return i.reply({
                content: on
                    ? 'Múltiplos VIPs **ativados**.'
                    : 'Múltiplos VIPs **desativados** (apenas um por vez).',
                flags: 64
            });
        }

        if (sub === 'publicar') {
            await i.deferReply({ flags: 64 });
            cfg = rr.get(guild.id);
            const res = await publishPanel(guild, cfg);
            if (!res.ok) return i.editReply(res.error);
            return i.editReply(`Painel publicado em <#${cfg.channelId}>.`);
        }

        const lines = [
            `**Canal:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'não definido'}`,
            `**Múltiplos:** ${cfg.allowMultiple ? 'sim' : 'não'}`,
            `**Mensagem:** ${cfg.messageId || 'ainda não publicada'}`,
            '',
            '**VIPs:**'
        ];
        if (!cfg.roles.length) lines.push('_nenhum_');
        else {
            for (const r of cfg.roles) {
                lines.push(`${r.emoji} → <@&${r.roleId}> · ${r.label || 'VIP'}`);
            }
        }
        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle('Config · cargos por reação')
                    .setDescription(lines.join('\n'))
            ],
            flags: 64
        });
    }
};
