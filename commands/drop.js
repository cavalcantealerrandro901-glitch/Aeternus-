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
const { getSettings, getPrefix } = require('../utils/settings');
const { schedule } = require('../systems/drops');

const LIST_PAGE = 10;

/** Participar + Sair na mesma linha; Participantes ao lado */
function joinRow(dropId, count = 0) {
    const n = Math.max(0, Number(count) || 0);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('drop:join:' + dropId)
            .setLabel(('Participar (' + n + ')').slice(0, 80))
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId('drop:leave:' + dropId)
            .setLabel('Sair')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚪'),
        new ButtonBuilder()
            .setCustomId('drop:list:' + dropId + ':0')
            .setLabel('Participantes')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👥')
    );
}

function listNav(dropId, page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('drop:list:' + dropId + ':' + Math.max(0, page - 1))
            .setLabel('Voltar')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId('drop:listnoop')
            .setLabel(page + 1 + '/' + totalPages)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('drop:list:' + dropId + ':' + (page + 1))
            .setLabel('Próximo')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

function buildListPayload(drop, page) {
    const entries = Object.entries(drop.participants || {});
    const totalPages = Math.max(1, Math.ceil(entries.length / LIST_PAGE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const slice = entries.slice(p * LIST_PAGE, p * LIST_PAGE + LIST_PAGE);

    if (!entries.length) {
        return {
            content: 'Ninguém participando ainda.',
            components: [],
            flags: MessageFlags.Ephemeral
        };
    }

    const lines = slice.map(function (pair, i) {
        const id = pair[0];
        const part = pair[1];
        const n = p * LIST_PAGE + i + 1;
        return n + '. <@' + id + '> · **' + (part.entries || 1) + '** entrada(s)';
    });

    return {
        content: '**Participantes (' + entries.length + ')**\n' + lines.join('\n'),
        components: [listNav(drop.id, p, totalPages)],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
    };
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
                'Clique em **Participar** para entrar ou **Sair** para desistir.',
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
    usage: '<tempo> <ganhadores> <prêmio>',
    data: new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Cria um drop')
        .addStringOption((o) =>
            o.setName('tempo').setDescription('Duração (ex: 30s, 5m, 1h, 1d)').setRequired(true)
        )
        .addIntegerOption((o) =>
            o
                .setName('ganhadores')
                .setDescription('Quantidade de ganhadores')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(20)
        )
        .addStringOption((o) =>
            o
                .setName('premio')
                .setDescription('Prêmio (ex: 10000 eter | Nitro 1 mês)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!message.member || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const prefix = message.guild?.id ? getPrefix(message.guild.id) : 'O.';
        const tempo = args[0];
        const winnersRaw = args[1];
        const premio = args.slice(2).join(' ').trim();

        if (!tempo || !winnersRaw || !premio) {
            return message.reply(
                'Uso: `' + prefix + 'drop <tempo> <ganhadores> <prêmio>`\n' +
                    'Ex.: `' + prefix + 'drop 5m 1 10000 eter` · `' + prefix + 'drop 1h 3 Nitro 1 mês`'
            );
        }

        const winners = Math.max(1, Math.min(20, parseInt(winnersRaw, 10) || 0));
        if (!winners) {
            return message.reply('❌ Quantidade de ganhadores inválida (1–20).');
        }

        return createDropMsg(message, {
            premio,
            tempo,
            winners,
            isSlash: false
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
        return createDropMsg(i, {
            tempo: i.options.getString('tempo', true),
            winners: Math.max(1, Math.min(20, i.options.getInteger('ganhadores', true) || 1)),
            premio: i.options.getString('premio', true),
            isSlash: true
        });
    },

    async handleComponent(interaction) {
        const parts = (interaction.customId || '').split(':');
        const action = parts[1];

        if (action === 'listnoop') {
            return interaction.deferUpdate().catch(() => {});
        }

        // drop:list:dropId:page
        if (action === 'list') {
            const dropId = parts[2];
            const page = parseInt(parts[3], 10) || 0;
            const drop = drops.getDrop(dropId);
            if (!drop || drop.ended) {
                return interaction
                    .reply({
                        content: 'Este drop já encerrou ou não existe mais.',
                        flags: MessageFlags.Ephemeral
                    })
                    .catch(() => {});
            }
            const payload = buildListPayload(drop, page);
            if (interaction.replied || interaction.deferred) {
                return interaction.editReply(payload).catch(() => interaction.followUp(payload));
            }
            // se já é update de botão de paginação na mesma msg efêmera
            if (interaction.message && interaction.message.flags?.has?.(MessageFlags.Ephemeral)) {
                return interaction.update(payload).catch(() => interaction.reply(payload));
            }
            return interaction.reply(payload).catch(() => {});
        }

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
                    content: 'Você já está participando. Use **Sair** para desistir.',
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
