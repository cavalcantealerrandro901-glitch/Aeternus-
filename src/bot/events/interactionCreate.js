const {
    Events,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const db = require('../../database/db');
const { formatAlmas } = require('../utils/economy');
const { RANKS, getRankByXp } = require('../utils/ranks');

async function createTicket(interaction, optionLabel) {
    await interaction.deferReply({ ephemeral: true });

    const config = db.getGuildConfig(interaction.guild?.id || interaction.customId.split(':')[1]);
    const tickets = config.tickets || {};

    if (!tickets.enabled) {
        return interaction.editReply('⚠️ O sistema de tickets está desativado.');
    }

    const guild = interaction.guild;
    if (!guild) return interaction.editReply('Use este botão dentro de um servidor.');

    const existing = guild.channels.cache.find(
        c => c.topic === `ticket-${interaction.user.id}` && c.type === ChannelType.GuildText
    );
    if (existing) {
        return interaction.editReply(`Você já possui um ticket aberto: ${existing}`);
    }

    try {
        const overwrites = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            },
            {
                id: interaction.client.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            }
        ];

        if (tickets.supportRole) {
            overwrites.push({
                id: tickets.supportRole,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            });
        }

        const safeName = interaction.user.username
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 20) || 'user';

        const channel = await guild.channels.create({
            name: `ticket-${safeName}`,
            type: ChannelType.GuildText,
            parent: tickets.category || null,
            topic: `ticket-${interaction.user.id}`,
            permissionOverwrites: overwrites
        });

        const typeLine = optionLabel ? `\n**Categoria:** ${optionLabel}` : '';
        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle('🎫 Ticket aberto')
            .setDescription(
                (tickets.openMessage ||
                    `Olá ${interaction.user}, a equipe de suporte irá atendê-lo em breve.\n\nDescreva seu problema com detalhes.`)
                + typeLine
            )
            .setFooter({ text: `Aberto por ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('aeternus_claim_ticket')
                .setLabel('Reivindicar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🙋'),
            new ButtonBuilder()
                .setCustomId('aeternus_close_ticket')
                .setLabel('Fechar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        const mention = tickets.supportRole ? `<@&${tickets.supportRole}>` : '';
        await channel.send({
            content: `${interaction.user} ${mention}`.trim(),
            embeds: [embed],
            components: [row]
        });

        await interaction.editReply(`✅ Ticket criado: ${channel}`);
    } catch (err) {
        console.error('Erro ao criar ticket:', err);
        await interaction.editReply('⚠️ Não foi possível criar o ticket. Verifique as permissões do bot.');
    }
}

async function claimTicket(interaction) {
    const channel = interaction.channel;
    if (!channel.topic || !channel.topic.startsWith('ticket-')) {
        return interaction.reply({ content: 'Este canal não é um ticket.', ephemeral: true });
    }

    const config = db.getGuildConfig(interaction.guild.id);
    const tickets = config.tickets || {};

    const isStaff =
        interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        (tickets.supportRole && interaction.member.roles.cache.has(tickets.supportRole));

    if (!isStaff) {
        return interaction.reply({ content: 'Apenas a equipe de suporte pode reivindicar.', ephemeral: true });
    }

    if (channel.topic.includes('|claimed:')) {
        const claimedBy = channel.topic.split('|claimed:')[1];
        return interaction.reply({
            content: `Este ticket já foi reivindicado por <@${claimedBy}>.`,
            ephemeral: true
        });
    }

    try {
        const ownerId = channel.topic.replace('ticket-', '').split('|')[0];
        await channel.setTopic(`ticket-${ownerId}|claimed:${interaction.user.id}`);

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setDescription(`🙋 Ticket reivindicado por ${interaction.user}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        try {
            await channel.setName(`claimed-${interaction.user.username}`.slice(0, 90).toLowerCase().replace(/[^a-z0-9-]/g, ''));
        } catch {}
    } catch (err) {
        console.error('Erro ao reivindicar:', err);
        await interaction.reply({ content: 'Erro ao reivindicar o ticket.', ephemeral: true });
    }
}

async function closeTicket(interaction) {
    const channel = interaction.channel;
    if (!channel.topic || !channel.topic.startsWith('ticket-')) {
        return interaction.reply({ content: 'Este canal não é um ticket.', ephemeral: true });
    }

    const config = db.getGuildConfig(interaction.guild.id);
    const tickets = config.tickets || {};
    const ownerId = channel.topic.replace('ticket-', '').split('|')[0];

    const isOwner = interaction.user.id === ownerId;
    const isStaff =
        interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        (tickets.supportRole && interaction.member.roles.cache.has(tickets.supportRole));

    if (!isOwner && !isStaff) {
        return interaction.reply({ content: 'Você não pode fechar este ticket.', ephemeral: true });
    }

    await interaction.reply('🔒 Ticket será fechado em 5 segundos...');
    setTimeout(async () => {
        try {
            await channel.delete('Ticket fechado');
        } catch (err) {
            console.error('Erro ao fechar ticket:', err.message);
        }
    }, 5000);
}

async function handleDailyClaim(interaction) {
    const parts = interaction.customId.split(':');
    const guildId = parts[1] || interaction.guild?.id;
    if (!guildId) {
        return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const dailyCmd = require('../commands/daily');
    const r = await dailyCmd.claimDaily(interaction.user.id, guildId);

    if (r.error) {
        return interaction.editReply({ content: `⚠️ ${r.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('💀 Tributo Coletado!')
        .setDescription(
            `${r.phrase}\n\n` +
            `Você recebeu ${formatAlmas(r.amount, guildId)}\n` +
            (r.bonus > 0 ? `Base: **${r.base.toLocaleString('pt-BR')}** + Bônus sequência: **${r.bonus.toLocaleString('pt-BR')}**\n` : '') +
            `🔥 Sequência: **${r.streak} dia(s)**\n` +
            `Saldo: ${formatAlmas(r.total, guildId)}`
        )
        .setTimestamp();

    // tenta atualizar mensagem original se existir
    try {
        if (interaction.message && interaction.message.editable) {
            await interaction.message.edit({ components: [] }).catch(() => {});
        }
    } catch {}

    await interaction.editReply({ embeds: [embed] });
}

async function handleWork(interaction) {
    const guildId = interaction.customId.split(':')[1] || interaction.guild?.id;
    if (!guildId) {
        return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const workCmd = require('../commands/work');
    const r = await workCmd.doWork(interaction.user.id, guildId);

    if (r.error) {
        return interaction.editReply({ content: `⚠️ ${r.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(r.leveledUp ? 0xf59e0b : 0x22c55e)
        .setTitle(`${r.rank.emoji} Labuta concluída — ${r.rank.name}`)
        .setDescription(
            `${r.donePhrase}\n\n` +
            `Ganhou ${formatAlmas(r.amount, guildId)}\n` +
            `+**${r.gainedXp} XP** (total **${r.workXp}**)\n` +
            (r.leveledUp ? `\n🎉 **Promoção!** Você alcançou **${r.rank.name}**!\n` : '') +
            (r.next
                ? `Próximo cargo: **${r.next.emoji} ${r.next.name}** (${r.next.minXp} XP)`
                : `Você atingiu o cargo máximo: **Divindade**.`)
            + `\n\nSaldo: ${formatAlmas(r.total, guildId)}`
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleWorkRanks(interaction) {
    const lines = RANKS.map(r =>
        `${r.emoji} **${r.name}** — ${r.min.toLocaleString('pt-BR')}–${r.max.toLocaleString('pt-BR')} Almas · ${r.minXp}+ XP`
    ).join('\n');

    let userLine = '';
    if (interaction.guild) {
        const user = await db.getUser(interaction.user.id, interaction.guild.id);
        const rank = getRankByXp(user.workXp || 0);
        userLine = `\n\nSeu cargo: ${rank.emoji} **${rank.name}** (${user.workXp || 0} XP)`;
    }

    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('📋 Cargos do Abismo')
        .setDescription(lines + userLine)
        .setFooter({ text: 'Trabalhe para subir de cargo e ganhar mais Almas' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (err) {
                console.error(err);
                const msg = { content: '⚠️ Erro ao executar este comando.', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
                else await interaction.reply(msg);
            }
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'aeternus_ticket_select') {
            const value = interaction.values[0];
            const config = db.getGuildConfig(interaction.guild.id);
            const options = config.tickets?.options || [];
            const opt = options.find(o => o.id === value);
            await createTicket(interaction, opt?.label || value);
            return;
        }

        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('aeternus_daily_claim')) {
            await handleDailyClaim(interaction);
            return;
        }

        if (interaction.customId.startsWith('aeternus_work:')) {
            await handleWork(interaction);
            return;
        }

        if (interaction.customId === 'aeternus_work_ranks') {
            await handleWorkRanks(interaction);
            return;
        }

        if (interaction.customId.startsWith('aeternus_open_ticket')) {
            let label = null;
            if (interaction.customId.includes(':')) {
                const id = interaction.customId.split(':')[1];
                const config = db.getGuildConfig(interaction.guild.id);
                const opt = (config.tickets?.options || []).find(o => o.id === id);
                label = opt?.label || null;
            }
            await createTicket(interaction, label);
            return;
        }

        if (interaction.customId === 'aeternus_claim_ticket') {
            await claimTicket(interaction);
            return;
        }

        if (interaction.customId === 'aeternus_close_ticket') {
            await closeTicket(interaction);
        }
    }
};
