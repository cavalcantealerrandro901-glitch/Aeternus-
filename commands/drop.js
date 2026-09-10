const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
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
            .setEmoji('👥')
    );
}

module.exports = {
    name: 'drop',
    aliases: ['sorteio', 'giveaway'],
    description: 'Cria um drop/sorteio',
    category: 'economia',
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
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const premio = args[0];
        const tempo = args[1] || '5m';
        const winners = Math.max(1, Math.min(20, Number(args[2]) || 1));
        if (!premio) {
            return message.reply('Uso: `O.drop <premio> [tempo] [vencedores]`');
        }
        return run(message, { premio, tempo, winners, isSlash: false });
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({ content: '❌ Precisa de **Gerenciar Servidor**.', flags: 64 });
        }
        await i.deferReply();
        return run(i, {
            premio: i.options.getString('premio', true),
            tempo: i.options.getString('tempo') || '5m',
            winners: Math.max(1, Math.min(20, i.options.getInteger('vencedores') || 1)),
            isSlash: true
        });
    }
};

async function run(ctx, { premio, tempo, winners, isSlash }) {
    const guild = ctx.guild;
    const conf = getSettings(guild.id).drops || {};
    if (conf.enabled === false) {
        return reply(ctx, isSlash, '❌ Drops desativados no painel.');
    }

    const prize = drops.parsePrize(premio);
    const duration = drops.parseDuration(tempo);
    const endsAt = Date.now() + duration;
    const endsUnix = Math.floor(endsAt / 1000);
    const channel = ctx.channel;

    const req = drops.getRequirements(guild.id, null);
    const reqLines = [];
    if (req.minLevel > 0) reqLines.push('• Nível mínimo: **' + req.minLevel + '**');
    if (req.requiredRoleIds?.length) {
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

    const authorTag = ctx.user?.tag || ctx.author?.tag || 'staff';
    const embed = new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('🎁 DROP EM ANDAMENTO')
        .setDescription(
            [
                '**Prêmio:** ' + prize.label,
                '**Vencedores:** ' + winners,
                '**Termina:** <t:' + endsUnix + ':R> (<t:' + endsUnix + ':f>)',
                '',
                'Clique em **Participar** para entrar.',
                reqLines.length ? '\n**Requisitos**\n' + reqLines.join('\n') : '',
                vipBlock,
                bypassBlock,
                blockedBlock
            ].join('\n')
        )
        .setFooter({ text: 'Por ' + authorTag + ' · 0 participantes' })
        .setTimestamp(endsAt);

    const tempId = 'tmp_' + Date.now();
    const msg = await channel.send({
        embeds: [embed],
        components: [joinRow(tempId, 0)]
    });

    const drop = drops.createDrop({
        id: msg.id,
        guildId: guild.id,
        channelId: channel.id,
        messageId: msg.id,
        prize,
        winners,
        endsAt,
        ended: false,
        participants: {},
        createdBy: (ctx.user || ctx.author).id,
        requirements: conf.requirements || {}
    });

    await msg.edit({ components: [joinRow(drop.id, 0)] }).catch(() => {});
    schedule(ctx.client, drop);

    return reply(ctx, isSlash, '✅ Drop criado em ' + channel.toString());
}

async function reply(ctx, isSlash, content) {
    const payload = typeof content === 'string' ? { content } : content;
    if (isSlash) {
        if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
        return ctx.reply(payload);
    }
    return ctx.reply(payload);
}
