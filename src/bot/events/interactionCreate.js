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

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Slash commands
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

        if (!interaction.isButton()) return;

        // ===== ABRIR TICKET =====
        if (interaction.customId === 'aeternus_open_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const config = db.getGuildConfig(interaction.guild.id);
            const tickets = config.tickets || {};

            if (!tickets.enabled) {
                return interaction.editReply('⚠️ O sistema de tickets está desativado.');
            }

            // Já tem ticket aberto?
            const existing = interaction.guild.channels.cache.find(
                c => c.topic === `ticket-${interaction.user.id}` && c.type === ChannelType.GuildText
            );
            if (existing) {
                return interaction.editReply(`Você já possui um ticket aberto: ${existing}`);
            }

            try {
                const overwrites = [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
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
                            PermissionFlagsBits.ManageChannels
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

                const channel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`.slice(0, 90).toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    type: ChannelType.GuildText,
                    parent: tickets.category || null,
                    topic: `ticket-${interaction.user.id}`,
                    permissionOverwrites: overwrites
                });

                const embed = new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setTitle('🎫 Ticket aberto')
                    .setDescription(
                        tickets.openMessage ||
                        `Olá ${interaction.user}, a equipe de suporte irá atendê-lo em breve.\n\nDescreva seu problema com o máximo de detalhes.`
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
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
            return;
        }

        // ===== FECHAR TICKET =====
        if (interaction.customId === 'aeternus_close_ticket') {
            const channel = interaction.channel;
            if (!channel.topic || !channel.topic.startsWith('ticket-')) {
                return interaction.reply({ content: 'Este canal não é um ticket.', ephemeral: true });
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
    }
};
