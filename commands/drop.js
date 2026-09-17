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
        const tickets = part && part.entries ? part.entries : 1;
        return p * LIST_PAGE + i + 1 + '. <@' + id + '> · ' + tickets + ' entrada(s)';
    });

    return {
        content: '**Participantes** (' + entries.length + ')\n\n' + lines.join('\n'),
        components: [listNav(drop.id, p, totalPages)],
        flags: MessageFlags.Ephemeral
    };
}

function buildEmbed(drop, guild, authorTag) {
    const conf = getSettings(guild.id).drops || {};
    const req = drop.requirements || conf.requirements || {};
    const ends = drop.endsAt ? Math.floor(drop.endsAt / 1000) : null;
    const count = Object.keys(drop.participants || {}).length;

    const lines = [
        '**Prêmio:** ' + (drop.prize?.label || '—'),
        '**Ganhadores:** ' + (drop.winners || 1),
        '**Participantes:** ' + count,
        ends ? '**Encerra:** <t:' + ends + ':R> (<t:' + ends + ':f>)' : null
    ].filter(Boolean);

    // VIP / extras do painel (não alterar lógica)
    const vipLines = [];
    if (Array.isArray(conf.vipExtras) && conf.vipExtras.length) {
        for (const v of conf.vipExtras) {
            if (!v || !v.roleId) continue;
            vipLines.push(
                '<@&' + v.roleId + '> · +' + (v.entries || 1) + ' entrada(s)'
            );
        }
    }
    if (vipLines.length) {
        lines.push('');
        lines.push('**VIP / entradas extras**');
        lines.push(...vipLines);
    }

    if (req.blockedRoleId || (Array.isArray(req.blockedRoles) && req.blockedRoles.length)) {
        const blocked = req.blockedRoleId
            ? [req.blockedRoleId]
            : req.blockedRoles;
        lines.push('');
        lines.push('**Não pode participar**');
        lines.push(blocked.map((id) => '<@&' + id + '>').join(' · '));
    }

    if (req.bypassRoleId) {
        lines.push('');
        lines.push('**Ignora requisitos:** <@&' + req.bypassRoleId + '>');
    }

    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🎁 Drop')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Por ' + (authorTag || 'staff') })
        .setTimestamp(drop.endsAt ? new Date(drop.endsAt) : undefined);
}

async function refreshDropMessage(interaction, drop) {
    if (!drop) return;
    let authorTag = drop.createdByTag || 'staff';
    if (!drop.createdByTag && drop.createdBy) {
        const u = await interaction.client.users.fetch(drop.createdBy).catch(() => null);
        if (u) authorTag = u.tag;
    }
    const guild = interaction.guild;
    const embed = buildEmbed(drop, guild, authorTag);
    const count = Object.keys(drop.participants || {}).length;
    try {
        await interaction.message.edit({
            embeds: [embed],
            components: [joinRow(drop.id, count)]
        });
    } catch (_) {}
}

/** Máximo de drops criados num único comando */
const MAX_BATCH = 10;

/**
 * Aceita vários drops de uma vez:
 *   O.drop 5m 1 1000 eter | 10m 2 Nitro
 *   O.drop 3x 5m 1 1000 eter
 * Não altera requisitos/cargos do painel.
 */
function parseDropSpecs(args) {
    const raw = (args || []).map((a) => String(a)).join(' ').trim();
    if (!raw) return { ok: false, error: 'usage', specs: [] };

    const parts = raw.split(/\s*[|;]\s*/).map((p) => p.trim()).filter(Boolean);
    const specs = [];

    for (const part of parts) {
        let count = 1;
        let rest = part;
        const mx = part.match(/^(\d{1,2})\s*[xX×]\s+(.+)$/);
        if (mx) {
            count = Math.min(MAX_BATCH, Math.max(1, parseInt(mx[1], 10) || 1));
            rest = mx[2].trim();
        }

        const tokens = rest.split(/\s+/).filter(Boolean);
        if (tokens.length < 3) {
            return { ok: false, error: 'usage', specs: [] };
        }

        const tempo = tokens[0];
        const winners = Math.max(1, Math.min(20, parseInt(tokens[1], 10) || 0));
        const premio = tokens.slice(2).join(' ').trim();
        if (!winners || !premio) {
            return { ok: false, error: 'winners', specs: [] };
        }

        for (let i = 0; i < count; i++) {
            if (specs.length >= MAX_BATCH) break;
            specs.push({ tempo: tempo, winners: winners, premio: premio });
        }
        if (specs.length >= MAX_BATCH) break;
    }

    if (!specs.length) return { ok: false, error: 'usage', specs: [] };
    return { ok: true, specs: specs };
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
        .addIntegerOption((o) =>
            o
                .setName('quantidade')
                .setDescription('Quantos drops iguais criar neste chat (1–10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!message.member || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const prefix = message.guild?.id ? getPrefix(message.guild.id) : 'O.';
        const parsed = parseDropSpecs(args);

        if (!parsed.ok) {
            return message.reply(
                'Uso: `' +
                    prefix +
                    'drop <tempo> <ganhadores> <prêmio>`\n' +
                    'Vários de uma vez: `' +
                    prefix +
                    'drop 5m 1 1000 eter | 10m 2 Nitro`\n' +
                    'Repetir: `' +
                    prefix +
                    'drop 3x 5m 1 1000 eter` (máx. ' +
                    MAX_BATCH +
                    ')'
            );
        }

        let created = 0;
        for (const spec of parsed.specs) {
            await createDropMsg(message, {
                premio: spec.premio,
                tempo: spec.tempo,
                winners: spec.winners,
                isSlash: false,
                silent: true
            });
            created++;
        }

        if (created > 1) {
            return message.reply('✅ **' + created + '** drops publicados neste chat.');
        }
        return null;
    },

    async executeSlash(i) {
        if (!i.memberPermissions || !i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({
                content: '❌ Precisa de **Gerenciar Servidor**.',
                flags: MessageFlags.Ephemeral
            });
        }
        await i.deferReply({ flags: MessageFlags.Ephemeral });

        const tempo = i.options.getString('tempo', true);
        const winners = Math.max(1, Math.min(20, i.options.getInteger('ganhadores', true) || 1));
        const premio = i.options.getString('premio', true);
        const qtd = Math.min(MAX_BATCH, Math.max(1, i.options.getInteger('quantidade') || 1));

        let created = 0;
        for (let n = 0; n < qtd; n++) {
            await createDropMsg(i, {
                tempo: tempo,
                winners: winners,
                premio: premio,
                isSlash: true,
                silent: true
            });
            created++;
        }

        return i.editReply({
            content:
                created > 1
                    ? '✅ **' + created + '** drops publicados neste chat.'
                    : '✅ Drop publicado.'
        }).catch(() => {});
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('drop:')) return;

        const parts = interaction.customId.split(':');
        const action = parts[1];
        const dropId = parts[2];

        if (action === 'listnoop') {
            return interaction.deferUpdate().catch(() => {});
        }

        if (action === 'list') {
            const page = parseInt(parts[3], 10) || 0;
            const drop = drops.getDrop(dropId);
            if (!drop) {
                return interaction.reply({
                    content: 'Drop não encontrado.',
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.reply(buildListPayload(drop, page));
        }

        const drop = drops.getDrop(dropId);
        if (!drop || drop.ended) {
            return interaction.reply({
                content: 'Esse drop já encerrou ou não existe.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'leave') {
            if (!drop.participants || !drop.participants[interaction.user.id]) {
                return interaction.reply({
                    content: 'Você não está nesse drop.',
                    flags: MessageFlags.Ephemeral
                });
            }
            drops.leaveDrop(dropId, interaction.user.id);
            const updated = drops.getDrop(dropId);
            await refreshDropMessage(interaction, updated);
            return interaction.reply({
                content: 'Você saiu do drop.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'join') {
            if (drop.participants && drop.participants[interaction.user.id]) {
                return interaction.reply({
                    content: 'Você já está no drop. Use **Sair** se quiser sair.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const member = interaction.member;
            const check = drops.canJoin(member, drop);
            if (!check.ok) {
                return interaction.reply({
                    content: check.error || 'Você não pode participar.',
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
        if (isSlash && !opts.silent) return ctx.editReply({ content: msg });
        if (!opts.silent) return ctx.reply(msg);
        return null;
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

    if (opts.silent) return drop;

    if (isSlash) {
        return ctx.editReply({ content: '✅ Drop publicado.' }).catch(() => {});
    }
    return drop;
}
