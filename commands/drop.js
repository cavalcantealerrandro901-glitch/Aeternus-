const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const drops = require('../utils/drops');
const { getSettings } = require('../utils/settings');
const { schedule } = require('../systems/drops');

/** Cargo que pode usar autopix */
const AUTOPIX_ROLE_ID = '1506043064723050556';

module.exports = {
    name: 'drop',
    aliases: ['sorteio', 'giveaway', 'sortear'],
    description: 'Cria um drop/sorteio com botões',
    async execute(message, args, client) {
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !message.member.permissions.has(PermissionFlagsBits.ManageEvents) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply({ embeds: [err('Você precisa de **Gerenciar Servidor**.')] });
        }

        if (args.length < 3) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle('🎁 Como usar drops')
                        .setDescription(
                            [
                                '`O.drop <tempo> <vencedores> <prêmio> [req …] [autopix]`',
                                '',
                                '**Tempo:** `30s` `5m` `1h` `2d`',
                                '**Vencedores:** 1–20',
                                '**Prêmio:** texto ou `5000 flocos` / `100 cristais`',
                                '',
                                '**req** (opcional) — requisitos deste drop:',
                                '`req msgs:20 semana:50 nivel:5 cargo:ID`',
                                '',
                                '**autopix** — paga flocos/cristais no fim (só cargo autorizado).',
                                'Sem `autopix` só anuncia os vencedores.',
                                '',
                                'No fim aparece `reroll <id>` para re-sortear.',
                                '',
                                '`O.drop 10m 1 5000 flocos`',
                                '`O.drop 1h 1 200 cristais autopix`',
                                '`O.drop 30m 2 Nitro req msgs:15`'
                            ].join('\n')
                        )
                ]
            });
        }

        // --- flags: autopix + req ---
        const tokens = [...args];
        let wantAutopix = false;
        const autoIdx = tokens.findIndex((t) => /^autopix$/i.test(t));
        if (autoIdx !== -1) {
            wantAutopix = true;
            tokens.splice(autoIdx, 1);
        }

        let reqOverride = null;
        const reqIdx = tokens.findIndex((t) => /^req$/i.test(t));
        if (reqIdx !== -1) {
            const reqText = tokens.splice(reqIdx).slice(1).join(' ');
            reqOverride = drops.parseReqFlags(reqText, message);
        }

        if (wantAutopix) {
            if (!message.member.roles.cache.has(AUTOPIX_ROLE_ID)) {
                return message.reply({
                    embeds: [
                        err(
                            'Você **não tem** o cargo autorizado para usar **autopix**.\nO drop não foi criado. Remova `autopix` ou peça o cargo.'
                        )
                    ]
                });
            }
        }

        const ms = drops.parseDuration(tokens[0]);
        const winners = parseInt(tokens[1], 10);
        const prizeRaw = tokens.slice(2).join(' ');

        if (!ms) return message.reply({ embeds: [err('Tempo inválido. Use `30s`, `5m`, `1h`, `2d`.')] });
        if (!winners || winners < 1 || winners > 20)
            return message.reply({ embeds: [err('Vencedores: **1** a **20**.')] });
        if (!prizeRaw.trim()) return message.reply({ embeds: [err('Informe o prêmio.')] });

        const conf = getSettings(message.guild.id).drops || {};
        if (conf.enabled === false)
            return message.reply({ embeds: [err('Drops desativados no painel.')] });

        const prize = drops.parsePrize(prizeRaw);
        if (wantAutopix && prize.type === 'text') {
            return message.reply({
                embeds: [
                    err(
                        '**autopix** só funciona com prêmio em **flocos** ou **cristais**.\nEx: `O.drop 10m 1 5000 flocos autopix`'
                    )
                ]
            });
        }

        let channel = message.channel;
        if (conf.channelId) {
            const ch = message.guild.channels.cache.get(conf.channelId);
            if (ch?.isTextBased()) channel = ch;
        }

        const endsAt = Date.now() + ms;
        const endsUnix = Math.floor(endsAt / 1000);

        // requisitos: painel + override do comando
        const dropStub = reqOverride ? { requirements: reqOverride } : null;
        const req = drops.getRequirements(message.guild.id, dropStub);

        const reqLines = [];
        if (req.minMessagesDay) reqLines.push(`• ${req.minMessagesDay}+ msgs **hoje**`);
        if (req.minMessagesWeek) reqLines.push(`• ${req.minMessagesWeek}+ msgs **semana**`);
        if (req.minMessagesMonth) reqLines.push(`• ${req.minMessagesMonth}+ msgs **mês**`);
        if (req.minLevel) reqLines.push(`• Nível XP ≥ **${req.minLevel}**`);
        if (req.minInvites) reqLines.push(`• Convites ≥ **${req.minInvites}**`);
        if (req.minFlocos) reqLines.push(`• Flocos ≥ **${req.minFlocos}**`);
        if (req.minCristais) reqLines.push(`• Cristais ≥ **${req.minCristais}**`);
        if (req.requiredRoleIds?.length) reqLines.push(`• Cargo exigido`);

        const embed = new EmbedBuilder()
            .setColor(0xf472b6)
            .setTitle('🎁 DROP EM ANDAMENTO')
            .setDescription(
                [
                    `**Prêmio:** ${prize.label}`,
                    `**Vencedores:** ${winners}`,
                    `**Termina:** <t:${endsUnix}:R> (<t:${endsUnix}:f>)`,
                    wantAutopix
                        ? '**Pagamento:** ⚡ autopix (automático)'
                        : '**Pagamento:** manual (staff entrega)',
                    '',
                    'Clique em **Participar** para entrar.',
                    'Use **Participantes** para ver quem já entrou.',
                    reqLines.length ? `\n**Requisitos**\n${reqLines.join('\n')}` : ''
                ].join('\n')
            )
            .setFooter({ text: `Por ${message.author.tag} · 0 participantes` })
            .setTimestamp(endsAt);

        const tempId = `tmp_${Date.now()}`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`drop:join:${tempId}`)
                .setLabel('Participar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`drop:list:${tempId}`)
                .setLabel('Participantes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👥')
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        const id = `${message.guild.id}_${msg.id}`;
        const rerollId = msg.id; // número que o user copia

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`drop:join:${id}`)
                .setLabel('Participar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`drop:list:${id}`)
                .setLabel('Participantes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👥')
        );
        await msg.edit({ components: [row2] }).catch(() => {});

        const entry = {
            id,
            rerollId,
            guildId: message.guild.id,
            channelId: channel.id,
            messageId: msg.id,
            hostId: message.author.id,
            hostTag: message.author.tag,
            winners,
            prize,
            autopix: !!wantAutopix,
            endsAt,
            createdAt: Date.now(),
            ended: false,
            participants: {},
            requirements: reqOverride || undefined,
            lastWinners: []
        };

        drops.createDrop(entry);
        schedule(client || message.client, entry);

        if (channel.id !== message.channel.id) {
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setDescription(
                            `✅ Drop criado em ${channel}\nReroll ID: \`reroll ${rerollId}\``
                        )
                ]
            });
        } else {
            await message.delete().catch(() => {});
        }
    },

    async handleComponent(interaction) {
        const [, action, dropId] = (interaction.customId || '').split(':');
        if (!dropId) return;

        const drop = drops.getDrop(dropId);
        if (!drop || drop.ended) {
            return interaction.reply({ content: '❌ Este drop já encerrou.', ephemeral: true });
        }

        if (action === 'list') {
            const parts = Object.entries(drop.participants || {});
            if (!parts.length) {
                return interaction.reply({ content: 'Ninguém participou ainda.', ephemeral: true });
            }
            const lines = parts
                .sort((a, b) => (b[1].entries || 1) - (a[1].entries || 1))
                .slice(0, 40)
                .map(([uid, p], i) => `${i + 1}. <@${uid}> — **${p.entries || 1}** entrada(s)`);
            const more = parts.length > 40 ? `\n… +${parts.length - 40}` : '';
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle(`👥 Participantes (${parts.length})`)
                        .setDescription(lines.join('\n') + more)
                        .setFooter({ text: `Tickets: ${drops.totalTickets(drop)}` })
                ],
                ephemeral: true
            });
        }

        if (action === 'join') {
            const member = interaction.member;
            if (!member) {
                return interaction.reply({ content: 'Membro inválido.', ephemeral: true });
            }

            if (drop.participants?.[interaction.user.id]) {
                return interaction.reply({
                    content: `Você já está no drop com **${drop.participants[interaction.user.id].entries}** entrada(s).`,
                    ephemeral: true
                });
            }

            const check = drops.checkRequirements(member, drop);
            if (!check.ok) {
                return interaction.reply({
                    content: '❌ Você **não cumpre** os requisitos:\n• ' + check.fails.join('\n• '),
                    ephemeral: true
                });
            }

            const extras = drops.calcExtraEntries(member, drop);
            drops.joinDrop(dropId, interaction.user.id, interaction.user.tag, extras.total);

            try {
                const fresh = drops.getDrop(dropId);
                const count = drops.participantCount(fresh);
                const emb = EmbedBuilder.from(interaction.message.embeds[0] || {});
                emb.setFooter({
                    text: `Por ${drop.hostTag} · ${count} participante(s) · ${drops.totalTickets(fresh)} tickets`
                });
                await interaction.message.edit({ embeds: [emb] }).catch(() => {});
            } catch (_) {}

            const extraTxt = extras.details.length ? `\nExtras: ${extras.details.join(', ')}` : '';
            return interaction.reply({
                content: `✅ Entrou com **${extras.total}** entrada(s)!${extraTxt}`,
                ephemeral: true
            });
        }
    }
};

function err(t) {
    return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${t}`);
}
