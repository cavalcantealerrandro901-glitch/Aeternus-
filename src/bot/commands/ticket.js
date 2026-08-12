const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gerenciar tickets de suporte')
        .addSubcommand(s => s.setName('fechar').setDescription('Fecha o ticket atual'))
        .addSubcommand(s => s.setName('reivindicar').setDescription('Reivindica o ticket atual')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const channel = interaction.channel;

        if (!channel.topic || !channel.topic.startsWith('ticket-')) {
            return interaction.reply({ content: '⚠️ Este comando só funciona dentro de um ticket.', ephemeral: true });
        }

        const config = db.getGuildConfig(interaction.guild.id);
        const tickets = config.tickets || {};
        const ownerId = channel.topic.replace('ticket-', '').split('|')[0];

        const isOwner = interaction.user.id === ownerId;
        const isStaff =
            interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
            (tickets.supportRole && interaction.member.roles.cache.has(tickets.supportRole));

        if (sub === 'fechar') {
            if (!isOwner && !isStaff) {
                return interaction.reply({ content: 'Você não pode fechar este ticket.', ephemeral: true });
            }
            await interaction.reply('🔒 Ticket será fechado em 5 segundos...');
            setTimeout(async () => {
                try { await channel.delete('Ticket fechado via comando'); } catch {}
            }, 5000);
            return;
        }

        if (sub === 'reivindicar') {
            if (!isStaff) {
                return interaction.reply({ content: 'Apenas a equipe de suporte pode reivindicar.', ephemeral: true });
            }
            if (channel.topic.includes('|claimed:')) {
                const claimedBy = channel.topic.split('|claimed:')[1];
                return interaction.reply({ content: `Já reivindicado por <@${claimedBy}>.`, ephemeral: true });
            }

            await channel.setTopic(`ticket-${ownerId}|claimed:${interaction.user.id}`);
            try {
                await channel.setName(`claimed-${interaction.user.username}`.slice(0, 90).toLowerCase().replace(/[^a-z0-9-]/g, ''));
            } catch {}

            const embed = new EmbedBuilder()
                .setColor(0x22c55e)
                .setDescription(`🙋 Ticket reivindicado por ${interaction.user}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};
