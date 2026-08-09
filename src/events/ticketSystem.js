const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, channel } = interaction;
        const guildConfig = db.getGuildConfig(guild.id);
        const ticketConfig = guildConfig.tickets || {};

        // 1. ABRIR TICKET
        if (customId === 'btn_open_ticket') {
            if (ticketConfig.enabled === false) {
                return await interaction.reply({
                    content: '🚫 O sistema de atendimento de tickets está **desativado** temporariamente neste servidor.',
                    ephemeral: true
                });
            }

            const ticketName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            
            const existingChannel = guild.channels.cache.find(c => c.name === ticketName);
            if (existingChannel) {
                return await interaction.reply({
                    content: `❌ Você já possui um ticket aberto em ${existingChannel}!`,
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            let ticketCategory = guild.channels.cache.find(
                c => c.type === ChannelType.GuildCategory && c.name.toUpperCase().includes('TICKETS')
            );

            if (!ticketCategory) {
                try {
                    ticketCategory = await guild.channels.create({
                        name: '🎫 TICKETS',
                        type: ChannelType.GuildCategory
                    });
                } catch (e) {
                    console.log('Erro ao criar categoria de tickets:', e.message);
                }
            }

            const supportRoleId = ticketConfig.supportRoleId;
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ];

            if (supportRoleId && guild.roles.cache.has(supportRoleId)) {
                permissionOverwrites.push({
                    id: supportRoleId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                });
            }

            try {
                const ticketChannel = await guild.channels.create({
                    name: ticketName,
                    type: ChannelType.GuildText,
                    parent: ticketCategory ? ticketCategory.id : null,
                    permissionOverwrites: permissionOverwrites
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🎫 Chamado de Suporte Aberto')
                    .setDescription(`Olá ${user}, bem-vindo(a) ao seu ticket!\n\nDescreva em detalhes a sua solicitação. A equipe de atendimento ${supportRoleId ? `<@&${supportRoleId}>` : ''} responderá em breve.`)
                    .setColor('#38bdf8')
                    .setTimestamp();

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_request_close_ticket')
                        .setLabel('🔒 Fechar Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({
                    content: `${user} ${supportRoleId ? `| <@&${supportRoleId}>` : ''}`,
                    embeds: [welcomeEmbed],
                    components: [closeRow]
                });

                await interaction.editReply({
                    content: `✅ Seu ticket foi criado em ${ticketChannel}!`
                });

            } catch (err) {
                console.error('Erro ao criar canal de ticket:', err);
                await interaction.editReply({
                    content: '❌ Falha ao criar o ticket. Verifique se o bot possui permissão de **Gerenciar Canais**.'
                });
            }
        }

        // 2. SOLICITAR FECHAMENTO
        if (customId === 'btn_request_close_ticket') {
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Confirmação de Encerramento')
                .setDescription('Tem certeza de que deseja encerrar e apagar este ticket?')
                .setColor('#ef4444');

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_confirm_close_ticket')
                    .setLabel('✅ Sim, Fechar Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('btn_cancel_close_ticket')
                    .setLabel('✕ Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow]
            });
        }

        // 3. CONFIRMAR E APAGAR
        if (customId === 'btn_confirm_close_ticket') {
            await interaction.reply({
                content: '🔒 O ticket será encerrado e deletado em 5 segundos...'
            });

            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (e) {
                    console.error('Erro ao deletar canal de ticket:', e);
                }
            }, 5000);
        }

        // 4. CANCELAR FECHAMENTO
        if (customId === 'btn_cancel_close_ticket') {
            await interaction.message.delete().catch(() => {});
            await interaction.reply({
                content: '✅ Encerramento do ticket cancelado.',
                ephemeral: true
            });
        }
    }
};
