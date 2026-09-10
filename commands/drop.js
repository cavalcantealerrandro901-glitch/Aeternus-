const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const drops = require('../utils/drops');
const { getSettings } = require('../utils/settings');
const { schedule } = require('../systems/drops');

function joinRow(dropId, count = 0) {
    const n = Math.max(0, Number(count) || 0);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('drop:join:' + dropId)
            .setLabel(('Participar (' + n + ')').slice(0, 80))
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId('drop:list:' + dropId)
            .setLabel('Participantes')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👥'),
        new ButtonBuilder()
            .setCustomId('drop:leave:' + dropId)
            .setLabel('Sair')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚪')
    );
}

function buildEmbed(drop, guild, authorTag) {
    const endsUnix = Math.floor(drop.endsAt / 1000);
    const total = drops.participantCount(drop);
    const req = drops.getRequirements(guild.id, drop);
    const reqLines = [];
    if (req.minLevel > 0) reqLines.push('• Nível mínimo: **' + req.minLevel + '**');
    if (req.requiredRoleIds && req.requiredRoleIds.length) {
        const names = req.requiredRoleIds
            .map((id) => guild.roles.cache.get(id))
            .filter(Boolean)
            .map((r) => String(r));
        if (names.length) reqLines.push('• Cargo exigido: ' + names.join(', '));
    }

    const panelInfo = drops.formatDropPanelInfo(guild, guild.id);
    const vipBlock = panelInfo.vipLines.length
        ? '\n**VIP · entradas extras**\n' + panelInfo.vipLines.join('\n')
        : '';
    const blockedBlock = panelInfo.blocked.length
        ? '\n**Não pode participar**\n' +
          panelInfo.blocked.map((b) => '• ' + b).join('\n')
        : '';
    const bypassBlock = (panelInfo.bypass || []).length
        ? '\n**Ignora requisitos**\n' +
          panelInfo.bypass.map((b) => '• ' + b).join('\n')
        : '';

    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🎁 DROP EM ANDAMENTO')
        .setDescription(
            [
                '**Prêmio:** ' + (drop.prize && drop.prize.label ? drop.prize.label : '—'),
                '**Vencedores:** ' + (drop.winners || 1),
                '**Termina:** <t:' + endsUnix + ':R> (<t:' + endsUnix + ':f>)',
                '',
                'Clique em **Participar** para entrar.',
                reqLines.length ? '\n**Requisitos**\n' + reqLines.join('\n') : '',
                vipBlock,
                bypassBlock,
                blockedBlock
            ]
                .filter((x) => x != null && x !== '')
                .join('\n')
        )
        .setFooter({ text: 'Por ' + (authorTag || 'staff') + ' · ' + total + ' participante(s)' })
        .setTimestamp(drop.endsAt);
}

async function refreshDropMessage(interaction, drop) {
    const guild = interaction.guild;
    let authorTag = drop.createdByTag || 'staff';
    if (!drop.createdByTag && drop.createdBy) {
        const u = await interaction.client.users.fetch(drop.createdBy).catch(() => null);
        if (u) authorTag = u.tag;
    }
    const embed = buildEmbed(drop, guild, authorTag);
    const count = drops.participantCount(drop);
    await interaction.message
        .edit({ embeds: [embed], components: [joinRow(drop.id, count)] })
        .catch(() => {});
}

module.exports = {
    name: 'drop',
    aliases: ['sorteio', 'giveaway'],
    description: 'Cria um drop/sorteio',
    data: new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Cria um drop')
        .addStringOption((o) =>
            o.setName('premio').setDescription('Prêmio (ex: 10000 eter)').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('tempo').setDescription('Duração (ex: 5m, 1h)').setRequired(false)
        )
        .addIntegerOption((o) =>
            o.setName('vencedores').setDescription('Qtd de vencedores').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!message.member || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const premio = args[0];
        const tempo = args[1] || '5m';
        const winners = Math.max(1, Math.min(20, Number(args[2]) || 1));
        if (!premio) {
            return message.reply('Uso: `O.drop <premio> [tempo] [vencedores]`');
        }
        return createDropMsg(message, { premio: premio, tempo: tempo, winners: winners, isSlash: false });
    },

    async executeSlash(i) {
        if (!i.memberPermissions || !i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({
                content: '❌ Precisa de **Gerenciar Servidor**.',
                flags: MessageFlags.Ephemeral
            });
        }
        await i.deferReply({ flags: MessageFlags.Ephemeral });
        return createDropMsg(i, {
            premio: i.options.getString('premio', true),
            tempo: i.options.getString('tempo') || '5m',
            winners: Math.max(1, Math.min(20, i.options.getInteger('vencedores') || 1)),
            isSlash: true
        });
    },

    async handleComponent(interaction) {
        const parts = (interaction.customId || '').split(':');
        const action = parts[1];
        const dropId = parts.slice(2).join(':');
        if (!action || !dropId) {
            return interaction
                .reply({ content: 'Interação inválida.', flags: MessageFlags.Ephemeral })
                .catch(() => {});
        }

        const drop = drops.getDrop(dropId);
        if (!drop || drop.ended) {
            return interaction
                .reply({
                    content: 'Este drop já encerrou ou não existe mais.',
                    flags: MessageFlags.Ephemeral
                })
                .catch(() => {});
        }

        if (action === 'list') {
            const entries = Object.entries(drop.participants || {});
            if (!entries.length) {
                return interaction.reply({
                    content: 'Ninguém participando ainda.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const lines = entries.slice(0, 30).map(function (pair, i) {
                const id = pair[0];
                const p = pair[1];
                return i + 1 + '. <@' + id + '> · **' + (p.entries || 1) + '** entrada(s)';
            });
            const more =
                entries.length > 30 ? '\n… e mais ' + (entries.length - 30) : '';
            return interaction.reply({
                content:
                    '**Participantes (' + entries.length + ')**\n' + lines.join('\n') + more,
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'leave') {
            const left = drops.leaveDrop(dropId, interaction.user.id);
            if (!left) {
                return interaction.reply({
                    content: 'Você não está neste drop.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const updated = drops.getDrop(dropId);
            await refreshDropMessage(interaction, updated);
            return interaction.reply({
                content: 'Você saiu do drop.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'join') {
            const member = interaction.member;
            if (!member) {
                return interaction.reply({
                    content: 'Não foi possível verificar seu perfil.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (drop.participants && drop.participants[interaction.user.id]) {
                return interaction.reply({
                    content: 'Você já está participando.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const check = drops.checkRequirements(member, drop);
            if (!check.ok) {
                return interaction.reply({
                    content:
                        'Você não atende aos requisitos:\n• ' +
                        (check.fails || []).join('\n• '),
                    flags: MessageFlags.Ephemeral
                });
            }

            const extra = drops.calcExtraEntries(member, drop);
            drops.joinDrop(
                dropId,
                interaction.user.id,
                interaction.user.tag,
                extra.total
            );
            const updated = drops.getDrop(dropId);
            await refreshDropMessage(interaction, updated);

            const detail =
                extra.details && extra.details.length > 0
                    ? '\nBônus: ' + extra.details.join(', ')
                    : '';
            return interaction.reply({
                content:
                    'Você entrou no drop com **' + extra.total + '** entrada(s).' + detail,
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction
            .reply({ content: 'Ação desconhecida.', flags: MessageFlags.Ephemeral })
            .catch(() => {});
    }
};

async function createDropMsg(ctx, opts) {
    const premio = opts.premio;
    const tempo = opts.tempo;
    const winners = opts.winners;
    const isSlash = opts.isSlash;
    const guild = ctx.guild;
    const conf = getSettings(guild.id).drops || {};
    if (conf.enabled === false) {
        const msg = '❌ Drops desativados no painel.';
        if (isSlash) return ctx.editReply({ content: msg });
        return ctx.reply(msg);
    }

    const prize = drops.parsePrize(premio);
    const duration = drops.parseDuration(tempo);
    const endsAt = Date.now() + duration;
    const channel = ctx.channel;
    const author = ctx.user || ctx.author;

    const embed = buildEmbed(
        {
            prize: prize,
            winners: winners,
            endsAt: endsAt,
            participants: {},
            requirements: conf.requirements || {}
        },
        guild,
        author.tag
    );

    const msg = await channel.send({
        embeds: [embed],
        components: [joinRow('pending', 0)]
    });

    const drop = drops.createDrop({
        id: msg.id,
        guildId: guild.id,
        channelId: channel.id,
        messageId: msg.id,
        prize: prize,
        winners: winners,
        endsAt: endsAt,
        ended: false,
        participants: {},
        createdBy: author.id,
        createdByTag: author.tag,
        requirements: conf.requirements || {}
    });

    await msg.edit({ components: [joinRow(drop.id, 0)] }).catch(() => {});
    schedule(ctx.client, drop);

    if (isSlash) {
        return ctx.editReply({ content: '✅ Drop publicado.' }).catch(() => {});
    }
    return null;
}
